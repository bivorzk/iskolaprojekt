const express = require('express');
// Import User model and other database models
const { User } = require('./database');
const { Payment, UserLoyalty, MenuItems, Order, OrderItems } = require('../config/database_queries');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Import services
const paypalService = require('./services/paypal-service');
const googlePayService = require('./services/googlepay-service');
const orderService = require('./services/order-service');

// Import security middleware
const {
    securityMiddleware,
    limiter,
    authLimiter,
    paymentLimiter,
    corsOptions,
    validateOrderInput,
    validatePaymentInput
} = require('./middleware/security');

// Apply security middleware
router.use(securityMiddleware);
router.use(require('cors')(corsOptions));

// Apply general rate limiting
router.use('/orders', limiter);
router.use('/pay-with-balance', paymentLimiter);


// api/orders
router.get('/test', (req, res) => {
  res.send('Test route working!');
});

// Route to get current logged-in user
router.get('/current_user', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// Route to get current user for chat functionality
router.get('/current-user', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({
        id: req.session.user.id,
        username: req.session.user.username,
        usertype: req.session.user.usertype
    });
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

router.post('/orders', validateOrderInput, async (req, res) => {
    const { cart, currency, amount } = req.body;

    const userId = req.session && req.session.user ? req.session.user.id : null;

    // Check if user is logged in
    if (!userId) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'You must be logged in to place an order'
        });
    }

    try {
        // Validate stock before creating PayPal order
        await orderService.validateOrderStock(cart);

        // Create PayPal order
        const { jsonResponse, httpStatusCode } = await paypalService.createOrder(cart, currency, amount);

        if (httpStatusCode === 201 && jsonResponse.id) {
            const { dbOrderItems, totalAmount } = await orderService.convertCartToDbFormat(cart);

            if (dbOrderItems.length > 0) {
                const newOrder = await orderService.createOrderRecord(
                    userId,
                    dbOrderItems,
                    totalAmount,
                    jsonResponse.id
                );
                console.log('Database order created for user:', userId, '- Order ID:', newOrder._id);
            }
        }

        res.status(httpStatusCode).json(jsonResponse);
    }
    catch (error) {
        console.error('Error creating PayPal order for user:', userId, '- Error:', error.message);

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
        } else if (error.message.includes('insufficient stock')) {
            statusCode = 400;
            errorResponse = {
                error: 'Insufficient Stock',
                message: error.message,
                timestamp: new Date().toISOString()
            };
        }

        res.status(statusCode).json(errorResponse);
    }
});

// Route to save completed orders (after payment is done)
router.post('/save-order', validatePaymentInput, async (req, res) => {
    const { items, total, currency, paymentMethod, transactionId } = req.body;

    const userId = req.session && req.session.user ? req.session.user.id : null;

    // Check if user is logged in
    if (!userId) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'You must be logged in to place an order'
        });
    }

    try {
        const { orderId, loyaltyPointsAwarded, orderDetails } = await orderService.saveCompletedOrder(
            userId, items, total, currency, paymentMethod, transactionId
        );

        console.log('Order saved successfully for user:', userId, '- Order ID:', orderId, '- Points awarded:', loyaltyPointsAwarded);

        res.status(201).json({
            success: true,
            orderId: orderId,
            loyaltyPointsAwarded: loyaltyPointsAwarded,
            message: 'Order placed successfully',
            orderDetails: orderDetails
        });

    } catch (error) {
        console.error('Error saving order for user:', userId, '- Error:', error.message);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to save order to database'
        });
    }
});

// Google Pay order creation endpoint
router.post('/orders/googlepay', validateOrderInput, async (req, res) => {
    const { cart, currency, amount } = req.body;

    const userId = req.session && req.session.user ? req.session.user.id : null;

    // Check if user is logged in
    if (!userId) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'You must be logged in to place an order'
        });
    }

    try {
        const orderResult = await googlePayService.createGooglePayOrder(userId, cart);

        console.log('Google Pay order created for user:', userId, '- Order ID:', orderResult.orderId);

        res.status(200).json({
            success: true,
            ...orderResult
        });
    }
    catch (error) {
        console.error('Error creating Google Pay order for user:', userId, '- Error:', error.message);

        let statusCode = 500;
        let errorResponse = {
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while processing your order',
            timestamp: new Date().toISOString()
        };

        if (error.message.includes('insufficient stock')) {
            statusCode = 400;
            errorResponse = {
                error: 'Insufficient Stock',
                message: error.message,
                timestamp: new Date().toISOString()
            };
        } else if (error.message.includes('No valid items')) {
            statusCode = 400;
            errorResponse = {
                error: 'Invalid Cart',
                message: error.message,
                timestamp: new Date().toISOString()
            };
        }

        res.status(statusCode).json(errorResponse);
    }
});

// Google Pay payment completion endpoint
router.post('/orders/googlepay/complete', async (req, res) => {
    const { orderId, paymentMethodData, transactionId } = req.body;

    const userId = req.session && req.session.user ? req.session.user.id : null;

    // Check if user is logged in
    if (!userId) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'You must be logged in to complete payment'
        });
    }

    // Validate orderId
    if (!orderId || typeof orderId !== 'string' || orderId.length > 50) {
        return res.status(400).json({
            error: 'Invalid Order ID',
            message: 'Order ID is required and must be valid'
        });
    }

    try {
        const result = await googlePayService.completeGooglePayOrder(
            userId, orderId, paymentMethodData, transactionId
        );

        console.log('Google Pay order completed for user:', userId, '- Order ID:', orderId);

        res.status(200).json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Error completing Google Pay order for user:', userId, '- Order ID:', orderId, '- Error:', error.message);

        let statusCode = 500;
        let errorMessage = 'An unexpected error occurred while completing your payment';

        if (error.message.includes('not found')) {
            statusCode = 404;
            errorMessage = error.message;
        }

        res.status(statusCode).json({
            error: 'Error',
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

router.post('/orders/:orderID/capture', async (req, res) => {
    const { orderID } = req.params;
    const userId = req.session && req.session.user ? req.session.user.id : null;

    // Check if user is logged in
    if (!userId) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'You must be logged in to complete payment'
        });
    }

    // Validate orderID parameter
    if (!orderID || typeof orderID !== 'string' || orderID.length > 50) {
        return res.status(400).json({
            error: 'Invalid Order ID',
            message: 'Order ID is required and must be valid'
        });
    }

    try {
        const { jsonResponse, httpStatusCode } = await paypalService.captureOrder(orderID);

        if (httpStatusCode === 201) {
            // Payment successful, update database order
            await orderService.completePaypalOrder(userId, orderID, jsonResponse);
            console.log('PayPal order captured for user:', userId, '- Order ID:', orderID);
        }

        res.status(httpStatusCode).json(jsonResponse);
    }
    catch (error) {
        console.error('Error capturing PayPal order for user:', userId, '- Order ID:', orderID, '- Error:', error.message);

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

// Order from balance
router.post('/pay-with-balance', validatePaymentInput, async (req, res) => {
    const { items, total, currency } = req.body;

    const userId = req.session && req.session.user ? req.session.user.id : null;

    // Check if user is logged in
    if (!userId) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'You must be logged in to place an order'
        });
    }

    try {
        const { orderId, loyaltyPointsAwarded, orderDetails } = await orderService.processBalancePayment(
            userId, items, total, currency
        );

        console.log('Balance payment processed for user:', userId, '- Order ID:', orderId, '- Points awarded:', loyaltyPointsAwarded);

        res.status(201).json({
            success: true,
            orderId: orderId,
            loyaltyPointsAwarded: loyaltyPointsAwarded,
            message: 'Order placed successfully',
            orderDetails: orderDetails
        });

    } catch (error) {
        console.error('Error processing balance payment for user:', userId, '- Error:', error.message);

        let statusCode = 500;
        let errorMessage = 'Failed to process balance payment';

        if (error.message.includes('not found')) {
            statusCode = 401;
            errorMessage = error.message;
        } else if (error.message.includes('insufficient')) {
            statusCode = 400;
            errorMessage = error.message;
        } else if (error.message.includes('Currency not supported') ||
                   error.message.includes('No valid items') ||
                   error.message.includes('total does not match')) {
            statusCode = 400;
            errorMessage = error.message;
        }

        res.status(statusCode).json({
            error: statusCode === 401 ? 'Unauthorized' : 'Error',
            message: errorMessage
        });
    }
});




module.exports = router;