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


let redisClient = null 
console.log('Dashboard.js module loaded - checking Redis connection...');
try {
  const { redisClient: client } = require('../redis');
  redisClient = client;
} catch (error) {
  console.log('Redis not available in dashboard.js:', error.message);
}

// Function to check if Redis is currently available
function isRedisAvailable() {
  return redisClient && redisClient.isOpen;
}



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
  // Allow both students and admins to access student routes
  if (req.session.user.usertype === 'student' || req.session.user.usertype === 'admin') {
    next();
  } else {
    res.status(403).send('Access denied: Student or Admin access required');
  }
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
  console.log('Student dashboard accessed - Redis status:', { isRedisAvailable: isRedisAvailable(), hasClient: !!redisClient });
  res.sendFile(path.join(__dirname, '../../public/dashboard/student/student.html'));
});


// API endpoints for ADMIN DASHBOARD


router.get('/admin/usercount', async (req, res) => {
  try {
    const cacheKey = 'admin:usercount';
    if (isRedisAvailable()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.status(202).json(JSON.parse(cached));
      }
    }
    const count = await User.countDocuments({});
    const data = { total: count };
    if (isRedisAvailable()) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(data)); // Cache for 5 minutes
    }
      res.status(202).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/userlist', async (req, res) => {
  try {
    const cacheKey = 'admin:userlist';
    if (isRedisAvailable()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.status(202).json(JSON.parse(cached));
      }
    }
    const users = await User.find({}, 'username email usertype createdAt');
    const data = { users };
    if (isRedisAvailable()) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(data));
    }
      res.status(202).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/stats', async (req, res) => {
  try {
    const cacheKey = 'admin:stats';
    if (isRedisAvailable()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.status(202).json(JSON.parse(cached));
      }
    }
    const users = await User.find({}, 'createdAt');
    const creationDates = users.map(user => user.createdAt.getTime());
    const statsData = {
      mean: stats.mean(creationDates),
      median: stats.median(creationDates),
      standardDeviation: stats.standardDeviation(creationDates)
    };
    if (isRedisAvailable()) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(statsData));
    }
      res.status(202).json(statsData);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/signup-stats', async (req, res) => {
  try {
    const cacheKey = 'admin:signup-stats';
    if (isRedisAvailable()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.status(202).json(JSON.parse(cached));
      }
    }
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
    if (isRedisAvailable()) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(stats));
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/orders', async (req, res) => {
  try {
    const cacheKey = 'admin:orders';
    if (isRedisAvailable()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.status(202).json(JSON.parse(cached));
      }
    }
    const count = await Order.countDocuments({});
    const data = { total: count };
    if (isRedisAvailable()) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(data));
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/soldout', async (req, res) => {
  try {
    const cacheKey = 'admin:soldout';
    if (isRedisAvailable()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.status(202).json(JSON.parse(cached));
      }
    }
    const soldOutItems = await MenuItems.find({ available: false }, 'name available');
    const data = { soldOutItems };
    if (isRedisAvailable()) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(data));
    }
      res.status(202).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});



router.get('/admin/itemcount', async (req, res) => {
  try {
    const cacheKey = 'admin:itemcount';
    if (isRedisAvailable()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.status(202).json(JSON.parse(cached));
      }
    }
    const count = await MenuItems.countDocuments({});
    const data = { total: count };
    if (isRedisAvailable()) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(data));
    }
      res.status(202).json(data);
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

    // Invalidate caches
    if (isRedisAvailable()) {
      await redisClient.del(['admin:menulist', 'admin:itemcount', 'admin:menuitem_export', 'admin:stockalerts', 'admin:soldout']);
    }

      res.status(202).json({ message: 'Menu item created' });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/admin/menulist', async (req, res) => {
  try {
    const cacheKey = 'admin:menulist';
    if (isRedisAvailable()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.status(202).json(JSON.parse(cached));
      }
    }
    const menuItems = await MenuItems.find({});
    const data = { menuItems };
    if (isRedisAvailable()) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(data));
    }
      res.status(202).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/stockalerts', async (req, res) => {
  try {
    const cacheKey = 'admin:stockalerts';
    if (isRedisAvailable()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }
    const lowStockItems = await MenuItems.find({ stock: { $lt: 5 } }, 'name stock');
    if (isRedisAvailable()) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(lowStockItems));
    }
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
    // Invalidate caches
    if (isRedisAvailable()) {
      await redisClient.del(['admin:menulist', 'admin:menuitem_export', 'admin:stockalerts', 'admin:soldout']);
    }
      res.status(202).json({ message: 'Menu item updated', item: updatedItem });
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
    // Invalidate caches
    if (isRedisAvailable()) {
      await redisClient.del(['admin:menulist', 'admin:itemcount', 'admin:menuitem_export', 'admin:stockalerts', 'admin:soldout']);
    }
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/menuitem_export', async (req, res) => {
  try {
    const cacheKey = 'admin:menuitem_export';
    if (isRedisAvailable()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }
    const menuItems = await MenuItems.find({});
    if (isRedisAvailable()) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(menuItems));
    }
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/paymentstats', async (req, res) => {
  try {
    const cacheKey = 'admin:paymentstats';
    if (isRedisAvailable()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }
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
    if (isRedisAvailable()) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(paymentStats));
    }
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
      res.status(202).json({ message: `Welcome, ${username}` });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check endpoint for admin dashboard
router.get('/admin/health', async (req, res) => {
  try {
    // Optional: check MongoDB connection
    await mongoose.connection.db.admin().ping();
    res.status(200).json({ status: 'ok', message: 'Admin dashboard is healthy' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database not reachable' });
  }
});

// API endpoints for STUDENT DASHBOARD

router.get('/student/freeze_account', async (req, res) => {
  try {
    const userId = req.session.user.id;
    await User.findByIdAndUpdate(userId, { user_type: 'frozen' });
      res.status(202).json({ message: 'Account has been frozen' });
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
      res.status(202).json({ message: 'Parent linked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/student/parent', async (req, res) => {
  try {
    const studentId = req.session.user.id;
    const parentStudentLink = await ParentStudent.findOne({ studentId }).populate('parentId', 'username email');

    if (!parentStudentLink) {
      return res.status(404).json({ error: 'Parent not found' });
    }
      res.status(202).json({ parent: parentStudentLink.parentId });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/student/parent/unlink', async (req, res) => {
  try {
    const studentId = req.session.user.id;
    await ParentStudent.findOneAndDelete({ studentId });
      res.status(202).json({ message: 'Parent unlinked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/student/transactions', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const transactions = await Payment.find({ userId }).sort({ date: -1 });
      res.status(202).json({ transactions });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/student/welcome-message', (req, res) => {
  try {
    const username = req.session.user.username;
      res.status(202).json({ message: `Welcome, ${username}` });
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


      // Transform orders into a clean structure with correct fields
      const orderData = orders.map(order => ({
        orderId: order.publicID,
        orderDate: order.OrderDate || order.orderDate,
        totalAmount: order.totalAmount,
        status: order.status,
        items: order.items.map(item => ({
          name: item.menuItemId?.name || '',
          quantity: item.quantity
        }))
      }));

    res.status(202).json({ orderData });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/student/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Student dashboard is healthy' });
});

// Debug endpoint to check database and session
router.get('/student/debug', async (req, res) => {
  try {
    const session = req.session.user;
    const dbConnection = mongoose.connection.readyState;
    
    let userFromDb = null;
    if (session && session.id) {
      userFromDb = await User.findById(session.id);
    }
    
    res.status(200).json({
      session: session ? { id: session.id, username: session.username, usertype: session.usertype } : null,
      dbConnection: dbConnection === 1 ? 'connected' : 'disconnected',
      userExists: !!userFromDb,
      userBalance: userFromDb ? userFromDb.walletBalance : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get wallet balance
router.get('/student/wallet/balance', async (req, res) => {
  try {
    const userId = req.session.user.id;
    console.log('Getting balance for user:', userId);
    
    const user = await User.findById(userId).select('balance');
    
    if (!user) {
      console.log('User not found for balance request');
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('User balance retrieved:', user.balance);
    
    // Initialize balance if it doesn't exist
    if (user.balance === undefined || user.balance === null) {
      user.balance = 0;
      await user.save();
      console.log('Initialized user balance to 0');
    }
    
    res.status(200).json({ 
      balance: user.balance || 0,
      success: true
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Add money to wallet
router.post('/student/wallet/add', async (req, res) => {
  try {
    // Check session first
    if (!req.session.user || !req.session.user.id) {
      console.log('No valid session found');
      return res.status(401).json({ error: 'No valid session' });
    }
    
    const userId = req.session.user.id;
    const { amount, currency, paymentMethod, transactionId } = req.body;
    
    console.log('Wallet add request:', { userId, amount, currency, paymentMethod, transactionId });
    console.log('Session user:', req.session.user);
    
    // Validate input
    if (!amount || amount <= 0) {
      console.log('Invalid amount:', amount);
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    if (!paymentMethod) {
      console.log('Missing payment method');
      return res.status(400).json({ error: 'Payment method required' });
    }
    
    // Convert amount to USD for storage (if needed)
    let usdAmount = parseFloat(amount);
    if (currency === 'HUF') {
      usdAmount = amount * 0.0027; // Simple conversion rate
    } else if (currency === 'EUR') {
      usdAmount = amount * 1.1; // Simple conversion rate
    }
    
    console.log('Converted amount:', { original: amount, currency, usd: usdAmount });
    
    // Check if user exists first
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      console.log('User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('User found:', { id: existingUser._id, currentBalance: existingUser.balance });
    
    // Ensure balance field exists, initialize if needed
    if (existingUser.balance === undefined || existingUser.balance === null) {
      console.log('Balance field missing, initializing to 0');
      await User.findByIdAndUpdate(userId, { balance: 0 });
      existingUser.balance = 0;
    }
    
    // Update user wallet balance
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: usdAmount } },
      { new: true, upsert: false }
    );
    
    console.log('User wallet updated:', { userId, newBalance: user.balance });
    
    // Verify the update by reading the user again
    const verifyUser = await User.findById(userId).select('balance');
    console.log('Verification after update:', { userId, verifiedBalance: verifyUser.balance });
    
    // Create payment record
    try {
      const paymentData = {
        userId,
        amount: usdAmount,
        currency: 'USD',
        paymentMethod,
        transactionId: transactionId || 'wallet_' + Date.now(),
        status: 'Completed'
      };
      
      console.log('Creating payment record:', paymentData);
      
      const paymentRecord = await Payment.create(paymentData);
      console.log('Payment record created successfully:', paymentRecord._id);
    } catch (paymentError) {
      console.error('Error creating payment record:', paymentError);
      // Continue even if payment record fails, wallet is already updated
    }
    
    res.status(200).json({ 
      message: 'Money added successfully',
      newBalance: verifyUser.balance || 0,
      addedAmount: usdAmount,
      success: true,
      debug: {
        originalAmount: amount,
        convertedAmount: usdAmount,
        currency: currency,
        finalBalance: verifyUser.balance
      }
    });
  } catch (error) {
    console.error('Error adding money to wallet:', error);
    res.status(500).json({ 
      error: 'Server error: ' + error.message,
      success: false
    });
  }
});



module.exports = router;