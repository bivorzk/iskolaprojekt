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
router.use(express.json());

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
function requireStudent(req, res, next) {
  if (!req.session.user || !req.session.user.IsLoggedIn) {
    return res.status(401).send('Unauthorized: No session available');
  }
  req.session.user.usertype != 'student' || 'admin' ? next() : res.status(403).send('Access denied for student accounts');
}


// Apply middleware to all /admin routes
router.use('/admin', requireAdmin);
router.use('/student', requireStudent);


// Serve admin dashboard
router.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/dashboard/admin/admin.html'));
});
// Serve student dashboard
router.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/dashboard/student/student.html'));
});


// API endpoints for ADMIN DASHBOARD


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

router.post('/admin/create_menuitem', async (req, res) => {
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

    res.json({ message: 'Menu item created' });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/admin/menulist', async (req, res) => {
  try {
    const menuItems = await MenuItems.find({});
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/stockalerts', async (req, res) => {
  try {
    const lowStockItems = await MenuItems.find({ stock: { $lt: 5 } }, 'name stock');
    res.json(lowStockItems);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a menu item (PUT)
router.put('/admin/menuitem/:id', async (req, res) => {
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
    res.json({ message: 'Menu item updated', item: updatedItem });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/admin/delete_menuitem/:id', async (req, res) => {
  try {
    const deletedItem = await MenuItems.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/menuitem_export', async (req, res) => {
  try {
    const menuItems = await MenuItems.find({});
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/paymentstats', async (req, res) => {
  try {
    const paymentStats = await Payment.aggregate([
      { $group: {
          _id: "$paymentMethod", 
          count: { $sum: 1 },
          currency: { $first: "$currency" }
        },
        $group: {
          _id: "$currency",
           totalAmount: { $sum: "$amount" },
        }

      }
    ]);
    res.json(paymentStats);
  }
  catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/dashboard/dashboard.html'));
});

router.get('/admin/welcome-message', (req, res) => {
  try {
    const username = req.session.user.username;
    res.json({ message: `Welcome, ${username}` });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


// API endpoints for STUDENT DASHBOARD

router.get('/')

router.get('/student/freeze_account', async (req, res) => {
  try {
    const userId = req.session.user.id;
    await User.findByIdAndUpdate(userId, { accountFrozen: true });
    res.json({ message: 'Account has been frozen' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/student/parent/link', async (req, res) => {
  try {
    const studentId = req.session.user.id;
    const { parentEmail } = req.body;
    const parentUser = await User.findOne({ email: parentEmail, usertype: 'parent' });
    if (!parentUser) {
      return res.status(404).json({ error: 'Parent user not found' });
    }
    const existingLink = await ParentStudent.findOne({ parentId: parentUser._id, studentId });
    if (existingLink) {
      return res.status(400).json({ error: 'Link already exists' });
    }
    await ParentStudent.create({ parentId: parentUser._id, studentId });
    res.json({ message: 'Parent linked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/student/parent', async (req, res) => {
  try {
    const studentId = req.session.user.id;
    const parentStudentLink = await ParentStudent.findOne({ studentId }).populate('parentId', 'username email');

    if (!parentStudentLink) {
      return res.status(404).json({ error: 'Parent not found' });
    }
    res.json({ parent: parentStudentLink.parentId });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/student/welcome-message', (req, res) => {
  try {
    const username = req.session.user.username;
    res.json({ message: `Welcome, ${username}` });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/student/order_history' , async (req, res) => {
  try {
      const userId = req.session.user.id;


      const orders = await Order.find({ userId })
        .populate('items.menuItemId')
        .select('OrderDate totalAmount status items publicID orderDate'); 

      // Transform orders into a clean structure
      const orderData = orders.map(order => ({
        orderId: order.publicID,
        OrderDate: order.OrderDate,
        totalAmount: order.totalAmount,
        status: order.status,
        publicID: order.publicID,
        OrderDate: order.orderDate,
        items: order.items.map(item => ({
          name: item.menuItemId.name, 
          quantity: item.quantity
        }))
      }));

    res.json(orderData);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;