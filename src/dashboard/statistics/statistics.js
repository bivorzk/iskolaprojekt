const express = require('express');
const router = express.Router();
const stats = require('simple-statistics');

const { User } = require('../../../src/database');
const { Order } = require('../../../config/database_queries');

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

// Most bought items all time

router.get('/stats/most_bought_items', cacheResult('admin:most_bought_items_alltime', 300), async (req, res) => {
  try {
    const mostBoughtItems = await Order.aggregate([
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.menuItemId",
                totalQuantity: { $sum: "$items.quantity" }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: "menuitems",
                localField: "_id",
                foreignField: "_id",
                as: "itemDetails"
            }
        },
        {
            $unwind: {
                path: "$itemDetails",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                totalQuantity: 1,
                itemName: "$itemDetails.name",
                itemPrice: "$itemDetails.price"
            }
        }
    ]);
    res.json(mostBoughtItems);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Most bought items last week

router.get('/stats/most_bought_items-lastweek', cacheResult('admin:most_bought_items_lastweek', 300), async (req, res) => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    console.log('Fetching most bought items from:', oneWeekAgo);

    const mostBoughtItems = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: oneWeekAgo }
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.menuItemId",
          totalQuantity: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "menuitems",
          localField: "_id",
          foreignField: "_id",
          as: "itemDetails"
        }
      },
      {
        $unwind: {
          path: "$itemDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          totalQuantity: 1,
          itemName: "$itemDetails.name",
          itemPrice: "$itemDetails.price"
        }
      }
    ]);

    console.log('Most bought items result:', mostBoughtItems);
    res.json(mostBoughtItems);
  } catch (error) {
    console.error('Error fetching most bought items:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Revenue last month

router.get('/stats/revenue-lastmonth', cacheResult('admin:revenue_lastmonth', 300), async (req, res) => {
  try {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const revenueData = await Order.aggregate([
        {
            $match: {
                orderDate: { $gte: oneMonthAgo },
                status: 'Completed'
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: "$orderDate" },
                    month: { $month: "$orderDate" },
                    day: { $dayOfMonth: "$orderDate" },
                },
                totalRevenue: { $sum: "$totalAmount" }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);
    res.json(revenueData);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Average order value

router.get('/stats/average-order-value', cacheResult('admin:average_order_value', 300), async (req, res) => {
  try {
    const averageOrderValueData = await Order.aggregate([
        {
            $match: {
                status: 'Completed'
            }
        },
        {
            $group: {
                _id: null,
                averageOrderValue: { $avg: "$totalAmount" }
            }
        }
    ]);
    res.json(averageOrderValueData);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stats/total-revenue', cacheResult('admin:total_revenue', 300), async (req, res) => {
  try {
    const totalRevenueData = await Order.aggregate([
        {
            $match: {
                status: 'Completed'
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" }
            }
        }
    ]);
    res.json(totalRevenueData);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});



module.exports = router;