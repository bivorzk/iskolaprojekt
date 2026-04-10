const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const path = require('path');
const { User } = require('../../../src/database');
const { Payment, MenuItems, Order, UserLoyalty, Reward, Redemption, SecurityLogs } = require('../../../config/database_queries');
const { requireAdmin } = require('../middleware/auth-middleware');
const { createDashboardRateLimiter } = require('../middleware/rate-limit-middleware');

// Import shared services
const { cacheResult, invalidateCache } = require('../services/cache-service');

// Import Redis Lua service for atomic operations and rate limiting
const redisLuaService = require('../../services/redis-lua-service');

// Import shared utilities
const { sendSuccess, sendError, handleValidationErrors } = require('../shared/responses');
const { serveDashboard } = require('../shared/dashboard-utils');

// Import shared welcome message handler
const { getWelcomeMessage } = require('../shared/welcome');

let redisClient = null;
try {
  const { redisClient: client } = require('../../redis');
  redisClient = client;
} catch (error) {
  console.log('Redis not available in admin dashboard:', error.message);
}

function isRedisAvailable() {
  return redisClient && redisClient.isOpen;
}

// Apply middleware to all admin routes
router.use('/', requireAdmin);
router.use('/', createDashboardRateLimiter({ prefix: 'admin', windowSeconds: 60, maxRequests: 30 }));

// Serve admin dashboard
router.get('/', serveDashboard('admin'));

// API endpoints for ADMIN DASHBOARD

router.get('/usercount', cacheResult('admin:usercount', 300), async (req, res) => {
  try {
    const count = await User.countDocuments({});
    sendSuccess(res, { total: count });
  } catch (error) {
    sendError(res);
  }
});

router.get('/userlist', cacheResult('admin:userlist', 300), async (req, res) => {
  try {
    const users = await User.find({}, 'username email usertype createdAt isBanned isVerified balance lastActive')
    .lean();
    sendSuccess(res, { users });
  } catch (error) {
    sendError(res);
  }
});

router.get('/user/:id', async (req, res) => {
  try {
    if (!req.params.id.match(/^[a-f\d]{24}$/i)) {
      return sendError(res, 'Invalid user ID', 400);
    }
    const user = await User.findById(req.params.id, 'username email usertype createdAt isBanned isVerified balance lastActive').lean();
    if (!user) return sendError(res, 'User not found', 404);
    sendSuccess(res, { user }, 200);
  } catch (error) {
    sendError(res);
  }
});

router.patch('/user/:id/ban',
  [
    body('isBanned').isBoolean(),
    body('banReason').optional().trim().escape().isLength({ max: 300 })
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      if (!req.params.id.match(/^[a-f\d]{24}$/i)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      const target = await User.findById(req.params.id, 'usertype').lean();
      if (!target) return res.status(404).json({ error: 'User not found' });
      if (target.usertype === 'admin') {
        return res.status(403).json({ error: 'Cannot ban another admin' });
      }
      const updated = await User.findByIdAndUpdate(
        req.params.id,
        { isBanned: req.body.isBanned },
        { new: true, select: 'username email usertype isBanned' }
      ).lean();
      invalidateCache(['admin:userlist']);
      sendSuccess(res, { message: `User ${req.body.isBanned ? 'banned' : 'unbanned'} successfully`, user: updated }, 200);
    } catch (error) {
      sendError(res);
    }
  }
);

router.patch('/user/:id/role',
  [
    body('usertype').isIn(['student', 'parent', 'teacher', 'frozen', 'editor'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      if (!req.params.id.match(/^[a-f\d]{24}$/i)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      const target = await User.findById(req.params.id, 'usertype').lean();
      if (!target) return res.status(404).json({ error: 'User not found' });
      if (target.usertype === 'admin') {
        return res.status(403).json({ error: 'Cannot change role of another admin' });
      }
      const updated = await User.findByIdAndUpdate(
        req.params.id,
        { usertype: req.body.usertype },
        { new: true, select: 'username email usertype isBanned' }
      ).lean();
      invalidateCache(['admin:userlist']);
      res.status(200).json({ message: 'Role updated successfully', user: updated });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.get('/security-logs', cacheResult((req) => `admin:securitylogs:${req.query.userId || 'all'}`, 120), async (req, res) => {
  try {
    const filter = {};
    const userId = req.query.userId;
    if (userId) {
      if (!userId.match(/^[a-f\d]{24}$/i)) {
        return res.status(400).json({ error: 'Invalid user ID filter' });
      }
      filter.userId = userId;
    }

    const logs = await SecurityLogs.find(filter)
      .populate('userId', 'username email usertype isBanned')
      .sort({ Timestamp: -1 })
      .limit(200)
      .lean();

    res.status(200).json({ logs });
  } catch (error) {
    console.error('Error fetching security logs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reported-menuitems', cacheResult('admin:reported-menuitems', 120), async (req, res) => {
  try {
    const menuItems = await MenuItems.find({ 'reviews.reported': true })
      .select('name category price available reviews._id reviews.reported reviews.rating reviews.comment reviews.reportedCount reviews.userId')
      .populate('reviews.userId', 'username')
      .lean();

    const reportedItems = menuItems.map((item) => ({
      _id: item._id,
      name: item.name,
      category: item.category,
      price: item.price,
      available: item.available,
      reportedReviews: (item.reviews || [])
        .filter((review) => review.reported)
        .map((review) => ({
          _id: review._id ? review._id.toString() : null,
          rating: review.rating,
          comment: review.comment,
          reportCount: review.reportCount,
          reportedCount: review.reportedCount,
          user: review.userId ? { username: review.userId.username } : null
        }))
    }));

    res.status(200).json({ reportedItems });
  } catch (error) {
    console.error('Error fetching reported menu items:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/security-logs/:id', async (req, res) => {
  try {
    const logId = req.params.id;
    if (!logId.match(/^[a-f\d]{24}$/i)) {
      return res.status(400).json({ error: 'Invalid log ID' });
    }

    const deletedLog = await SecurityLogs.findByIdAndDelete(logId);
    if (!deletedLog) {
      return res.status(404).json({ error: 'Security log not found' });
    }

    invalidateCache(['admin:securitylogs:all']);
    if (deletedLog.userId) {
      invalidateCache([`admin:securitylogs:${deletedLog.userId.toString()}`]);
    }

    res.status(200).json({ message: 'Security log removed successfully' });
  } catch (error) {
    console.error('Error removing security log:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/orders', cacheResult('admin:orders', 300), async (req, res) => {
  try {
    const count = await Order.countDocuments({});
    res.status(202).json({ total: count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/soldout', cacheResult('admin:soldout', 300), async (req, res) => {
  try {
    const soldOutItems = await MenuItems.find({ available: false }, 'name available').lean();
    res.status(202).json({ soldOutItems });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/itemcount', cacheResult('admin:itemcount', 300), async (req, res) => {
  try {
    const count = await MenuItems.countDocuments({});
    res.status(202).json({ total: count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Total points across all users
router.get('/totalpoints', cacheResult('admin:totalpoints', 300), async (req, res) => {
  try {
    const result = await UserLoyalty.aggregate([
      { $group: { _id: null, totalPoints: { $sum: "$totalPoints" } } }
    ]);
    const totalPoints = result[0] ? result[0].totalPoints : 0;
    res.status(202).json({ totalPoints });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


router.post(
  '/create_menuitem',
  [
    body('id').optional().trim().notEmpty(),
    body('name').trim().escape().isLength({ min: 1, max: 100 }),
    body('description').trim().escape().isLength({ max: 500 }),
    body('stock').isInt({ min: 0 }).toInt(),
    body('price').isFloat({ min: 0 }).toFloat(),
    body('category').trim().escape(),
    body('allergens').optional().isArray(),
    body('nutritionalInfo').optional().isObject(),
    body('healthScore').optional().isInt({ min: 0, max: 100 }).toInt()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        id,
        name,
        description,
        stock,
        price,
        category,
        allergens,
        nutritionalInfo,
        healthScore
      } = req.body;

      const menuItemData = {
        name,
        description,
        stock,
        price,
        category,
        allergens,
        nutritionalInfo,
        healthScore
      };

      // Only set _id if id is provided
      if (id) {
        menuItemData._id = id;
      }

      await MenuItems.create(menuItemData);

      invalidateCache([
        'admin:menulist',
        'admin:itemcount',
        'admin:menuitem_export',
        'admin:stockalerts',
        'admin:soldout'
      ]);

      res.status(202).json({ message: 'Menu item created' });
    } catch (error) {
      console.error('Error creating menu item:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.get('/menulist', cacheResult('admin:menulist', 300), async (req, res) => {
  try {
    const menuItems = await MenuItems.find({}).lean();
    res.status(202).json({ menuItems });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stockalerts', cacheResult('admin:stockalerts', 300), async (req, res) => {
  try {
    const lowStockItems = await MenuItems.find({ stock: { $lt: 5 } }, 'name stock').lean();
    res.json(lowStockItems);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a menu item (PUT)
router.put('/menuitem/:id', async (req, res) => {
  try {
    const {
      name,
      description,
      stock,
      price,
      category,
      allergens,
      nutritionalInfo,
      healthScore,
      available
    } = req.body;
    const updatedItem = await MenuItems.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        stock,
        price,
        category,
        allergens,
        nutritionalInfo,
        healthScore,
        available
      },
      { new: true }
    ).lean();
    if (!updatedItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    // Invalidate caches
    invalidateCache(['admin:menulist', 'admin:menuitem_export', 'admin:stockalerts', 'admin:soldout']);
    res.status(202).json({ message: 'Menu item updated', item: updatedItem });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/delete_menuitem/:id', async (req, res) => {
  try {
    const deletedItem = await MenuItems.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    // Invalidate caches
    invalidateCache(['admin:menulist', 'admin:itemcount', 'admin:menuitem_export', 'admin:stockalerts', 'admin:soldout']);
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/menuitem_export', cacheResult('admin:menuitem_export', 300), async (req, res) => {
  try {
    const menuItems = await MenuItems.find({}).lean();
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Resolve a reported review
router.patch('/menu-items/:menuItemId/reviews/:reviewId/resolve-report', async (req, res) => {
  try {
    const { menuItemId, reviewId } = req.params;

    if (!menuItemId.match(/^[a-f\d]{24}$/i) || !reviewId.match(/^[a-f\d]{24}$/i)) {
      return res.status(400).json({ error: 'Invalid IDs' });
    }

    // Find the menu item and update the specific review
    const menuItem = await MenuItems.findOneAndUpdate(
      { _id: menuItemId, 'reviews._id': reviewId },
      {
        $set: {
          'reviews.$.reported': false,
          'reviews.$.reportedCount': 0
        }
      },
      { new: true }
    );

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item or review not found' });
    }

    invalidateCache(['admin:reported-menuitems']);
    res.status(200).json({ message: 'Report resolved successfully' });
  } catch (error) {
    console.error('Error resolving report:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/menu-items/:menuItemId/reviews/:reviewId', async (req, res) => {
  try {
    const { menuItemId, reviewId } = req.params;

    if (!menuItemId.match(/^[a-f\d]{24}$/i) || !reviewId.match(/^[a-f\d]{24}$/i)) {
      return res.status(400).json({ error: 'Invalid IDs' });
    }

    const menuItem = await MenuItems.findOne({ _id: menuItemId, 'reviews._id': reviewId });
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item or review not found' });
    }

    menuItem.reviews = (menuItem.reviews || []).filter(
      (review) => review._id.toString() !== reviewId
    );

    const totalRatings = menuItem.reviews.length;
    menuItem.averageRating = totalRatings > 0
      ? parseFloat((menuItem.reviews.reduce((sum, review) => sum + review.rating, 0) / totalRatings).toFixed(1))
      : 0;

    await menuItem.save();

    invalidateCache(['admin:reported-menuitems', 'admin:menulist', 'admin:menuitem_export']);
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reward Management Endpoints

router.post(
  '/create_reward',
  [
    body('name').trim().escape().isLength({ min: 1, max: 100 }),
    body('description').optional().trim().escape().isLength({ max: 500 }),
    body('category').isIn(['drink', 'fruit', 'dessert', 'meal', 'upgrade', 'mystery', 'token']),
    body('pointCost').isInt({ min: 1 }),
    body('marketValue').isFloat({ min: 0 }),
    body('healthScore').optional().isInt({ min: 0, max: 100 }),
    body('minTier').optional().isIn(['none', 'Bronze', 'Silver', 'Gold', 'Platinum']),
    body('dailyStockLimit').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        name,
        description,
        category,
        pointCost,
        marketValue,
        healthScore,
        minTier,
        dailyStockLimit,
        availableFrom,
        availableUntil
      } = req.body;

      const reward = await Reward.create({
        name,
        description,
        category,
        pointCost,
        marketValue,
        healthScore: healthScore || 0,
        minTier: minTier || 'none',
        dailyStockLimit,
        availableFrom: availableFrom ? new Date(availableFrom) : undefined,
        availableUntil: availableUntil ? new Date(availableUntil) : undefined
      });

      invalidateCache(['admin:rewards_list', 'admin:reward_stats']);

      res.status(201).json({ message: 'Reward created successfully', reward });
    } catch (error) {
      console.error('Error creating reward:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.get('/rewards_list', cacheResult('admin:rewards_list', 300), async (req, res) => {
  try {
    const rewards = await Reward.find({}).lean();
    res.status(200).json({ rewards });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/reward/:id', async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      pointCost,
      marketValue,
      healthScore,
      minTier,
      dailyStockLimit,
      isActive,
      availableFrom,
      availableUntil
    } = req.body;

    const updatedReward = await Reward.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        category,
        pointCost,
        marketValue,
        healthScore,
        minTier,
        dailyStockLimit,
        isActive,
        availableFrom: availableFrom ? new Date(availableFrom) : undefined,
        availableUntil: availableUntil ? new Date(availableUntil) : undefined
      },
      { new: true }
    ).lean();

    if (!updatedReward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    invalidateCache(['admin:rewards_list', 'admin:reward_stats']);
    res.status(200).json({ message: 'Reward updated successfully', reward: updatedReward });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/reward/:id', async (req, res) => {
  try {
    const deletedReward = await Reward.findByIdAndDelete(req.params.id);
    if (!deletedReward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    invalidateCache(['admin:rewards_list', 'admin:reward_stats']);
    res.json({ message: 'Reward deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reward_stats', cacheResult('admin:reward_stats', 300), async (req, res) => {
  try {
    const totalRewards = await Reward.countDocuments({});
    const activeRewards = await Reward.countDocuments({ isActive: true });
    const totalRedemptions = await Redemption.countDocuments({});
    const pendingRedemptions = await Redemption.countDocuments({ status: 'pending' });

    res.status(200).json({
      totalRewards,
      activeRewards,
      totalRedemptions,
      pendingRedemptions
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/activeusers', cacheResult('admin:activeusers', 300), async (req, res) => {
  try {
    const activeUsers = await User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
    res.status(202).json({ activeUsers });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/paymentstats', cacheResult('admin:paymentstats', 300), async (req, res) => {
  try {
    const paymentStats = await Payment.aggregate([
      { $match: { currency: "USD" } },
      { $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);
    const totalAmount = paymentStats.reduce((sum, stat) => sum + stat.totalAmount, 0);
    res.json({ totalAmount });
  }catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/welcome-message', getWelcomeMessage);

router.get('/health', cacheResult('system:health', 30), async (req, res) => {
  const healthResults = {
    overall: 'ok',
    timestamp: new Date().toISOString(),
    services: {},
    details: {}
  };

  let hasErrors = false;

  try {
    await mongoose.connection.db.admin().ping();
    healthResults.services.database = 'healthy';
    healthResults.details.database = 'MongoDB connection established and responding';
  } catch (error) {
    healthResults.services.database = 'unhealthy';
    healthResults.details.database = `Database error: ${error.message}`;
    hasErrors = true;
  }

  try {
    if (isRedisAvailable()) {
      await redisClient.ping();
      healthResults.services.redis = 'healthy';
      healthResults.details.redis = 'Redis connection established and responding';
    } else {
      healthResults.services.redis = 'unavailable';
      healthResults.details.redis = 'Redis client not available or not connected';
    }
  } catch (error) {
    healthResults.services.redis = 'unhealthy';
    healthResults.details.redis = `Redis error: ${error.message}`;
    hasErrors = true;
  }

  try {
    const userCount = await User.countDocuments({});
    healthResults.services.userModel = 'healthy';
    healthResults.details.userModel = `User model accessible (${userCount} users)`;

    const menuItemsCount = await MenuItems.countDocuments({});
    healthResults.services.menuModel = 'healthy';
    healthResults.details.menuModel = `MenuItems model accessible (${menuItemsCount} items)`;

    const orderCount = await Order.countDocuments({});
    healthResults.services.orderModel = 'healthy';
    healthResults.details.orderModel = `Order model accessible (${orderCount} orders)`;


    const paymentCount = await Payment.countDocuments({});
    healthResults.services.paymentModel = 'healthy';
    healthResults.details.paymentModel = `Payment model accessible (${paymentCount} payments)`;

    const loyaltyCount = await UserLoyalty.countDocuments({});
    healthResults.services.loyaltyModel = 'healthy';
    healthResults.details.loyaltyModel = `UserLoyalty model accessible (${loyaltyCount} loyalty records)`;
  } catch (error) {
    healthResults.services.models = 'unhealthy';
    healthResults.details.models = `Database model error: ${error.message}`;
    hasErrors = true;
  }

  try {
    const activeUsers = await User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
    const availableItems = await MenuItems.countDocuments({ available: true });
    const lowStockItems = await MenuItems.countDocuments({ stock: { $lt: 5 } });

    healthResults.services.adminEndpoints = 'healthy';
    healthResults.details.adminEndpoints = `Admin functions operational (${activeUsers} active users, ${availableItems} available items, ${lowStockItems} low stock alerts)`;
  } catch (error) {
    healthResults.services.adminEndpoints = 'unhealthy';
    healthResults.details.adminEndpoints = `Admin endpoint error: ${error.message}`;
    hasErrors = true;
  }

  try {
    if (isRedisAvailable()) {
      const testKey = `health_check_test_${Date.now()}`;
      const rateLimitResult = await redisLuaService.checkRateLimit(testKey, 60, 100);
      
      healthResults.services.redisLua = 'healthy';
      healthResults.details.redisLua = `Redis Lua scripts operational (rate limit test: ${rateLimitResult.allowed ? 'allowed' : 'denied'})`;
      
      await redisClient.del(testKey);
    } else {
      healthResults.services.redisLua = 'degraded';
      healthResults.details.redisLua = 'Redis Lua scripts unavailable due to Redis connection issue';
    }
  } catch (error) {
    healthResults.services.redisLua = 'unhealthy';
    healthResults.details.redisLua = `Redis Lua error: ${error.message}`;
    hasErrors = true;
  }

  try {
    if (req.session) {
      healthResults.services.sessions = 'healthy';
      healthResults.details.sessions = 'Session system operational';
    } else {
      healthResults.services.sessions = 'unhealthy';
      healthResults.details.sessions = 'Session system not available';
      hasErrors = true;
    }
  } catch (error) {
    healthResults.services.sessions = 'unhealthy';
    healthResults.details.sessions = `Session error: ${error.message}`;
    hasErrors = true;
  }

  try {
    const cacheTestKey = `admin:health_test:${Date.now()}`;
    const testData = { test: 'data', timestamp: Date.now() };
    await redisClient.setEx(cacheTestKey, 60, JSON.stringify(testData));
    const retrieved = await redisClient.get(cacheTestKey);
    if (retrieved) {
      healthResults.services.caching = 'healthy';
      healthResults.details.caching = 'Cache set/get operations working';
      await redisClient.del(cacheTestKey);
    } else {
      throw new Error('Cache retrieval failed');
    }
  } catch (error) {
    healthResults.services.caching = 'unhealthy';
    healthResults.details.caching = `Cache error: ${error.message}`;
    hasErrors = true;
  }

  healthResults.services.externalServices = {};
  
  try {
    const hasPayPalConfig = process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET;
    
    let hasGooglePayConfig = false;
    try {
      const googlePayService = require('../../services/googlepay-service');
      // Check if Google Pay service functions are available
      hasGooglePayConfig = typeof googlePayService.createGooglePayOrder === 'function' && 
                          typeof googlePayService.completeGooglePayOrder === 'function';
    } catch (error) {
      hasGooglePayConfig = false;
    }
    
    healthResults.services.externalServices.paypal = hasPayPalConfig ? 'configured' : 'not_configured';
    healthResults.services.externalServices.googlepay = hasGooglePayConfig ? 'configured' : 'not_configured';
    healthResults.details.externalServices = `Payment service configurations checked - PayPal: ${hasPayPalConfig ? 'env vars present' : 'missing env vars'}, Google Pay: ${hasGooglePayConfig ? 'service available' : 'service unavailable'}`;
  } catch (error) {
    healthResults.services.externalServices = 'error';
    healthResults.details.externalServices = `External services check error: ${error.message}`;
  }

  if (hasErrors) {
    healthResults.overall = 'degraded';
  }

  if (healthResults.services.database === 'unhealthy' || 
      healthResults.services.sessions === 'unhealthy' ||
      healthResults.services.models === 'unhealthy') {
    healthResults.overall = 'unhealthy';
  }

  const healthyServices = Object.values(healthResults.services).filter(s => s === 'healthy').length;
  const totalServices = Object.keys(healthResults.services).length - 1; // Exclude nested externalServices
  healthResults.summary = `${healthyServices}/${totalServices} core services healthy`;

  const httpStatus = healthResults.overall === 'unhealthy' ? 500 : 
                    healthResults.overall === 'degraded' ? 206 : 200;

  res.status(httpStatus).json(healthResults);
});

// ── Admin: userinfo (for dashboard switcher) ──────────────────────────────────
router.get('/userinfo', async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('username email usertype createdAt isVerified').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ username: user.username, email: user.email, usertype: user.usertype, createdAt: user.createdAt, isVerified: user.isVerified });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Settings: 2FA status ──────────────────────────────────────────────────────
router.get('/settings/2fa/status', async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('is2Active').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ is2Active: user.is2Active === true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Settings: toggle 2FA ──────────────────────────────────────────────────────
router.post('/settings/2fa/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('is2Active');
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.is2Active = !user.is2Active;
    await user.save();
    res.json({ is2Active: user.is2Active });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Settings: get personal info ───────────────────────────────────────────────
router.get('/settings/personal-info', async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('userPersonalInfo');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const info = user.userPersonalInfo && user.userPersonalInfo[0] ? user.userPersonalInfo[0].toObject() : {};
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Settings: save personal info ─────────────────────────────────────────────
router.post('/settings/personal-info', [
  body('firstName').trim().isLength({ min: 1, max: 50 }),
  body('lastName').trim().isLength({ min: 1, max: 50 }),
  body('dateOfBirth').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('school').optional({ nullable: true }).trim().isLength({ max: 100 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input', details: errors.array() });
  try {
    const userId = req.session.user.id;
    const { firstName, lastName, dateOfBirth, school, address } = req.body;
    const update = { firstName, lastName };
    if (dateOfBirth) update.dateOfBirth = new Date(dateOfBirth);
    if (school) update.school = school;
    if (address) update.address = address;

    await User.updateOne(
      { _id: userId },
      { $set: { 'userPersonalInfo': [{ userId, ...update }] } }
    );
    invalidateCache(['admin:userinfo']);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;