const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const path = require('path');
const mongoose = require('mongoose');
const { Client, Environment, OrdersController, PaymentsController, LogLevel, ApiError } = require('@paypal/paypal-server-sdk');

// Import models and database queries
const { User } = require('../database');
const { Payment, UserLoyalty, MenuItems, Order } = require('../../config/database_queries');
const { ConvertPoints, getHealthLevel } = require('../LoyaltySystem/loyalty-service');

const { cacheResult, invalidateCache, getCached, setCached } = require('../dashboard/services/cache-service');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const redisLuaService = require('../services/redis-lua-service');
const levenshtein = require('fast-levenshtein');
const badwords = require('badwords-list');
const naughtiness = require('naughty-words');
const { createSecurityLog } = require('../auth/security');

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

// Constants for configuration
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 20;
const REVIEW_RATE_LIMIT_WINDOW_SECONDS = 900; // 15 minutes
const REVIEW_RATE_LIMIT_MAX_REQUESTS = 5;

const RATING_MIN = 1;
const RATING_MAX = 5;
const COMMENT_MIN_LENGTH = 1;
const COMMENT_MAX_LENGTH = 500;

const PROFANITY_DISTANCE_THRESHOLD = 1;
const AVERAGE_RATING_DECIMALS = 1;
const DEFAULT_AVERAGE_RATING = 0;
const DEFAULT_BALANCE = 0;
const DEFAULT_REPORTED_COUNT = 0;

const CACHE_TTL_USERNAME = 300; // 5 minutes
const CACHE_TTL_MENU_ITEMS = 30; // 30 seconds
const CACHE_TTL_DAILY_MENU = 600; // 10 minutes

const VALID_ORDER_STATUSES = ['Pending', 'InProgress', 'Completed', 'Cancelled'];
const DEFAULT_CURRENCY = 'USD';
const PAYMENT_METHOD_WALLET = 'Wallet';
const PAYMENT_METHOD_PAYPAL = 'PayPal';
const PAYMENT_STATUS_COMPLETED = 'Completed';

const PUBLIC_PATH = 'public';
const ORDER_HTML_PATH = path.join(PUBLIC_PATH, 'Order', 'index.html');
const INFORMATION_HTML_PATH = path.join(PUBLIC_PATH, 'information', 'index.html');

const CACHE_KEY_PREFIX_MENU_ITEM = 'menu_item:';
const CACHE_KEY_PREFIX_REVIEWS = 'reviews:';
const CACHE_KEY_PREFIX_MENU_ITEM_RATINGS = 'menu_item_ratings:';
const CACHE_KEY_MENU_ITEMS_AVAILABLE = 'menu_items:available';
const CACHE_KEY_DAILY_MENU_AVAILABLE = 'daily_menu:available';
const CACHE_KEY_USER_USERNAME = 'user:username:';
const CACHE_KEY_ORDER = 'order:';
const CACHE_KEY_USER_ORDERS = 'user:orders:';
const CACHE_KEY_STUDENT_WALLET = 'student:wallet_balance:';
const CACHE_KEY_STUDENT_TRANSACTIONS = 'student:transactions:';
const CACHE_KEY_STUDENT_LOYALTY = 'student:loyalty:';
const CACHE_KEY_STUDENT_ORDER_HISTORY = 'student:order_history:';
const CACHE_KEY_INVENTORY_ITEM = 'inventory:item:';
const CACHE_KEY_WALLET_USER = 'wallet:user:';
const CACHE_KEY_ORDER_PUBLIC = 'order:';

const getSessionUser = req => req.session?.user || null;
const getUserId = req => getSessionUser(req)?.id || null;
const getIpAddress = req => req.ip || req.connection?.remoteAddress || 'unknown';
const sendUnauthorized = (res, message = 'Authentication required') => res.status(401).json({ error: message });
const requireAuth = (req, res, next) => {
    if (!getSessionUser(req)) {
        return sendUnauthorized(res, 'Login required to place an order');
    }
    next();
};

const isEditorUser = req => getSessionUser(req)?.usertype?.toString().toLowerCase() === 'editor';
const denyEditorOrderPlacement = (req, res, next) => {
    if (isEditorUser(req)) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Editor accounts may view orders but cannot create purchases.'
        });
    }
    next();
};

const sanitizeText = value => typeof value === 'string' ? value.trim() : value;
const sendJsonError = (res, status, error, message) => res.status(status).json({ error, message, timestamp: new Date().toISOString() });
const logSecurityEvent = async (userId, ipAddress, action, type, details) => {
    try {
        await createSecurityLog({ userId, ipAddress, action, type, details });
    } catch (logError) {
        console.error('Failed to log security event:', logError);
    }
};

const containsProfanity = (text) => {
    if (!text || typeof text !== 'string') return false;
    const words = text.toLowerCase().split(/\s+/);
    const bannedWords = [
        ...badwords.array.map(word => word.toLowerCase()),
        ...Object.values(naughtiness).flat().map(word => word.toLowerCase())
    ];

    return words.some(word => bannedWords.some(badWord => levenshtein.get(word, badWord) < PROFANITY_DISTANCE_THRESHOLD));
};

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

// Sanitize all incoming order-related requests
router.use(hpp(), mongoSanitize(), xss());

// Rate limiting middleware using Redis Lua service
async function rateLimit(req, res, next) {
  try {
    const key = `ratelimit:orders:${req.session.user?.id || req.ip}`;
    const rateLimitResult = await redisLuaService.checkRateLimit(key, RATE_LIMIT_WINDOW_SECONDS, RATE_LIMIT_MAX_REQUESTS); // 20 requests per minute

    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Too many requests, please try again later.',
        retryAfter: RATE_LIMIT_WINDOW_SECONDS
      });
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': Math.max(0, RATE_LIMIT_MAX_REQUESTS - 1 - rateLimitResult.currentCount).toString(),
      'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW_SECONDS
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
    const rateLimitResult = await redisLuaService.checkRateLimit(key, REVIEW_RATE_LIMIT_WINDOW_SECONDS, REVIEW_RATE_LIMIT_MAX_REQUESTS); // 5 reviews per 15 minutes

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
        retryAfter: REVIEW_RATE_LIMIT_WINDOW_SECONDS
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
    res.sendFile(path.join(process.cwd(), ORDER_HTML_PATH));
});

router.get('/item_information/:itemName', (req, res) => {
    res.sendFile(path.join(process.cwd(), INFORMATION_HTML_PATH));
});

// Apply rate limiting to all API endpoints (not static HTML serves)
router.use(['/username', '/menu_items', '/order', '/order/wallet', '/item_information'], rateLimit);

// API endpoints for ORDER MANAGEMENT

router.post('/item_information/:itemName/Review', [
    reviewRateLimit,
    body('rating').isInt({ min: RATING_MIN, max: RATING_MAX }).withMessage(`Rating must be an integer between ${RATING_MIN} and ${RATING_MAX}`),
    body('comment').isLength({ min: COMMENT_MIN_LENGTH, max: COMMENT_MAX_LENGTH }).trim().withMessage(`Comment must be between ${COMMENT_MIN_LENGTH} and ${COMMENT_MAX_LENGTH} characters`)
], async (req, res) => {
    const userId = getUserId(req);
    const ipAddress = getIpAddress(req);

    if (!userId) {
        await logSecurityEvent(null, ipAddress, 'REVIEW_NOT_AUTHENTICATED', 'AUTHENTICATION_ERROR', 'Anonymous user attempted to submit a review');
        return sendUnauthorized(res, 'Login required to submit reviews');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        await createSecurityLog({
            userId,
            ipAddress,
            action: 'REVIEW_VALIDATION_FAILED',
            type: 'VALIDATION_ERROR',
            details: 'Review validation errors: ' + errors.array().map(e => e.msg).join(', ')
        });
        return res.status(400).json({ errors: errors.array() });
    }

    const { itemName } = req.params;
    const { rating, comment } = req.body;
    const normalizedComment = sanitizeText(comment);

    if (containsProfanity(normalizedComment)) {
        await createSecurityLog({
            userId,
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
            menuItem = await MenuItems.findOne({ name: itemName }).lean();
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
        
        if (userId) {
            const existingReview = menuItem.reviews?.find(
                review => review.userId && review.userId.toString() === userId
            );
            if (existingReview) {
                await createSecurityLog({
                    userId,
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
            userId,
            rating,
            comment: normalizedComment,
            date: new Date(),
            ipAddress
        };

        menuItem.reviews.push(newReview);

        // Compute new average before saving
        const totalRatings = menuItem.reviews.length;
        menuItem.averageRating = totalRatings > 0
            ? parseFloat((menuItem.reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(AVERAGE_RATING_DECIMALS))
            : DEFAULT_AVERAGE_RATING;

        await menuItem.save();
        
        // Invalidate relevant caches
        if (invalidateCache) {
            invalidateCache([
                `${CACHE_KEY_PREFIX_MENU_ITEM}${itemName}`,
                CACHE_KEY_MENU_ITEMS_AVAILABLE,
                `${CACHE_KEY_PREFIX_REVIEWS}${itemName}`,
                `${CACHE_KEY_PREFIX_MENU_ITEM_RATINGS}${menuItem._id}`
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
    const userId = getUserId(req);
    if (!userId) {
        return sendUnauthorized(res, 'Login required to report review');
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
        review.reportedCount = (review.reportedCount || DEFAULT_REPORTED_COUNT) + 1;

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
    const userId = getUserId(req);
    if (!userId) {
        return sendUnauthorized(res);
    }
    const cacheKey = `${CACHE_KEY_USER_USERNAME}${userId}`;

    try {
        // Try to get from cache first
        if (getCached) {
            const cachedUsername = await getCached(cacheKey);
            if (cachedUsername) {
                return res.json(cachedUsername);
            }
        }

        // Fetch from database
        const user = await User.findById(userId).select('username').lean();
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const result = { username: user.username };

        // Cache the result
        if (setCached) {
            await setCached(cacheKey, result, CACHE_TTL_USERNAME); // Cache for 5 minutes
        }

        res.json(result);
    } catch (error) {
        console.error('Error fetching username:', error);
    }
});


router.get('/menu_items', async (req, res) => {
    try {
        const cacheKey = CACHE_KEY_MENU_ITEMS_AVAILABLE;

        if (getCached) {
            const cached = await getCached(cacheKey);
            if (cached) return res.json(cached);
        }

        const menuItems = await MenuItems.find({ available: true })
            .select('name price description category healthScore averageRating stock available reviews')
            .populate('reviews.userId', 'username')
            .lean();

        if (setCached) await setCached(cacheKey, menuItems, CACHE_TTL_MENU_ITEMS); // 30-second TTL

        res.json(menuItems);
    }
    catch (error) {
        console.error('Error fetching menu items:', error);
        const ipAddress = getIpAddress(req);
        await logSecurityEvent(getUserId(req), ipAddress, 'MENU_ITEMS_FETCH_ERROR', 'SYSTEM_ERROR', `Database error during menu items fetch: ${error.message}`);
        sendJsonError(res, 500, 'Server error', 'Unable to fetch menu items');
    }
});


router.post('/order', validateOrderInput, requireAuth, denyEditorOrderPlacement, async (req, res) => {
    // Extract order details from request body
    const { cart } = req.body;
    const ipAddress = getIpAddress(req);
    const userId = getUserId(req);
    
    try {
        // Calculate total amount from cart items
        let totalAmount = 0;
        const orderItems = [];

        for (const item of cart) {
            // Atomically check stock availability
            const menuItem = await MenuItems.findOneAndUpdate(
                { _id: item.menuItemId, available: true, stock: { $gte: item.quantity } },
                {}, // No update, just check condition
                { new: true, lean: true }
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
            userId: userId,
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
                CACHE_KEY_MENU_ITEMS_AVAILABLE,
                CACHE_KEY_DAILY_MENU_AVAILABLE
            ]);
        }

        // Log successful order creation
        await logSecurityEvent(userId, ipAddress, 'ORDER_CREATED', 'SUCCESS', `Order created successfully: ${savedOrder._id}, amount: ${totalAmount}`);

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
        await logSecurityEvent(userId, ipAddress, 'ORDER_CREATION_ERROR', 'SYSTEM_ERROR', `Database error during order creation: ${error.message}`);

        sendJsonError(res, 500, 'Internal Server Error', 'Failed to create order');
    }
});

// Process order with wallet payment (atomic operation)
router.post('/order/wallet', validateOrderInput, requireAuth, denyEditorOrderPlacement, async (req, res) => {
    const { cart } = req.body;
    const ipAddress = getIpAddress(req);

    const userId = getUserId(req);
    // Check if user is logged in
    if (!userId) {
        await logSecurityEvent(null, ipAddress, 'WALLET_ORDER_FAILED', 'AUTHENTICATION_ERROR', 'Unauthenticated wallet payment attempt');
        return sendUnauthorized(res, 'User must be logged in to use wallet payment');
    }

    try {
        // Calculate total amount and validate items
        let totalAmount = 0;
        const orderItems = [];
        const inventoryChecks = [];

        for (const item of cart) {
            const menuItem = await MenuItems.findById(item.menuItemId).lean();
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
        const walletKey = `${CACHE_KEY_WALLET_USER}${userId}`;
        let currentBalance;

        try {
            currentBalance = await redisLuaService.getWalletBalance(walletKey);
            if (currentBalance === null || currentBalance === undefined) {
                const user = await User.findById(userId).select('balance').lean();
                currentBalance = user ? user.balance || DEFAULT_BALANCE : DEFAULT_BALANCE;
            }
        } catch (redisError) {
            // Fallback to database
            const user = await User.findById(userId).select('balance').lean();
            currentBalance = user ? user.balance || DEFAULT_BALANCE : DEFAULT_BALANCE;
        }

        if (currentBalance < totalAmount) {
            return res.status(400).json({
                error: 'Insufficient wallet balance',
                required: totalAmount,
                available: currentBalance
            });
        }

        // Create order record first
        const orderKey = `${CACHE_KEY_ORDER_PUBLIC}${Date.now()}:${userId}`;
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

            await User.findByIdAndUpdate(userId, { balance: result.newBalance });

            // Update order status to completed
            savedOrder.status = 'Completed';
            savedOrder.pickupTime = new Date();
            await savedOrder.save();

            // Create payment record
            const payment = new Payment({
                userId: userId,
                amount: totalAmount,
                currency: DEFAULT_CURRENCY,
                paymentMethod: PAYMENT_METHOD_WALLET,
                status: PAYMENT_STATUS_COMPLETED,
                transactionId: `wallet_${Date.now()}`
            });
            await payment.save();

            // Award loyalty points
            try {
                const userLoyalty = await UserLoyalty.findOne({ userId }).lean();
                let currentTier = 'NONE';
                if (userLoyalty) {
                    currentTier = userLoyalty.userTier;
                }

                let totalPoints = 0;
                for (const item of order.items) {
                    const menuItem = await MenuItems.findById(item.menuItemId).lean();
                    const healthLevel = getHealthLevel(menuItem.healthScore);
                    const itemTotal = menuItem.price * item.quantity; // Calculate dollar amount for this item
                    const points = ConvertPoints(itemTotal, currentTier, healthLevel, new Date());
                    totalPoints += points;
                }

                await UserLoyalty.updatePointsAtomically(userId, totalPoints, 'wallet_order_completion');

                // Invalidate caches
                if (invalidateCache) {
                    invalidateCache([
                        `${CACHE_KEY_STUDENT_WALLET}${userId}`,
                        `${CACHE_KEY_STUDENT_TRANSACTIONS}${userId}`,
                        `${CACHE_KEY_STUDENT_LOYALTY}${userId}`,
                        `${CACHE_KEY_STUDENT_ORDER_HISTORY}${userId}`
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
    const ipAddress = getIpAddress(req);
    const userId = getUserId(req);
    
    try {
        // Input validation
        if (typeof orderID !== 'string' || !orderID.trim()) {
            await logSecurityEvent(userId, ipAddress, 'ORDER_STATUS_UPDATE_FAILED', 'VALIDATION_ERROR', 'Invalid order ID format');
            return sendJsonError(res, 400, 'Invalid order ID', 'Order ID must be a valid string');
        }
        
        // Validate status
        const validStatuses = VALID_ORDER_STATUSES;
        if (!validStatuses.includes(status)) {
            await logSecurityEvent(userId, ipAddress, 'ORDER_STATUS_UPDATE_FAILED', 'VALIDATION_ERROR', `Invalid status: ${status}`);
            return sendJsonError(res, 400, 'Invalid status', `Status must be one of: ${validStatuses.join(', ')}`);
        }

        // Update order status
        const updatedOrder = await Order.findByIdAndUpdate(
            orderID,
            { 
                status: status,
                ...(status === 'Completed' && { pickupTime: new Date() })
            },
            { new: true, lean: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // If payment is completed, save payment record
        if (status === PAYMENT_STATUS_COMPLETED && paymentDetails) {
            const payment = new Payment({
                userId: updatedOrder.userId,
                amount: updatedOrder.totalAmount,
                currency: paymentDetails.currency || DEFAULT_CURRENCY,
                paymentMethod: paymentDetails.method || PAYMENT_METHOD_PAYPAL,
                status: PAYMENT_STATUS_COMPLETED,
                transactionId: paymentDetails.transactionId
            });
            await payment.save();
        }
        
        // Invalidate order cache
        if (invalidateCache) {
            invalidateCache([
                `${CACHE_KEY_ORDER}${orderID}`,
                `${CACHE_KEY_USER_ORDERS}${updatedOrder.userId}`
            ]);
        }
        
        // Log successful status update
        await logSecurityEvent(userId, ipAddress, 'ORDER_STATUS_UPDATED', 'SUCCESS', `Order ${orderID} status updated to ${status}`);

        res.json({
            success: true,
            order: updatedOrder,
            message: `Order status updated to ${status}`
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        
        // Log security error
        await logSecurityEvent(userId, ipAddress, 'ORDER_STATUS_UPDATE_ERROR', 'SYSTEM_ERROR', `Database error during status update: ${error.message}`);
        
        sendJsonError(res, 500, 'Internal Server Error', 'Failed to update order status');
    }
});



// Capture PayPal payment and update order
router.post('/:orderID/capture',
    hpp(), // Prevent HTTP Parameter Pollution
    mongoSanitize(), // Prevent NoSQL injection
    async (req, res) => {
    const { orderID } = req.params;
    const ipAddress = getIpAddress(req);
    const userId = getUserId(req);
    
    try {
        // Input validation
        if (typeof orderID !== 'string' || !orderID.trim()) {
            await logSecurityEvent(userId, ipAddress, 'PAYMENT_CAPTURE_FAILED', 'VALIDATION_ERROR', 'Invalid order ID format');
            return sendJsonError(res, 400, 'Invalid order ID', 'Order ID must be a valid string');
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
              const inventoryKey = `${CACHE_KEY_INVENTORY_ITEM}${item.menuItemId._id}`;
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
                  const updatedItem = await MenuItems.findById(item.menuItemId._id).lean();
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
                currency: DEFAULT_CURRENCY,
                paymentMethod: PAYMENT_METHOD_PAYPAL,
                status: PAYMENT_STATUS_COMPLETED,
                transactionId: paypalCapture.jsonResponse.id
            });
            await payment.save();

            // Award loyalty points if user is logged in
            if (order.userId) {
                const userLoyalty = await UserLoyalty.findOne({ userId: order.userId }).lean();
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
                        `${CACHE_KEY_STUDENT_LOYALTY}${order.userId}`,
                        `${CACHE_KEY_ORDER}${order._id}`,
                        `${CACHE_KEY_USER_ORDERS}${order.userId}`,
                        CACHE_KEY_MENU_ITEMS_AVAILABLE,
                        CACHE_KEY_DAILY_MENU_AVAILABLE
                    ]);
                }
            }
            
            // Log successful payment capture
            await logSecurityEvent(order.userId, ipAddress, 'PAYMENT_CAPTURED', 'SUCCESS', `PayPal payment captured for order: ${order._id}, amount: ${order.totalAmount}`);

            // Return the PayPal capture response (frontend expects this format)
            res.json(paypalCapture.jsonResponse);
        } else {
            await logSecurityEvent(userId, ipAddress, 'PAYMENT_CAPTURE_FAILED', 'PAYMENT_ERROR', `PayPal capture failed with status: ${paypalCapture.httpStatusCode}`);
            
            res.status(paypalCapture.httpStatusCode).json({
                success: false,
                error: 'Payment capture failed',
                details: paypalCapture.jsonResponse
            });
        }

    } catch (error) {
        console.error('Error capturing payment:', error);
        
        // Log security error
        await logSecurityEvent(userId, ipAddress, 'PAYMENT_CAPTURE_ERROR', 'SYSTEM_ERROR', `System error during payment capture: ${error.message}`);
        
        sendJsonError(res, 500, 'Internal Server Error', 'Failed to capture payment');
    }
});

router.get('/:orderID',
    hpp(), // Prevent HTTP Parameter Pollution
    mongoSanitize(), // Prevent NoSQL injection
    async (req, res) => {
    const { orderID } = req.params;
    const cacheKey = `${CACHE_KEY_ORDER}${orderID}`;
    const ipAddress = getIpAddress(req);
    const userId = getUserId(req);
    
    try {
        // Input validation
        if (typeof orderID !== 'string' || !orderID.trim()) {
            await logSecurityEvent(userId, ipAddress, 'ORDER_LOOKUP_FAILED', 'VALIDATION_ERROR', 'Invalid order ID format');
            return sendJsonError(res, 400, 'Invalid order ID', 'Order ID must be a valid string');
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
        await logSecurityEvent(userId, ipAddress, 'ORDER_LOOKUP_ERROR', 'SYSTEM_ERROR', `Database error during order lookup: ${error.message}`);
        
        sendJsonError(res, 500, 'Internal Server Error', 'Failed to fetch order');
    }
}); 

router.get('/DailyMenu', cacheResult(CACHE_KEY_DAILY_MENU_AVAILABLE, CACHE_TTL_DAILY_MENU), async (req, res) => {
    try {
        // If not in cache, fetch from database
        const menuItems = await MenuItems.find({ available: true })
            .select('name price description category healthScore averageRating stock available reviews')
            .lean();
        
        res.json(menuItems);
    }
    catch (error) {
        console.error('Error fetching daily menu:', error);
        const ipAddress = getIpAddress(req);
        await logSecurityEvent(getUserId(req), ipAddress, 'DAILY_MENU_FETCH_ERROR', 'SYSTEM_ERROR', `Database error during daily menu fetch: ${error.message}`);
        sendJsonError(res, 500, 'Server error', 'Unable to fetch daily menu');
    }
});






module.exports = router;

