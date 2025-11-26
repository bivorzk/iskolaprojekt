const express = require('express');
// Import User model and other database models
const { User } = require('../database');
const { Payment, UserLoyalty, MenuItems, Order, OrderItems } = require('../../config/database_queries');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Client, Environment, OrdersController, PaymentsController, LogLevel, ApiError } = require('@paypal/paypal-server-sdk');
const path = require('path');


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


router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/Order/index.html'));
});


router.get('/menu_items', async (req, res) => {
    try {
        const menuItems = await MenuItems.find({ available: true });
        res.json(menuItems);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});


router.post('/Order', async (req, res) => {
    // Extract order details from request body
    const { cart } = req.body;
    
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ error: 'Cart is required and must contain items' });
    }

    try {
        // Calculate total amount from cart items
        let totalAmount = 0;
        const orderItems = [];
        
        for (const item of cart) {
            const menuItem = await MenuItems.findById(item.menuItemId);
            if (!menuItem) {
                return res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
            }
            if (!menuItem.available || menuItem.stock < item.quantity) {
                return res.status(400).json({ error: `Menu item ${menuItem.name} is not available or insufficient stock` });
            }
            
            const itemTotal = menuItem.price * item.quantity;
            totalAmount += itemTotal;
            
            orderItems.push({
                menuItemId: item.menuItemId,
                quantity: item.quantity
            });
        }

        // Create order in database
        const newOrder = new Order({
            userId: req.session.user ? req.session.user._id : null,
            items: orderItems,
            orderDate: new Date(),
            status: 'Pending',
            totalAmount: totalAmount,
            notes: req.body.notes || ''
        });

        const savedOrder = await newOrder.save();

        // Create PayPal order
        const paypalOrder = await createPayPalOrder(cart, totalAmount);
        
        // Update the order with PayPal order ID
        savedOrder.paypalOrderId = paypalOrder.jsonResponse.id;
        await savedOrder.save();

        // Don't update stock yet - wait for payment completion
        // Stock will be updated when payment is captured

        res.status(201).json({
            success: true,
            orderId: savedOrder._id,
            totalAmount: savedOrder.totalAmount,
            status: savedOrder.status,
            paypalOrderId: paypalOrder.jsonResponse.id,
            paypalApprovalUrl: paypalOrder.jsonResponse.links?.find(link => link.rel === 'approve')?.href,
            message: 'Order created successfully'
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/:orderID/status', async (req, res) => {
    const { orderID } = req.params;
    const { status, paymentDetails } = req.body;
    
    try {
        // Validate status
        const validStatuses = ['Pending', 'InProgress', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Update order status
        const updatedOrder = await Order.findByIdAndUpdate(
            orderID,
            { 
                status: status,
                ...(status === 'Completed' && { pickupTime: new Date() })
            },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // If payment is completed, save payment record
        if (status === 'Completed' && paymentDetails) {
            const payment = new Payment({
                userId: updatedOrder.userId,
                amount: updatedOrder.totalAmount,
                currency: paymentDetails.currency || 'USD',
                paymentMethod: paymentDetails.method || 'PayPal',
                status: 'Completed',
                transactionId: paymentDetails.transactionId
            });
            await payment.save();
        }

        res.json({
            success: true,
            order: updatedOrder,
            message: `Order status updated to ${status}`
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get order by ID
// Capture PayPal payment and update order
router.post('/:orderID/capture', async (req, res) => {
    const { orderID } = req.params;
    
    try {
        // Find the order in our database by PayPal order ID
        const order = await Order.findOne({ paypalOrderId: orderID }).populate('items.menuItemId');
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Capture the PayPal payment
        const paypalCapture = await capturePayPalOrder(orderID);
        
        if (paypalCapture.httpStatusCode === 201) {
            // Payment successful, update order status
            order.status = 'Completed';
            order.pickupTime = new Date();
            await order.save();

            // Update stock for each menu item now that payment is confirmed
            for (const item of order.items) {
                await MenuItems.findByIdAndUpdate(
                    item.menuItemId._id,
                    { $inc: { stock: -item.quantity } }
                );
            }

            // Create payment record
            const payment = new Payment({
                userId: order.userId,
                amount: order.totalAmount,
                currency: 'USD',
                paymentMethod: 'PayPal',
                status: 'Completed',
                transactionId: paypalCapture.jsonResponse.id
            });
            await payment.save();

            // Return the PayPal capture response (frontend expects this format)
            res.json(paypalCapture.jsonResponse);
        } else {
            res.status(paypalCapture.httpStatusCode).json({
                success: false,
                error: 'Payment capture failed',
                details: paypalCapture.jsonResponse
            });
        }

    } catch (error) {
        console.error('Error capturing payment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/:orderID', async (req, res) => {
    const { orderID } = req.params;
    
    try {
        const order = await Order.findById(orderID)
            .populate('userId', 'username email')
            .populate('items.menuItemId', 'name price description');
            
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}); 

module.exports = router;

