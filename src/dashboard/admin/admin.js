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

const ADMIN_CACHE_KEYS = {
  userCount: 'admin:usercount',
  userList: 'admin:userlist',
  securityLogs: 'admin:securitylogs:all',
  reportedMenuItems: 'admin:reported-menuitems',
  menuItemExport: 'admin:menuitem_export',
  menuList: 'admin:menulist',
  stockAlerts: 'admin:stockalerts',
  soldOut: 'admin:soldout',
  itemCount: 'admin:itemcount',
  totalPoints: 'admin:totalpoints',
  rewardsList: 'admin:rewards_list',
  rewardStats: 'admin:reward_stats',
  paymentStats: 'admin:paymentstats',
  activeUsers: 'admin:activeusers'
};

const USER_PROJECTION = 'username email usertype createdAt isBanned isVerified balance lastActive';

const isValidObjectId = (id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
const badRequest = (res, message = 'Invalid input') => sendError(res, message, 400);
const notFound = (res, message = 'Not found') => sendError(res, message, 404);
const serverError = (res, message = 'Server error') => sendError(res, message, 500);

const invalidateAdminCache = (keys) => {
  if (invalidateCache) {
    invalidateCache(keys);
  }
};

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
  const { id } = req.params;
  if (!isValidObjectId(id)) return badRequest(res, 'Invalid user ID');

  try {
    const user = await User.findById(id, USER_PROJECTION).lean();
    if (!user) return notFound(res, 'User not found');
    sendSuccess(res, { user }, 200);
  } catch (error) {
    serverError(res);
  }
});

router.patch('/user/:id/ban',
  [
    body('isBanned').isBoolean(),
    body('banReason').optional().trim().escape().isLength({ max: 300 })
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    const { id } = req.params;

    if (!isValidObjectId(id)) return badRequest(res, 'Invalid user ID');

    try {
      const target = await User.findById(id, 'usertype').lean();
      if (!target) return notFound(res, 'User not found');
      if (target.usertype === 'admin') {
        return sendError(res, 'Cannot ban another admin', 403);
      }

      const updated = await User.findByIdAndUpdate(
        id,
        { isBanned: req.body.isBanned },
        { new: true, select: 'username email usertype isBanned' }
      ).lean();

      invalidateAdminCache([ADMIN_CACHE_KEYS.userList]);
      sendSuccess(res, { message: `User ${req.body.isBanned ? 'banned' : 'unbanned'} successfully`, user: updated }, 200);
    } catch (error) {
      serverError(res);
    }
  }
);

router.patch('/user/:id/role',
  [
    body('usertype').isIn(['student', 'parent', 'teacher', 'frozen', 'editor'])
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    const { id } = req.params;

    if (!isValidObjectId(id)) return badRequest(res, 'Invalid user ID');

    try {
      const target = await User.findById(id, 'usertype').lean();
      if (!target) return notFound(res, 'User not found');
      if (target.usertype === 'admin') {
        return sendError(res, 'Cannot change role of another admin', 403);
      }

      const updated = await User.findByIdAndUpdate(
        id,
        { usertype: req.body.usertype },
        { new: true, select: 'username email usertype isBanned' }
      ).lean();

      invalidateAdminCache([ADMIN_CACHE_KEYS.userList]);
      sendSuccess(res, { message: 'Role updated successfully', user: updated }, 200);
    } catch (error) {
      serverError(res);
    }
  }
);

router.get('/security-logs', cacheResult((req) => `admin:securitylogs:${req.query.userId || 'all'}`, 120), async (req, res) => {
  try {
    const filter = {};
    const userId = req.query.userId;

    if (userId) {
      if (!isValidObjectId(userId)) return badRequest(res, 'Invalid user ID filter');
      filter.userId = userId;
    }

    const logs = await SecurityLogs.find(filter)
      .populate('userId', 'username email usertype isBanned')
      .sort({ Timestamp: -1 })
      .limit(200)
      .lean();

    sendSuccess(res, { logs }, 200);
  } catch (error) {
    console.error('Error fetching security logs:', error);
    serverError(res);
  }
});

router.get('/reported-menuitems', cacheResult(ADMIN_CACHE_KEYS.reportedMenuItems, 120), async (req, res) => {
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
          _id: review._id?.toString() || null,
          rating: review.rating,
          comment: review.comment,
          reportCount: review.reportCount,
          reportedCount: review.reportedCount,
          user: review.userId ? { username: review.userId.username } : null
        }))
    }));

    sendSuccess(res, { reportedItems }, 200);
  } catch (error) {
    console.error('Error fetching reported menu items:', error);
    serverError(res);
  }
});

router.delete('/security-logs/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return badRequest(res, 'Invalid log ID');

  try {
    const deletedLog = await SecurityLogs.findByIdAndDelete(id);
    if (!deletedLog) return notFound(res, 'Security log not found');

    invalidateAdminCache([ADMIN_CACHE_KEYS.securityLogs]);
    if (deletedLog.userId) {
      invalidateCache([`admin:securitylogs:${deletedLog.userId.toString()}`]);
    }

    sendSuccess(res, { message: 'Security log removed successfully' }, 200);
  } catch (error) {
    console.error('Error removing security log:', error);
    serverError(res);
  }
});

router.get('/orders', cacheResult('admin:orders', 300), async (req, res) => {
  try {
    const count = await Order.countDocuments({});
    sendSuccess(res, { total: count }, 200);
  } catch (error) {
    serverError(res);
  }
});

router.get('/soldout', cacheResult(ADMIN_CACHE_KEYS.soldOut, 300), async (req, res) => {
  try {
    const soldOutItems = await MenuItems.find({ available: false }, 'name available').lean();
    sendSuccess(res, { soldOutItems }, 200);
  } catch (error) {
    serverError(res);
  }
});

router.get('/itemcount', cacheResult(ADMIN_CACHE_KEYS.itemCount, 300), async (req, res) => {
  try {
    const count = await MenuItems.countDocuments({});
    sendSuccess(res, { total: count }, 200);
  } catch (error) {
    serverError(res);
  }
});

// Total points across all users
router.get('/totalpoints', cacheResult(ADMIN_CACHE_KEYS.totalPoints, 300), async (req, res) => {
  try {
    const [result] = await UserLoyalty.aggregate([
      { $group: { _id: null, totalPoints: { $sum: '$totalPoints' } } }
    ]);
    const totalPoints = result?.totalPoints ?? 0;
    sendSuccess(res, { totalPoints }, 200);
  } catch (error) {
    serverError(res);
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

router.get('/menulist', cacheResult(ADMIN_CACHE_KEYS.menuList, 300), async (req, res) => {
  try {
    const menuItems = await MenuItems.find({}).lean();
    sendSuccess(res, { menuItems }, 200);
  } catch (error) {
    serverError(res);
  }
});

router.get('/stockalerts', cacheResult(ADMIN_CACHE_KEYS.stockAlerts, 300), async (req, res) => {
  try {
    const lowStockItems = await MenuItems.find({ stock: { $lt: 5 } }, 'name stock').lean();
    sendSuccess(res, { lowStockItems }, 200);
  } catch (error) {
    serverError(res);
  }
});

// Update a menu item (PUT)
router.put('/menuitem/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return badRequest(res, 'Invalid menu item ID');

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
      id,
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
    if (!updatedItem) return notFound(res, 'Menu item not found');

    invalidateAdminCache([ADMIN_CACHE_KEYS.menuList, ADMIN_CACHE_KEYS.menuItemExport, ADMIN_CACHE_KEYS.stockAlerts, ADMIN_CACHE_KEYS.soldOut]);
    sendSuccess(res, { message: 'Menu item updated', item: updatedItem }, 200);
  } catch (error) {
    serverError(res);
  }
});

router.get('/delete_menuitem/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return badRequest(res, 'Invalid menu item ID');

  try {
    const deletedItem = await MenuItems.findByIdAndDelete(id);
    if (!deletedItem) return notFound(res, 'Menu item not found');

    invalidateAdminCache([ADMIN_CACHE_KEYS.menuList, ADMIN_CACHE_KEYS.itemCount, ADMIN_CACHE_KEYS.menuItemExport, ADMIN_CACHE_KEYS.stockAlerts, ADMIN_CACHE_KEYS.soldOut]);
    sendSuccess(res, { message: 'Menu item deleted' }, 200);
  } catch (error) {
    serverError(res);
  }
});

router.get('/menuitem_export', cacheResult(ADMIN_CACHE_KEYS.menuItemExport, 300), async (req, res) => {
  try {
    const menuItems = await MenuItems.find({}).lean();
    sendSuccess(res, { menuItems }, 200);
  } catch (error) {
    serverError(res);
  }
});

// Resolve a reported review
router.patch('/menu-items/:menuItemId/reviews/:reviewId/resolve-report', async (req, res) => {
  const { menuItemId, reviewId } = req.params;
  if (!isValidObjectId(menuItemId) || !isValidObjectId(reviewId)) return badRequest(res, 'Invalid IDs');

  try {
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

    if (!menuItem) return notFound(res, 'Menu item or review not found');

    invalidateAdminCache([ADMIN_CACHE_KEYS.reportedMenuItems]);
    sendSuccess(res, { message: 'Report resolved successfully' }, 200);
  } catch (error) {
    console.error('Error resolving report:', error);
    serverError(res);
  }
});

router.delete('/menu-items/:menuItemId/reviews/:reviewId', async (req, res) => {
  const { menuItemId, reviewId } = req.params;
  if (!isValidObjectId(menuItemId) || !isValidObjectId(reviewId)) return badRequest(res, 'Invalid IDs');

  try {
    const menuItem = await MenuItems.findOne({ _id: menuItemId, 'reviews._id': reviewId });
    if (!menuItem) return notFound(res, 'Menu item or review not found');

    menuItem.reviews = (menuItem.reviews || []).filter(
      (review) => review._id.toString() !== reviewId
    );

    const totalRatings = menuItem.reviews.length;
    menuItem.averageRating = totalRatings > 0
      ? parseFloat((menuItem.reviews.reduce((sum, review) => sum + review.rating, 0) / totalRatings).toFixed(1))
      : 0;

    await menuItem.save();

    invalidateAdminCache([ADMIN_CACHE_KEYS.reportedMenuItems, ADMIN_CACHE_KEYS.menuList, ADMIN_CACHE_KEYS.menuItemExport]);
    sendSuccess(res, { message: 'Review deleted successfully' }, 200);
  } catch (error) {
    console.error('Error deleting review:', error);
    serverError(res);
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

      invalidateAdminCache([ADMIN_CACHE_KEYS.rewardsList, ADMIN_CACHE_KEYS.rewardStats]);
      sendSuccess(res, { message: 'Reward created successfully', reward }, 201);
    } catch (error) {
      console.error('Error creating reward:', error);
      serverError(res);
    }
  }
);

router.get('/rewards_list', cacheResult(ADMIN_CACHE_KEYS.rewardsList, 300), async (req, res) => {
  try {
    const rewards = await Reward.find({}).lean();
    sendSuccess(res, { rewards }, 200);
  } catch (error) {
    serverError(res);
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
      return notFound(res, 'Reward not found');
    }

    invalidateAdminCache([ADMIN_CACHE_KEYS.rewardsList, ADMIN_CACHE_KEYS.rewardStats]);
    sendSuccess(res, { message: 'Reward updated successfully', reward: updatedReward }, 200);
  } catch (error) {
    serverError(res);
  }
});

router.delete('/reward/:id', async (req, res) => {
  try {
    const deletedReward = await Reward.findByIdAndDelete(req.params.id);
    if (!deletedReward) return notFound(res, 'Reward not found');

    invalidateAdminCache([ADMIN_CACHE_KEYS.rewardsList, ADMIN_CACHE_KEYS.rewardStats]);
    sendSuccess(res, { message: 'Reward deleted successfully' }, 200);
  } catch (error) {
    serverError(res);
  }
});

router.get('/reward_stats', cacheResult(ADMIN_CACHE_KEYS.rewardStats, 300), async (req, res) => {
  try {
    const totalRewards = await Reward.countDocuments({});
    const activeRewards = await Reward.countDocuments({ isActive: true });
    const totalRedemptions = await Redemption.countDocuments({});
    const pendingRedemptions = await Redemption.countDocuments({ status: 'pending' });

    sendSuccess(res, {
      totalRewards,
      activeRewards,
      totalRedemptions,
      pendingRedemptions
    }, 200);
  } catch (error) {
    serverError(res);
  }
});

router.get('/activeusers', cacheResult(ADMIN_CACHE_KEYS.activeUsers, 300), async (req, res) => {
  try {
    const activeUsers = await User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
    sendSuccess(res, { activeUsers }, 200);
  } catch (error) {
    serverError(res);
  }
});


router.get('/paymentstats', cacheResult(ADMIN_CACHE_KEYS.paymentStats, 300), async (req, res) => {
  try {
    const paymentStats = await Payment.aggregate([
      { $match: { currency: 'USD' } },
      { $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    const totalAmount = paymentStats.reduce((sum, stat) => sum + stat.totalAmount, 0);
    sendSuccess(res, { totalAmount }, 200);
  } catch (error) {
    serverError(res);
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

  const recordService = (name, status, detail) => {
    healthResults.services[name] = status;
    healthResults.details[name] = detail;
  };

  const timeoutPromise = (promise, ms, errorMessage) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMessage)), ms);
    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  const safeRedisCommand = async (commandFn, timeoutMs = 1500) => {
    if (!isRedisAvailable()) {
      throw new Error('Redis unavailable');
    }
    return timeoutPromise(commandFn(), timeoutMs, 'Redis operation timed out');
  };

  const runCheck = async (name, checkFn, fallbackStatus = 'unhealthy', fallbackDetail = 'Check failed') => {
    try {
      await checkFn();
      return true;
    } catch (error) {
      recordService(name, fallbackStatus, `${fallbackDetail}: ${error?.message || error}`);
      return false;
    }
  };

  await runCheck('database', async () => {
    await timeoutPromise(mongoose.connection.db.admin().ping(), 1500, 'Database ping timed out');
    recordService('database', 'healthy', 'MongoDB connection established and responding');
  }, 'unhealthy', 'Database error');

  if (isRedisAvailable()) {
    await runCheck('redis', async () => {
      await safeRedisCommand(() => redisClient.ping(), 1500);
      recordService('redis', 'healthy', 'Redis connection established and responding');
    }, 'unhealthy', 'Redis error');
  } else {
    recordService('redis', 'unavailable', 'Redis client not available or not connected');
  }

  await runCheck('models', async () => {
    const [userCount, menuItemsCount, orderCount, paymentCount, loyaltyCount] = await Promise.all([
      User.countDocuments({}),
      MenuItems.countDocuments({}),
      Order.countDocuments({}),
      Payment.countDocuments({}),
      UserLoyalty.countDocuments({})
    ]);

    recordService('userModel', 'healthy', `User model accessible (${userCount} users)`);
    recordService('menuModel', 'healthy', `MenuItems model accessible (${menuItemsCount} items)`);
    recordService('orderModel', 'healthy', `Order model accessible (${orderCount} orders)`);
    recordService('paymentModel', 'healthy', `Payment model accessible (${paymentCount} payments)`);
    recordService('loyaltyModel', 'healthy', `UserLoyalty model accessible (${loyaltyCount} loyalty records)`);
  }, 'unhealthy', 'Database model error');

  await runCheck('adminEndpoints', async () => {
    const [activeUsers, availableItems, lowStockItems] = await Promise.all([
      User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      MenuItems.countDocuments({ available: true }),
      MenuItems.countDocuments({ stock: { $lt: 5 } })
    ]);

    recordService('adminEndpoints', 'healthy', `Admin functions operational (${activeUsers} active users, ${availableItems} available items, ${lowStockItems} low stock alerts)`);
  }, 'unhealthy', 'Admin endpoint error');

  if (isRedisAvailable()) {
    await runCheck('redisLua', async () => {
      const testKey = `health_check_test_${Date.now()}`;
      const rateLimitResult = await safeRedisCommand(() => redisLuaService.checkRateLimit(testKey, 60, 100), 1500);
      await safeRedisCommand(() => redisClient.del(testKey), 1500);
      recordService('redisLua', 'healthy', `Redis Lua scripts operational (rate limit test: ${rateLimitResult.allowed ? 'allowed' : 'denied'})`);
    }, 'unhealthy', 'Redis Lua error');
  } else {
    recordService('redisLua', 'degraded', 'Redis Lua scripts unavailable due to Redis connection issue');
  }

  await runCheck('sessions', async () => {
    if (!req.session) {
      throw new Error('Session system not available');
    }
    recordService('sessions', 'healthy', 'Session system operational');
  }, 'unhealthy', 'Session error');

  if (isRedisAvailable()) {
    await runCheck('caching', async () => {
      const cacheTestKey = `admin:health_test:${Date.now()}`;
      const testData = { test: 'data', timestamp: Date.now() };
      await safeRedisCommand(() => redisClient.setEx(cacheTestKey, 60, JSON.stringify(testData)), 1500);
      const retrieved = await safeRedisCommand(() => redisClient.get(cacheTestKey), 1500);
      await safeRedisCommand(() => redisClient.del(cacheTestKey), 1500);

      if (!retrieved) {
        throw new Error('Cache retrieval failed');
      }

      recordService('caching', 'healthy', 'Cache set/get operations working');
    }, 'unhealthy', 'Cache error');
  } else {
    recordService('caching', 'degraded', 'Redis cache unavailable');
  }

  healthResults.services.externalServices = {};
  try {
    const hasPayPalConfig = Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
    let hasGooglePayConfig = false;

    try {
      const googlePayService = require('../../services/googlepay-service');
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

  const coreStatuses = Object.entries(healthResults.services)
    .filter(([key]) => key !== 'externalServices')
    .map(([, status]) => status);

  if (coreStatuses.includes('unhealthy')) {
    healthResults.overall = 'unhealthy';
  } else if (coreStatuses.some((status) => status !== 'healthy')) {
    healthResults.overall = 'degraded';
  }

  const healthyServices = coreStatuses.filter((status) => status === 'healthy').length;
  const totalServices = coreStatuses.length;
  healthResults.summary = `${healthyServices}/${totalServices} core services healthy`;

  const httpStatus = healthResults.overall === 'unhealthy' ? 500 : healthResults.overall === 'degraded' ? 206 : 200;
  res.status(httpStatus).json(healthResults);
});

// ── Admin: userinfo (for dashboard switcher) ──────────────────────────────────
router.get('/userinfo', async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id)
      .select('username email usertype createdAt isVerified')
      .lean();

    if (!user) return notFound(res, 'User not found');
    sendSuccess(res, {
      username: user.username,
      email: user.email,
      usertype: user.usertype,
      createdAt: user.createdAt,
      isVerified: user.isVerified
    }, 200);
  } catch (e) {
    serverError(res);
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
  if (handleValidationErrors(req, res)) return;

  try {
    const userId = req.session.user.id;
    const { firstName, lastName, dateOfBirth, school, address } = req.body;
    const update = { firstName, lastName };
    if (dateOfBirth) update.dateOfBirth = new Date(dateOfBirth);
    if (school) update.school = school;
    if (address) update.address = address;

    await User.updateOne(
      { _id: userId },
      { $set: { userPersonalInfo: [{ userId, ...update }] } }
    );
    invalidateCache(['admin:userinfo']);
    sendSuccess(res, { success: true }, 200);
  } catch (e) {
    serverError(res);
  }
});

module.exports = router;