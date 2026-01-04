const express = require('express');
// Import User model and other database models
const { User } = require('./database');
const { Payment, UserLoyalty, MenuItems, Order, OrderItems } = require('../config/database_queries');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Client, Environment, OrdersController, PaymentsController, LogLevel, ApiError } = require('@paypal/paypal-server-sdk');
const path = require('path');
const nanoID = require('nanoid');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// Paypal configuration
const client = new Client({
    clientCredentialsAuthCredentials: {
        oAuthClientId: PAYPAL_CLIENT_ID,
        oAuthClientSecret: PAYPAL_CLIENT_SECRET,
    },
    timeout: 0,
    environment: Environment.Sandbox,
    logging: {
        logLevel: LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logHeaders: true },
    },
});

const ordersController = new OrdersController(client);
const paymentsController = new PaymentsController(client);


const isRetryableError = (error) => {
    if (!error.statusCode) return false;
    return error.statusCode >= 500 || error.statusCode === 429;
};

// Helper function to wait with exponential backoff
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const createOrder = async (cart, currency = "USD", amount = "0.00", maxRetries = 3) => {
    // PayPal sandbox works best with USD
    const paypalCurrency = "USD";
    
    // Calculate total and map items
    let total = 0;
    let items = [];
    if (Array.isArray(cart) && cart.length > 0) {
        items = cart.map((item, index) => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity) || 1;
            total += price * quantity;
            return {
                name: item.name || `Item ${index + 1}`,
                unitAmount: {
                    currencyCode: paypalCurrency,
                    value: price.toFixed(2),
                },
                quantity: quantity.toString(),
                description: item.description || "",
                sku: item.sku || `sku${index + 1}`,
            };
        });
    }
    // Use calculated total from items to ensure consistency
    const orderAmount = total > 0 ? total : parseFloat(amount);
    
    // Ensure item total exactly matches sum of individual items
    const itemTotalCalculated = items.reduce((sum, item) => {
        return sum + (parseFloat(item.unitAmount.value) * parseInt(item.quantity));
    }, 0);
    
    const finalAmount = itemTotalCalculated > 0 ? itemTotalCalculated : orderAmount;
    
    const collect = {
        body: {
            intent: "CAPTURE",
            purchaseUnits: [
                {
                    amount: {
                        currencyCode: paypalCurrency,
                        value: finalAmount.toFixed(2),
                        breakdown: {
                            itemTotal: {
                                currencyCode: paypalCurrency,
                                value: finalAmount.toFixed(2),
                            },
                        },
                    },
                    items: items.length > 0 ? items : [{
                        name: "Order Total",
                        unitAmount: {
                            currencyCode: paypalCurrency,
                            value: finalAmount.toFixed(2),
                        },
                        quantity: "1",
                        description: "Total order amount",
                        sku: "total01",
                    }],
                },
            ],
        },
        prefer: "return=minimal",
    };

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const { body, ...httpResponse } = await ordersController.createOrder(
                collect
            );
            return {
                jsonResponse: JSON.parse(body),
                httpStatusCode: httpResponse.statusCode,
            };
        } catch (error) {
            lastError = error;
            console.error(`PayPal createOrder attempt ${attempt + 1} failed:`, {
                statusCode: error.statusCode,
                message: error.message,
                debugId: error.headers?.['paypal-debug-id'] || 'N/A'
            });
            
            // If this is the last attempt or error is not retryable, don't retry
            if (attempt === maxRetries || !isRetryableError(error)) {
                break;
            }
            
            // Calculate delay with exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Retrying PayPal createOrder in ${delay}ms...`);
            await wait(delay);
        }
    }

    // All retries failed, throw the last error
    console.error('PayPal createOrder failed after all retries:', lastError);
    if (lastError instanceof ApiError) {
        const errorMessage = lastError.statusCode === 503 
            ? 'PayPal service is temporarily unavailable. Please try again in a few minutes.'
            : `PayPal API Error: ${lastError.message}`;
        throw new Error(errorMessage);
    }
    throw new Error(`Unknown PayPal error: ${lastError.message || lastError}`);
};

const captureOrder = async (orderID, maxRetries = 3) => {
    const collect = {
        id: orderID,
        prefer: "return=minimal",
    };

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const { body, ...httpResponse } = await ordersController.captureOrder(
                collect
            );
            return {
                jsonResponse: JSON.parse(body),
                httpStatusCode: httpResponse.statusCode,
            };
        } catch (error) {
            lastError = error;
            console.error(`PayPal captureOrder attempt ${attempt + 1} failed:`, {
                statusCode: error.statusCode,
                message: error.message,
                debugId: error.headers?.['paypal-debug-id'] || 'N/A'
            });
            
            // If this is the last attempt or error is not retryable, don't retry
            if (attempt === maxRetries || !isRetryableError(error)) {
                break;
            }
            
            // Calculate delay with exponential backoff
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Retrying PayPal captureOrder in ${delay}ms...`);
            await wait(delay);
        }
    }

    // All retries failed
    if (lastError instanceof ApiError) {
        const errorMessage = lastError.statusCode === 503 
            ? 'PayPal service is temporarily unavailable. Please try again in a few minutes.'
            : `PayPal API Error: ${lastError.message}`;
        throw new Error(errorMessage);
    }
    throw new Error(`Unknown PayPal error: ${lastError.message || lastError}`);
};

// api/orders
router.get('/test', (req, res) => {
  res.send('Test route working!');
});

// Route to get current logged-in user
router.get('/current_user', (req, res) => {
    if (req.session && req.session.user) {
  //      userId = req.session.user._id;
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// Route to get available menu items for ordering
router.get('/menu-items', async (req, res) => {
    try {
        const menuItems = await MenuItems.find({ available: true });
        res.json(menuItems);
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/orders', async (req, res) => {
    // Extract order details from request body
    const { cart, currency, amount } = req.body;
    console.log('Creating PayPal order with:', { cart, currency, amount });
    
    const userId = req.session && req.session.user ? req.session.user.id : null;
    console.log('PayPal order - Session data:', { session: req.session, userId });
    
    // Check if user is logged in
    if (!userId) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'You must be logged in to place an order'
        });
    }
    
    try {
        // Convert cart format from frontend (name/price) to database format (menuItemId/quantity)
        let dbOrderItems = [];
        let totalAmount = 0;
        
        if (Array.isArray(cart) && cart.length > 0) {
            // Frontend sends cart with name and price, we need to find matching menu items
            for (const cartItem of cart) {
                // Try to find menu item by name (this is a simplified approach)
                const menuItem = await MenuItems.findOne({ name: cartItem.name, available: true });
                if (menuItem) {
                    const quantity = cartItem.quantity || 1;
                    
                    if (menuItem.stock < quantity) {
                        return res.status(400).json({
                            error: 'Insufficient Stock',
                            message: `${menuItem.name} has insufficient stock. Available: ${menuItem.stock}, Requested: ${quantity}`
                        });
                    }
                    
                    dbOrderItems.push({
                        menuItemId: menuItem._id,
                        quantity: quantity
                    });
                    totalAmount += menuItem.price * quantity;
                }
            }
        }
        
        // Create PayPal order
        const { jsonResponse, httpStatusCode } = await createOrder(cart, currency, amount);
        console.log('PayPal order created:', jsonResponse);
        
        if (httpStatusCode === 201 && jsonResponse.id && dbOrderItems.length > 0) {
            const publicId = nanoID.nanoid(6);
            // Create database order record
            const newOrder = new Order({
                userId: userId,
                items: dbOrderItems,
                orderDate: new Date(),
                status: 'Pending',
                totalAmount: totalAmount,
                paypalOrderId: jsonResponse.id,
                notes: '',
                publicID: publicId
            });
            
            await newOrder.save();
            console.log('Database order created:', newOrder._id);
        }
        
        res.status(httpStatusCode).json(jsonResponse);
    }
    catch (error) {
        console.error('Error creating order:', error);
        
        let statusCode = 500;
        let errorResponse = {
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while processing your payment',
            timestamp: new Date().toISOString()
        };
        
        if (error.message.includes('temporarily unavailable')) {
            statusCode = 503;
            errorResponse = {
                error: 'Service Unavailable',
                message: 'PayPal service is temporarily unavailable. Please try again in a few minutes.',
                retryAfter: 60, // seconds
                timestamp: new Date().toISOString()
            };
            res.set('Retry-After', '60');
        } else if (error.message.includes('PayPal API Error')) {
            statusCode = 502;
            errorResponse = {
                error: 'Bad Gateway',
                message: 'There was an issue communicating with PayPal. Please try again.',
                timestamp: new Date().toISOString()
            };
        }
        
        res.status(statusCode).json(errorResponse);
    }
});

// Google Pay order creation endpoint
router.post('/orders/googlepay', async (req, res) => {
    // Extract order details from request body
    const { cart, currency, amount } = req.body;
    console.log('Creating Google Pay order with:', { cart, currency, amount });
    
    const userId = req.session && req.session.user ? req.session.user.id : null;
    console.log('Session data:', { session: req.session, userId });
    
    // Check if user is logged in
    if (!userId) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'You must be logged in to place an order'
        });
    }
    
    try {
        // Convert cart format from frontend (name/price) to database format (menuItemId/quantity)
        let dbOrderItems = [];
        let totalAmount = 0;
        
        if (Array.isArray(cart) && cart.length > 0) {
            for (const cartItem of cart) {

                const menuItem = await MenuItems.findOne({ name: cartItem.name, available: true });
                if (menuItem) {
                    const quantity = cartItem.quantity || 1;
                    
                    if (menuItem.stock < quantity) {
                        return res.status(400).json({
                            error: 'Insufficient Stock',
                            message: `${menuItem.name} has insufficient stock. Available: ${menuItem.stock}, Requested: ${quantity}`
                        });
                    }
                    
                    dbOrderItems.push({
                        menuItemId: menuItem._id,
                        quantity: quantity
                    });
                    totalAmount += menuItem.price * quantity;
                }
            }
        }
        


        if (dbOrderItems.length > 0) {
            const publicId = nanoID.nanoid(6);
            
            // Create database order record for Google Pay
            const newOrder = new Order({
                userId: userId,
                items: dbOrderItems,
                orderDate: new Date(),
                status: 'Pending',
                totalAmount: totalAmount,
                paypalOrderId: null, // No PayPal ID for Google Pay orders
                notes: 'Google Pay Order',
                publicID: publicId
            });
            
            await newOrder.save();
            console.log('Database order created for Google Pay:', newOrder._id);
            
            // Return order details for Google Pay processing
            res.status(200).json({
                success: true,
                orderId: newOrder._id.toString(),
                amount: totalAmount.toFixed(2),
                currency: 'USD',
                items: cart
            });
        } else {
            res.status(400).json({
                error: 'Invalid Cart',
                message: 'No valid items found in cart'
            });
        }
    }
    catch (error) {
        console.error('Error creating Google Pay order:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while processing your order',
            timestamp: new Date().toISOString()
        });
    }
});

// Google Pay payment completion endpoint
router.post('/orders/googlepay/complete', async (req, res) => {
    const { orderId, paymentMethodData, transactionId } = req.body;
    
    const userId = req.session && req.session.user ? req.session.user.id : null;
    console.log('Google Pay completion - Session data:', { session: req.session, userId });
    
    // Check if user is logged in
    if (!userId) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'You must be logged in to complete payment'
        });
    }
    
    try {
        // Find the order and update it
        const order = await Order.findById(orderId).populate('items.menuItemId');
        
        if (!order) {
            return res.status(404).json({
                error: 'Order Not Found',
                message: 'Order not found or already processed'
            });
        }
        
        // Update order status
        order.status = 'Completed';
        order.pickupTime = new Date();
        await order.save();
        
        // Update stock for each menu item
        for (const item of order.items) {
            await MenuItems.findByIdAndUpdate(
                item.menuItemId._id,
                { $inc: { stock: -item.quantity } }
            );
        }
        
        // Create payment record
        const payment = new Payment({
            userId: userId,
            amount: order.totalAmount,
            currency: 'USD',
            paymentMethod: 'GooglePay',
            status: 'Completed',
            transactionId: transactionId || 'googlepay_' + Date.now(),
            details: {
                paymentMethodData: paymentMethodData,
                orderId: orderId
            }
        });
        await payment.save();
        
        console.log('Google Pay order completed and payment recorded:', {
            orderId: order._id,
            paymentId: payment._id,
            transactionId: payment.transactionId
        });
        
        res.status(200).json({
            success: true,
            orderId: order._id,
            paymentId: payment._id,
            message: 'Payment completed successfully'
        });
    }
    catch (error) {
        console.error('Error completing Google Pay order:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while completing your payment',
            timestamp: new Date().toISOString()
        });
    }
});

router.post('/orders/:orderID/capture', async (req, res) => {
    const { orderID } = req.params;
    const userId = req.session && req.session.user ? req.session.user.id : null;
    console.log('PayPal capture - Session data:', { session: req.session, userId });
    
    // Check if user is logged in
    if (!userId) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'You must be logged in to complete payment'
        });
    }
    
    try {
        const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
        
        if (httpStatusCode === 201) {
            // Payment successful, update database order
            const order = await Order.findOne({ paypalOrderId: orderID }).populate('items.menuItemId');
            
            if (order) {
                // Update order status
                order.status = 'Completed';
                order.pickupTime = new Date();
                await order.save();
                
                // Update stock for each menu item
                for (const item of order.items) {
                    await MenuItems.findByIdAndUpdate(
                        item.menuItemId._id,
                        { $inc: { stock: -item.quantity } }
                    );
                }
                
                // Create payment record
                const payment = new Payment({
                    userId: userId,
                    amount: order.totalAmount,
                    currency: 'USD', // PayPal uses USD
                    paymentMethod: 'PayPal',
                    status: 'Completed',
                    transactionId: jsonResponse.id
                });
                await payment.save();
                
                console.log('Order completed and payment recorded:', {
                    orderId: order._id,
                    paymentId: payment._id,
                    transactionId: jsonResponse.id
                });
            }
        }
        
        res.status(httpStatusCode).json(jsonResponse);
    }
    catch (error) {
        console.error('Error capturing order:', error);
        
        let statusCode = 500;
        let errorResponse = {
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while capturing your payment',
            timestamp: new Date().toISOString()
        };
        
        if (error.message.includes('temporarily unavailable')) {
            statusCode = 503;
            errorResponse = {
                error: 'Service Unavailable',
                message: 'PayPal service is temporarily unavailable. Please try again in a few minutes.',
                retryAfter: 60,
                timestamp: new Date().toISOString()
            };
            res.set('Retry-After', '60');
        } else if (error.message.includes('PayPal API Error')) {
            statusCode = 502;
            errorResponse = {
                error: 'Bad Gateway',
                message: 'There was an issue communicating with PayPal. Please try again.',
                timestamp: new Date().toISOString()
            };
        }
        
        res.status(statusCode).json(errorResponse);
    }
}); 

module.exports = router;