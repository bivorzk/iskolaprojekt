const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');
const stats = require('simple-statistics');

// Connect to MongoDB

const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

router.use(express.urlencoded({ extended: true }));

const { User } = require('../../src/database');
const { Payment, LoyaltyProgram, MenuItems, Order, OrderItems } = require('../../config/database_queries');

mongoose.connect(dbUrl + dbName)
  .then(() => console.log('Connected to MongoDB for dashboard'))
  .catch(err => console.error('Could not connect to MongoDB for user auth', err));


// Admin permission middleware
function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.IsLoggedIn) {
    return res.status(401).send('Unauthorized: No session available');
  }
  if (req.session.user.usertype !== 'admin') {
    return res.status(403).send('No admin rights');
  }
  next();
}

// Apply middleware to all /admin routes
router.use('/admin', requireAdmin);

// Serve admin dashboard
router.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/dashboard/admin.html'));
});


router.get('/admin/usercount', async (req, res) => {
  try {
    const count = await User.countDocuments({});
    res.json({ total: count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/userlist', async (req, res) => {
  try {
    const users = await User.find({}, 'username email usertype createdAt');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/stats', async (req, res) => {
  try {
    const users = await User.find({}, 'createdAt');
    const creationDates = users.map(user => user.createdAt.getTime());
    const statsData = {
      mean: stats.mean(creationDates),
      median: stats.median(creationDates),
      standardDeviation: stats.standardDeviation(creationDates)
    };
    res.json(statsData);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/signup-stats', async (req, res) => {
  try {
    const stats = await User.aggregate([
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
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/orders', async (req, res) => {
  try {
    const count = await Order.countDocuments({});
    res.json({ total: count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/soldout', async (req, res) => {
  try {
    const soldOutItems = await MenuItems.find({ available: false }, 'name available');
    res.json(soldOutItems);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// REMINDER TO Implement this in admin route 

router.get('/admin/itemcount', async (req, res) => {
  try {
    const count = await MenuItems.countDocuments({});
    res.json({ total: count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});



router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/dashboard/dashboard.html'));
});



module.exports = router;