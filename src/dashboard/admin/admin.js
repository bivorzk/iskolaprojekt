const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const path = require('path');
const { User } = require('../../../src/database');
const { Payment, MenuItems, Order, UserLoyalty, Reward, Redemption } = require('../../../config/database_queries');
const { requireAdmin } = require('../middleware/auth-middleware');

// Import shared services
const { cacheResult, invalidateCache } = require('../services/cache-service');

// Import Redis Lua service for atomic operations and rate limiting
const redisLuaService = require('../../services/redis-lua-service');

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

// Rate limiting middleware using Redis Lua service
async function rateLimit(req, res, next) {
  try {
    const key = `ratelimit:admin:${req.session.user?.id || req.ip}`;
    const rateLimitResult = await redisLuaService.checkRateLimit(key, 60, 30); // 30 requests per minute

    if (!rateLimitResult.allowed) {
      return res.status(429).sendFile(path.join(__dirname, '../../../public/429/429.html'));
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': '30',
      'X-RateLimit-Remaining': Math.max(0, 29 - rateLimitResult.currentCount),
      'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 60
    });

    next();
  } catch (error) {
    console.log('Rate limiting failed, allowing request:', error.message);
    next(); // Allow request if rate limiting fails
  }
}

// Apply middleware to all admin routes
router.use('/', requireAdmin);
router.use('/', rateLimit); // Apply rate limiting to all admin routes

// Serve admin dashboard
router.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '../../../public/dashboard/admin/admin.html'));
});

// API endpoints for ADMIN DASHBOARD

router.get('/usercount', cacheResult('admin:usercount', 300), async (req, res) => {
  try {
    const count = await User.countDocuments({});
    res.status(202).json({ total: count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/userlist', cacheResult('admin:userlist', 300), async (req, res) => {
  try {
    const users = await User.find({}, 'username email usertype createdAt isBanned isVerified balance lastActive');
    res.status(202).json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/user/:id', async (req, res) => {
  try {
    if (!req.params.id.match(/^[a-f\d]{24}$/i)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const user = await User.findById(req.params.id, 'username email usertype createdAt isBanned isVerified balance lastActive');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/user/:id/ban',
  [
    body('isBanned').isBoolean(),
    body('banReason').optional().trim().escape().isLength({ max: 300 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      if (!req.params.id.match(/^[a-f\d]{24}$/i)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      const target = await User.findById(req.params.id, 'usertype');
      if (!target) return res.status(404).json({ error: 'User not found' });
      if (target.usertype === 'admin') {
        return res.status(403).json({ error: 'Cannot ban another admin' });
      }
      const updated = await User.findByIdAndUpdate(
        req.params.id,
        { isBanned: req.body.isBanned },
        { new: true, select: 'username email usertype isBanned' }
      );
      invalidateCache(['admin:userlist']);
      res.status(200).json({ message: `User ${req.body.isBanned ? 'banned' : 'unbanned'} successfully`, user: updated });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
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
      const target = await User.findById(req.params.id, 'usertype');
      if (!target) return res.status(404).json({ error: 'User not found' });
      if (target.usertype === 'admin') {
        return res.status(403).json({ error: 'Cannot change role of another admin' });
      }
      const updated = await User.findByIdAndUpdate(
        req.params.id,
        { usertype: req.body.usertype },
        { new: true, select: 'username email usertype isBanned' }
      );
      invalidateCache(['admin:userlist']);
      res.status(200).json({ message: 'Role updated successfully', user: updated });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

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
    const soldOutItems = await MenuItems.find({ available: false }, 'name available');
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
    const menuItems = await MenuItems.find({});
    res.status(202).json({ menuItems });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stockalerts', cacheResult('admin:stockalerts', 300), async (req, res) => {
  try {
    const lowStockItems = await MenuItems.find({ stock: { $lt: 5 } }, 'name stock');
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
    );
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
    const menuItems = await MenuItems.find({});
    res.json(menuItems);
  } catch (error) {
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
    const rewards = await Reward.find({});
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
    );

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

router.get('/welcome-message', (req, res) => {
  try {
    const username = req.session.user.username;
      res.status(202).json({ message: `Welcome, ${username}` });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

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
    const user = await User.findById(req.session.user.id).select('username email usertype createdAt isVerified');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ username: user.username, email: user.email, usertype: user.usertype, createdAt: user.createdAt, isVerified: user.isVerified });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Settings: 2FA status ──────────────────────────────────────────────────────
router.get('/settings/2fa/status', async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('is2Active');
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