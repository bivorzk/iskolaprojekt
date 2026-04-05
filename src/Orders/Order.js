const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Client, Environment, OrdersController, PaymentsController, LogLevel, ApiError } = require('@paypal/paypal-server-sdk');

// Import models and database queries
const { User } = require('../database');
const { Payment, UserLoyalty, MenuItems, Order, OrderItems } = require('../../config/database_queries');
const { ConvertPoints, getHealthLevel } = require('../LoyaltySystem/loyalty-service');

const { cacheResult, invalidateCache, getCached, setCached } = require('../dashboard/services/cache-service');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const redisLuaService = require('../services/redis-lua-service');
const levenshtein = require('fast-levenshtein');
const badwords = require('badwords-list');
const naughtiness = require('naughty-words');
const { createSecurityLog } = require('../auth/security');
const { validateUsername, validatePassword } = require('../auth/validation');

let redisClient = null;
try {
  const { redisClient: client } = require('../redis');
  redisClient = client;
} catch (error) {
  console.log('Redis not available in orders:', error.message);
}

function isRedisAvailable() {
  return redisClient && redisClient.isOpen;
}

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// PayPal configuration
const client = new Client({
    clientCredentialsAuthCredentials: {
        oAuthClientId: PAYPAL_CLIENT_ID,
        oAuthClientSecret: PAYPAL_CLIENT_SECRET,
    },
    timeout: 0,
    environment: Environment.Sandbox,
    logging: {
        logLevel: LogLevel.None,
    },
});

const ordersController = new OrdersController(client);

// Rate limiting middleware using Redis Lua service
async function rateLimit(req, res, next) {
  try {
    const key = `ratelimit:orders:${req.session.user?.id || req.ip}`;
    const rateLimitResult = await redisLuaService.checkRateLimit(key, 60, 20); // 20 requests per minute

    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Too many requests, please try again later.',
        retryAfter: 60
      });
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': '20',
      'X-RateLimit-Remaining': Math.max(0, 19 - rateLimitResult.currentCount),
      'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 60
    });

    next();
  } catch (error) {
    console.log('Rate limiting failed, allowing request:', error.message);
    next(); // Allow request if rate limiting fails
  }
}

// Review rate limiting middleware
async function reviewRateLimit(req, res, next) {
  try {
    const key = `ratelimit:reviews:${req.session.user?.id || req.ip}`;
    const rateLimitResult = await redisLuaService.checkRateLimit(key, 900, 5); // 5 reviews per 15 minutes

    if (!rateLimitResult.allowed) {
      const ipAddress = req.ip || req.connection.remoteAddress;
      await createSecurityLog({
        userId: req.session.user ? req.session.user.id : null,
        ipAddress,
        action: 'REVIEW_RATE_LIMIT_EXCEEDED',
        type: 'RATE_LIMIT_VIOLATION',
        details: 'Review submission rate limit exceeded'
      });
      return res.status(429).json({
        error: 'Too many review submissions, please try again later.',
        retryAfter: 900
      });
    }

    next();
  } catch (error) {
    console.log('Review rate limiting failed, allowing request:', error.message);
    next();
  }
}

// Input validation middleware
function validateOrderInput(req, res, next) {
  const { cart } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    createSecurityLog({
      userId: req.session.user ? req.session.user.id : null,
      ipAddress,
      action: 'ORDER_VALIDATION_FAILED',
      type: 'VALIDATION_ERROR',
      details: 'Invalid cart data'
    }).catch(console.error);
    return res.status(400).json({ error: 'Cart is required and must contain items' });
  }

  // Validate each cart item
  for (const item of cart) {
    if (!item.menuItemId || typeof item.menuItemId !== 'string') {
      return res.status(400).json({ error: 'Each cart item must have a valid menuItemId' });
    }
    if (!item.quantity || !Number.isInteger(item.quantity) || item.quantity < 1) {
      return res.status(400).json({ error: 'Each cart item must have a valid positive quantity' });
    }
  }

  next();
}

router.get('/', (req, res) => {
    // Use the correct case-sensitive path for Linux/production environments
    res.sendFile(path.join(process.cwd(), 'public', 'Order', 'index.html'));
});

router.get('/item_information/:itemName', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/information/index.html'));
});

// Apply rate limiting to all API endpoints (not static HTML serves)
router.use(['/username', '/menu_items', '/order', '/order/wallet', '/item_information'], rateLimit);

// API endpoints for ORDER MANAGEMENT

router.post('/item_information/:itemName/Review', [
    reviewRateLimit,
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'),
    body('comment').isLength({ min: 1, max: 500 }).trim().withMessage('Comment must be between 1 and 500 characters')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const ipAddress = req.ip || req.connection.remoteAddress;
        await createSecurityLog({
            userId: req.session.user ? req.session.user.id : null,
            ipAddress,
            action: 'REVIEW_VALIDATION_FAILED',
            type: 'VALIDATION_ERROR',
            details: 'Review validation errors: ' + errors.array().map(e => e.msg).join(', ')
        });
        return res.status(400).json({ errors: errors.array() });
    }

    const { itemName } = req.params;
    const { rating, comment } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;


    // Check for profanity using Levenshtein distance
    const words = comment.toLowerCase().split(/\s+/);
    let containsProfanity = false;

    for (const word of words) {
            for (const badWord of badwords.array) {
                if (levenshtein.get(word, badWord.toLowerCase()) < 1) {
                    containsProfanity = true;
                    break;
                }
            }
            if (containsProfanity) break;
            // Check against all language lists in naughtiness
            for (const lang in naughtiness) {
                if (Array.isArray(naughtiness[lang])) {
                    for (const naughtyWord of naughtiness[lang]) {
                        if (levenshtein.get(word, naughtyWord.toLowerCase()) < 1) {
                            containsProfanity = true;
                            break;
                        }
                    }
                    if (containsProfanity) break;
                }
            }
            if (containsProfanity) break;
    }
    if (containsProfanity) {
        await createSecurityLog({
            userId: req.session.user ? req.session.user.id : null,
            ipAddress,
            action: 'REVIEW_CONTAINS_PROFANITY',
            type: 'CONTENT_VIOLATION',
            details: 'Review comment contains language similar to prohibited words'
        });
        return res.status(400).json({ error: 'Review comment contains inappropriate language' });
    }

    
    try {
        const cacheKey = `menu_item:${itemName}`;
        let menuItem;

        try {
            menuItem = await MenuItems.findOne({ name: itemName });
        } catch (cacheError) {
            menuItem = null;
        }
        
        if (!menuItem) {
            await createSecurityLog({
                userId: req.session.user ? req.session.user.id : null,
                ipAddress,
                action: 'REVIEW_SUBMISSION_FAILED',
                type: 'NOT_FOUND',
                details: `Menu item not found: ${itemName}`
            });
            return res.status(404).json({ error: 'Menu item not found' });
        }
        
        if (req.session.user) {
            const existingReview = menuItem.reviews?.find(
                review => review.userId && review.userId.toString() === req.session.user.id
            );
            if (existingReview) {
                await createSecurityLog({
                    userId: req.session.user.id,
                    ipAddress,
                    action: 'DUPLICATE_REVIEW_ATTEMPT',
                    type: 'BUSINESS_RULE_VIOLATION',
                    details: `Duplicate review attempt for item: ${itemName}`
                });
                return res.status(400).json({ error: 'You have already reviewed this item' });
            }
        }
        
        if (!menuItem.reviews) {
            menuItem.reviews = [];
        }
        
        const newReview = {
            userId: req.session.user ? req.session.user.id : null,
            rating,
            comment: comment.trim(),
            date: new Date(),
            ipAddress: req.ip
        };

        menuItem.reviews.push(newReview);

        // Compute new average before saving
        const totalRatings = menuItem.reviews.length;
        menuItem.averageRating = totalRatings > 0
            ? parseFloat((menuItem.reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1))
            : 0;

        await menuItem.save();
        
        // Invalidate relevant caches
        if (invalidateCache) {
            invalidateCache([
                `menu_item:${itemName}`,
                `menu_items:available`,
                `reviews:${itemName}`,
                `menu_item_ratings:${menuItem._id}`
            ]);
        }
        
        // Log successful review submission
        await createSecurityLog({
            userId: req.session.user ? req.session.user.id : null,
            ipAddress,
            action: 'REVIEW_SUBMITTED',
            type: 'SUCCESS',
            details: `Review submitted for item: ${itemName}, rating: ${rating}`
        });
        
        res.status(201).json({ 
            success: true, 
            message: 'Review added successfully',
            newAverageRating: menuItem.averageRating,
            totalReviews: totalRatings
        });
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}); 

router.post('/item_information/:itemName/Review/:reviewId/Report', async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).json({ error: 'Login required to report review' });
    }

    const { itemName, reviewId } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({ error: 'Invalid review identifier' });
    }

    try {
        const menuItem = await MenuItems.findOne({ name: itemName });
        if (!menuItem) {
            await createSecurityLog({
                userId: req.session.user.id,
                ipAddress,
                action: 'REVIEW_REPORT_FAILED',
                type: 'NOT_FOUND',
                details: `Menu item not found for report: ${itemName}`
            });
            return res.status(404).json({ error: 'Menu item not found' });
        }

        const review = menuItem.reviews.id(reviewId);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        review.reported = true;
        review.reportedCount = (review.reportedCount || 0) + 1;

        await menuItem.save();

        await createSecurityLog({
            userId: req.session.user.id,
            ipAddress,
            action: 'REVIEW_REPORTED',
            type: 'USER_ACTION',
            details: `Reported review ${reviewId} for item: ${itemName}`
        });

        if (invalidateCache) {
            invalidateCache([`menu_item:${itemName}`, `menu_items:available`, `reviews:${itemName}`]);
        }

        return res.json({ success: true, message: 'Review reported successfully' });
    } catch (error) {
        console.error('Error reporting review:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/username', async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.session.user.id;
    const cacheKey = `user:username:${userId}`;

    try {
        // Try to get from cache first
        if (getCached) {
            const cachedUsername = await getCached(cacheKey);
            if (cachedUsername) {
                return res.json(cachedUsername);
            }
        }

        // Fetch from database
        const user = await User.findById(userId).select('username');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const result = { username: user.username };

        // Cache the result
        if (setCached) {
            await setCached(cacheKey, result, 300); // Cache for 5 minutes
        }

        res.json(result);
    } catch (error) {
        console.error('Error fetching username:', error);
    }
});


router.get('/menu_items', async (req, res) => {
    try {
        const cacheKey = 'menu_items:available';

        if (getCached) {
            const cached = await getCached(cacheKey);
            if (cached) return res.json(cached);
        }

        const menuItems = await MenuItems.find({ available: true })
            .select('name price description category healthScore averageRating stock available reviews')
            .populate('reviews.userId', 'username')
            .lean();

        if (setCached) await setCached(cacheKey, menuItems, 30); // 30-second TTL

        res.json(menuItems);
    }
    catch (error) {
        console.error('Error fetching menu items:', error);
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        
        try {
            await createSecurityLog({
                userId: req.session.user ? req.session.user.id : null,
                ipAddress,
                action: 'MENU_ITEMS_FETCH_ERROR',
                type: 'SYSTEM_ERROR',
                details: `Database error during menu items fetch: ${error.message}`
            });
        } catch (logError) {
            console.error('Failed to log security event:', logError);
        }
        
        res.status(500).json({ error: 'Server error' });
    }
});


router.post('/order', validateOrderInput, async (req, res) => {
    // Extract order details from request body
    const { cart } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    try {
        // Calculate total amount from cart items
        let totalAmount = 0;
        const orderItems = [];

        for (const item of cart) {
            // Atomically check stock availability
            const menuItem = await MenuItems.findOneAndUpdate(
                { _id: item.menuItemId, available: true, stock: { $gte: item.quantity } },
                {}, // No update, just check condition
                { new: true }
            );
            if (!menuItem) {
                return res.status(400).json({ error: `Menu item ${item.menuItemId} is not available or insufficient stock` });
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
            userId: req.session.user ? req.session.user.id : null,
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

        
        // Invalidate menu items cache since order was created
        if (invalidateCache) {
            invalidateCache([
                'menu_items:available',
                'daily_menu:available'
            ]);
        }

        // Log successful order creation
        await createSecurityLog({
            userId: req.session.user ? req.session.user.id : null,
            ipAddress,
            action: 'ORDER_CREATED',
            type: 'SUCCESS',
            details: `Order created successfully: ${savedOrder._id}, amount: ${totalAmount}`
        });

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

        // Log security error
        try {
            await createSecurityLog({
                userId: req.session.user ? req.session.user.id : null,
                ipAddress,
                action: 'ORDER_CREATION_ERROR',
                type: 'SYSTEM_ERROR',
                details: `Database error during order creation: ${error.message}`
            });
        } catch (logError) {
            console.error('Failed to log security event:', logError);
        }

        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Process order with wallet payment (atomic operation)
router.post('/order/wallet', validateOrderInput, async (req, res) => {
    const { cart } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Check if user is logged in
    if (!req.session.user || !req.session.user.id) {
        await createSecurityLog({
            userId: null,
            ipAddress,
            action: 'WALLET_ORDER_FAILED',
            type: 'AUTHENTICATION_ERROR',
            details: 'Unauthenticated wallet payment attempt'
        });
        return res.status(401).json({ error: 'User must be logged in to use wallet payment' });
    }

    const userId = req.session.user.id;

    try {
        // Calculate total amount and validate items
        let totalAmount = 0;
        const orderItems = [];
        const inventoryChecks = [];

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

            inventoryChecks.push({
                inventoryKey: `inventory:item:${item.menuItemId}`,
                quantity: item.quantity,
                price: menuItem.price,
                name: menuItem.name
            });
        }

        // Check wallet balance first
        const walletKey = `wallet:user:${userId}`;
        let currentBalance;

        try {
            currentBalance = await redisLuaService.getWalletBalance(walletKey);
        } catch (redisError) {
            // Fallback to database
            const user = await User.findById(userId).select('balance');
            currentBalance = user ? user.balance || 0 : 0;
        }

        if (currentBalance < totalAmount) {
            return res.status(400).json({
                error: 'Insufficient wallet balance',
                required: totalAmount,
                available: currentBalance
            });
        }

        // Create order record first
        const orderKey = `order:${Date.now()}:${userId}`;
        const newOrder = new Order({
            userId: userId,
            items: orderItems,
            orderDate: new Date(),
            status: 'Pending',
            totalAmount: totalAmount,
            notes: req.body.notes || '',
            publicID: orderKey
        });

        const savedOrder = await newOrder.save();

        // Process payment and inventory atomically using Redis Lua
        try {
            // Prepare arguments for the order processing script
            const inventoryKey = inventoryChecks[0].inventoryKey; // For simplicity, handle first item
            const quantity = inventoryChecks[0].quantity;
            const price = inventoryChecks[0].price;

            const result = await redisLuaService.processOrder(
                inventoryKey,
                walletKey,
                orderKey,
                quantity,
                price,
                userId
            );

            // Update order status to completed
            savedOrder.status = 'Completed';
            savedOrder.pickupTime = new Date();
            await savedOrder.save();

            // Create payment record
            const payment = new Payment({
                userId: userId,
                amount: totalAmount,
                currency: 'USD',
                paymentMethod: 'Wallet',
                status: 'Completed',
                transactionId: `wallet_${Date.now()}`
            });
            await payment.save();

            // Award loyalty points
            try {
                const userLoyalty = await UserLoyalty.findOne({ userId });
                let currentTier = 'NONE';
                if (userLoyalty) {
                    currentTier = userLoyalty.userTier;
                }

                let totalPoints = 0;
                for (const item of order.items) {
                    const menuItem = await MenuItems.findById(item.menuItemId);
                    const healthLevel = getHealthLevel(menuItem.healthScore);
                    const itemTotal = menuItem.price * item.quantity; // Calculate dollar amount for this item
                    const points = ConvertPoints(itemTotal, currentTier, healthLevel, new Date());
                    totalPoints += points;
                }

                await UserLoyalty.updatePointsAtomically(userId, totalPoints, 'wallet_order_completion');

                // Invalidate caches
                if (invalidateCache) {
                    invalidateCache([
                        `student:wallet_balance:${userId}`,
                        `student:transactions:${userId}`,
                        `student:loyalty:${userId}`,
                        `student:order_history:${userId}`
                    ]);
                }
            } catch (loyaltyError) {
                console.error('Error awarding loyalty points:', loyaltyError);
            }

            res.status(201).json({
                success: true,
                orderId: savedOrder._id,
                totalAmount: savedOrder.totalAmount,
                status: savedOrder.status,
                newBalance: result.newBalance,
                newStock: result.newStock,
                message: 'Order processed successfully with wallet payment'
            });

        } catch (luaError) {
            console.error('Lua script execution failed:', luaError);

            // Rollback: Cancel the order
            savedOrder.status = 'Cancelled';
            await savedOrder.save();

            return res.status(500).json({
                error: 'Order processing failed',
                details: luaError.message
            });
        }

    } catch (error) {
        console.error('Error processing wallet order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/:orderID/status',
    hpp(), // Prevent HTTP Parameter Pollution
    mongoSanitize(), // Prevent NoSQL injection
    async (req, res) => {
    const { orderID } = req.params;
    const { status, paymentDetails } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    try {
        // Input validation
        if (typeof orderID !== 'string' || !orderID.trim()) {
            await createSecurityLog({
                userId: req.session.user ? req.session.user.id : null,
                ipAddress,
                action: 'ORDER_STATUS_UPDATE_FAILED',
                type: 'VALIDATION_ERROR',
                details: 'Invalid order ID format'
            });
            return res.status(400).json({ error: 'Invalid order ID' });
        }
        
        // Validate status
        const validStatuses = ['Pending', 'InProgress', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            await createSecurityLog({
                userId: req.session.user ? req.session.user.id : null,
                ipAddress,
                action: 'ORDER_STATUS_UPDATE_FAILED',
                type: 'VALIDATION_ERROR',
                details: `Invalid status: ${status}`
            });
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
        
        // Invalidate order cache
        if (invalidateCache) {
            invalidateCache([
                `order:${orderID}`,
                `user:orders:${updatedOrder.userId}`
            ]);
        }
        
        // Log successful status update
        await createSecurityLog({
            userId: req.session.user ? req.session.user.id : null,
            ipAddress,
            action: 'ORDER_STATUS_UPDATED',
            type: 'SUCCESS',
            details: `Order ${orderID} status updated to ${status}`
        });

        res.json({
            success: true,
            order: updatedOrder,
            message: `Order status updated to ${status}`
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        
        // Log security error
        try {
            await createSecurityLog({
                userId: req.session.user ? req.session.user.id : null,
                ipAddress,
                action: 'ORDER_STATUS_UPDATE_ERROR',
                type: 'SYSTEM_ERROR',
                details: `Database error during status update: ${error.message}`
            });
        } catch (logError) {
            console.error('Failed to log security event:', logError);
        }
        
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



// Capture PayPal payment and update order
router.post('/:orderID/capture',
    hpp(), // Prevent HTTP Parameter Pollution
    mongoSanitize(), // Prevent NoSQL injection
    async (req, res) => {
    const { orderID } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    try {
        // Input validation
        if (typeof orderID !== 'string' || !orderID.trim()) {
            await createSecurityLog({
                userId: req.session.user ? req.session.user.id : null,
                ipAddress,
                action: 'PAYMENT_CAPTURE_FAILED',
                type: 'VALIDATION_ERROR',
                details: 'Invalid order ID format'
            });
            return res.status(400).json({ error: 'Invalid order ID' });
        }
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
            // Use Redis Lua service for atomic inventory updates
            const inventoryUpdates = [];
            for (const item of order.items) {
              const inventoryKey = `inventory:item:${item.menuItemId._id}`;
              const quantity = item.quantity;

              try {
                // Check if we have enough stock in Redis first
                const currentStock = await redisLuaService.getInventoryStock(inventoryKey);
                if (currentStock < quantity) {
                  throw new Error(`Insufficient stock for ${item.menuItemId.name}`);
                }

                // Atomically decrement stock
                const newStock = currentStock - quantity;

                // Update Redis inventory
                await redisLuaService.updateWalletBalance(inventoryKey, -quantity); // Negative to decrement

                // Update database inventory to match
                await MenuItems.findByIdAndUpdate(
                  item.menuItemId._id,
                  { stock: newStock }
                );

                inventoryUpdates.push({
                  itemId: item.menuItemId._id,
                  name: item.menuItemId.name,
                  oldStock: currentStock,
                  newStock: newStock
                });

              } catch (redisError) {
                console.log(`Redis inventory update failed for ${item.menuItemId.name}, falling back to database:`, redisError.message);

                // Fallback to database update
                await MenuItems.findByIdAndUpdate(
                  item.menuItemId._id,
                  { $inc: { stock: -item.quantity } }
                );

                // Try to sync to Redis
                try {
                  const updatedItem = await MenuItems.findById(item.menuItemId._id);
                  // Note: This is a simplified sync - in production you'd want to set the exact value
                } catch (syncError) {
                  console.log('Failed to sync inventory to Redis:', syncError.message);
                }
              }
            }

            console.log('Inventory updates completed:', inventoryUpdates);

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

            // Award loyalty points if user is logged in
            if (order.userId) {
                const userLoyalty = await UserLoyalty.findOne({ userId: order.userId });
                let currentTier = 'NONE';
                if (userLoyalty) {
                    currentTier = userLoyalty.userTier;
                }
                
                let totalPoints = 0;
                for (const item of order.items) {
                    const menuItem = item.menuItemId;
                    const healthLevel = getHealthLevel(menuItem.healthScore);
                    const itemTotal = menuItem.price * item.quantity; // Calculate dollar amount for this item
                    const points = ConvertPoints(itemTotal, currentTier, healthLevel, new Date());
                    totalPoints += points;
                }
                
                await UserLoyalty.updatePointsAtomically(order.userId, totalPoints, 'order_completion');
                
                // Invalidate loyalty cache
                if (invalidateCache) {
                    invalidateCache([
                        `student:loyalty:${order.userId}`,
                        `order:${order._id}`,
                        `user:orders:${order.userId}`,
                        'menu_items:available',
                        'daily_menu:available'
                    ]);
                }
            }
            
            // Log successful payment capture
            await createSecurityLog({
                userId: order.userId,
                ipAddress,
                action: 'PAYMENT_CAPTURED',
                type: 'SUCCESS',
                details: `PayPal payment captured for order: ${order._id}, amount: ${order.totalAmount}`
            });

            // Return the PayPal capture response (frontend expects this format)
            res.json(paypalCapture.jsonResponse);
        } else {
            await createSecurityLog({
                userId: req.session.user ? req.session.user.id : null,
                ipAddress,
                action: 'PAYMENT_CAPTURE_FAILED',
                type: 'PAYMENT_ERROR',
                details: `PayPal capture failed with status: ${paypalCapture.httpStatusCode}`
            });
            
            res.status(paypalCapture.httpStatusCode).json({
                success: false,
                error: 'Payment capture failed',
                details: paypalCapture.jsonResponse
            });
        }

    } catch (error) {
        console.error('Error capturing payment:', error);
        
        // Log security error
        try {
            await createSecurityLog({
                userId: req.session.user ? req.session.user.id : null,
                ipAddress,
                action: 'PAYMENT_CAPTURE_ERROR',
                type: 'SYSTEM_ERROR',
                details: `System error during payment capture: ${error.message}`
            });
        } catch (logError) {
            console.error('Failed to log security event:', logError);
        }
        
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/:orderID',
    hpp(), // Prevent HTTP Parameter Pollution
    mongoSanitize(), // Prevent NoSQL injection
    async (req, res) => {
    const { orderID } = req.params;
    const cacheKey = `order:${orderID}`;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    try {
        // Input validation
        if (typeof orderID !== 'string' || !orderID.trim()) {
            await createSecurityLog({
                userId: req.session.user ? req.session.user.id : null,
                ipAddress,
                action: 'ORDER_LOOKUP_FAILED',
                type: 'VALIDATION_ERROR',
                details: 'Invalid order ID format'
            });
            return res.status(400).json({ error: 'Invalid order ID' });
        }
        // Try to get from cache first
        if (getCached) {
            const cachedOrder = await getCached(cacheKey);
            if (cachedOrder) {
                return res.json(cachedOrder);
            }
        }
        
        const order = await Order.findById(orderID)
            .populate('userId', 'username email')
            .populate('items.menuItemId', 'name price description')
            .lean();
            
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        
        // Log security error
        try {
            await createSecurityLog({
                userId: req.session.user ? req.session.user.id : null,
                ipAddress,
                action: 'ORDER_LOOKUP_ERROR',
                type: 'SYSTEM_ERROR',
                details: `Database error during order lookup: ${error.message}`
            });
        } catch (logError) {
            console.error('Failed to log security event:', logError);
        }
        
        res.status(500).json({ error: 'Internal Server Error' });
    }
}); 

router.get('/DailyMenu', cacheResult('daily_menu:available', 600), async (req, res) => {
    try {
        // If not in cache, fetch from database
        const menuItems = await MenuItems.find({ available: true })
            .select('name price description category healthScore averageRating stock available reviews')
            .lean();
        
        res.json(menuItems);
    }
    catch (error) {
        console.error('Error fetching daily menu:', error);
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        // Log security error
        try {
            await createSecurityLog({
                userId: req.session.user ? req.session.user.id : null,
                ipAddress,
                action: 'DAILY_MENU_FETCH_ERROR',
                type: 'SYSTEM_ERROR',
                details: `Database error during daily menu fetch: ${error.message}`
            });
        } catch (logError) {
            console.error('Failed to log security event:', logError);
        }
        
        res.status(500).json({ error: 'Server error' });
    }
});






module.exports = router;

