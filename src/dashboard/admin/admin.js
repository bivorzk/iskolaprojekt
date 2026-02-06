const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const path = require('path');
const { User } = require('../../../src/database');
const { Payment, MenuItems, Order, UserLoyalty } = require('../../../config/database_queries');

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

// Admin permission middleware
function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.IsLoggedIn) {
    return res.status(403).sendFile(path.join(__dirname, '../../../public/no_perm/index.html'));
  }
  if (req.session.user.usertype !== 'admin') {
    return res.status(403).sendFile(path.join(__dirname, '../../../public/no_perm/index.html'));
  }
  next();
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
    const users = await User.find({}, 'username email usertype createdAt');
    res.status(202).json({ users });
  } catch (error) {
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
    body('id').trim().notEmpty(),
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

      await MenuItems.create({
        _id: id,
        name,
        description,
        stock,
        price,
        category,
        allergens,
        nutritionalInfo,
        healthScore
      });

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

// Health check endpoint for admin dashboard
router.get('/health', async (req, res) => {
  try {
    // Optional: check MongoDB connection
    await mongoose.connection.db.admin().ping();
    res.status(200).json({ status: 'ok', message: 'Admin dashboard is healthy' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database not reachable' });
  }
});

module.exports = router;