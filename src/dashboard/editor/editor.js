const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const path = require('path');
const { User } = require('../../../src/database');
const { Payment, MenuItems, Order, UserLoyalty, Reward, Redemption } = require('../../../config/database_queries');

// Import shared services
const { cacheResult, invalidateCache } = require('../services/cache-service');
const { createDashboardRateLimiter } = require('../middleware/rate-limit-middleware');

// Import auth middleware
const { requireEditor } = require('../middleware/auth-middleware');

let redisClient = null;
try {
  const { redisClient: client } = require('../../redis');
  redisClient = client;
} catch (error) {
  console.log('Redis not available in editor dashboard:', error.message);
}

function isRedisAvailable() {
  return redisClient && redisClient.isOpen;
}

// Apply middleware to all editor routes
router.use('/', requireEditor);
router.use('/', createDashboardRateLimiter({ prefix: 'editor', windowSeconds: 60, maxRequests: 20 }));

// Serve editor dashboard
router.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '../../../public/dashboard/editor/editor.html'));
});

// API endpoints for EDITOR DASHBOARD

// Basic stats endpoints (similar to admin but limited)
router.get('/usercount', cacheResult('editor:usercount', 300), async (req, res) => {
  try {
    const count = await User.countDocuments({});
    res.status(202).json({ total: count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/orders', cacheResult('editor:orders', 300), async (req, res) => {
  try {
    const count = await Order.countDocuments({});
    res.status(202).json({ total: count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/itemcount', cacheResult('editor:itemcount', 300), async (req, res) => {
  try {
    const count = await MenuItems.countDocuments({});
    res.status(202).json({ total: count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/totalpoints', cacheResult('editor:totalpoints', 300), async (req, res) => {
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

router.get('/activeusers', cacheResult('editor:activeusers', 300), async (req, res) => {
  try {
    const activeUsers = await User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
    res.status(202).json({ activeUsers });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Menu item management (same as admin)
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
        'editor:menulist',
        'editor:itemcount',
        'admin:menulist', // Also invalidate admin cache
        'admin:itemcount'
      ]);

      res.status(202).json({ message: 'Menu item created' });
    } catch (error) {
      console.error('Error creating menu item:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.get('/menulist', cacheResult('editor:menulist', 300), async (req, res) => {
  try {
    const menuItems = await MenuItems.find({}).lean();
    res.status(202).json({ menuItems });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

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
    invalidateCache(['editor:menulist', 'admin:menulist']);
    res.status(202).json({ message: 'Menu item updated', item: updatedItem });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/menuitem/:id', async (req, res) => {
  try {
    const deletedItem = await MenuItems.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    // Invalidate caches
    invalidateCache(['editor:menulist', 'editor:itemcount', 'admin:menulist', 'admin:itemcount']);
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reward management (same as admin)
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

      invalidateCache([
        'editor:rewards_list',
        'editor:reward_stats',
        'admin:rewards_list',
        'admin:reward_stats'
      ]);

      res.status(201).json({ message: 'Reward created successfully', reward });
    } catch (error) {
      console.error('Error creating reward:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.get('/rewards_list', cacheResult('editor:rewards_list', 300), async (req, res) => {
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

    invalidateCache(['editor:rewards_list', 'editor:reward_stats', 'admin:rewards_list', 'admin:reward_stats']);
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

    invalidateCache(['editor:rewards_list', 'editor:reward_stats', 'admin:rewards_list', 'admin:reward_stats']);
    res.json({ message: 'Reward deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reward_stats', cacheResult('editor:reward_stats', 300), async (req, res) => {
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

router.get('/welcome-message', (req, res) => {
  try {
    const username = req.session.user.username;
      res.status(202).json({ message: `Welcome, ${username}` });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Editor: userinfo (for dashboard switcher) ─────────────────────────────────
router.get('/userinfo', async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('username email usertype createdAt isVerified').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ username: user.username, email: user.email, usertype: user.usertype, createdAt: user.createdAt, isVerified: user.isVerified });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;