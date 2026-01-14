const express = require('express');
const router = express.Router();
const stats = require('simple-statistics');

const { User } = require('../../../src/database');

// Import shared services
const { cacheResult } = require('../services/cache-service');

// Admin permission middleware
function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.IsLoggedIn) {
    return res.sendFile(require('path').join(__dirname, '../../../public/no_perm/index.html'));
  }
  if (req.session.user.usertype !== 'admin') {
    return res.sendFile(require('path').join(__dirname, '../../../public/no_perm/index.html'));
  }
  next();
}

// Apply middleware to all statistics routes
router.use('/', requireAdmin);

// User statistics endpoints
router.get('/stats', cacheResult('admin:stats', 300), async (req, res) => {
  try {
    const users = await User.find({}, 'createdAt');
    const creationDates = users.map(user => user.createdAt.getTime());
    const statsData = {
      mean: stats.mean(creationDates),
      median: stats.median(creationDates),
      standardDeviation: stats.standardDeviation(creationDates)
    };
    res.status(202).json(statsData);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/signup-stats', cacheResult('admin:signup-stats', 300), async (req, res) => {
  try {
    const signupStats = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);
    res.json(signupStats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;