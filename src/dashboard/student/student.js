const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const { User } = require('../../../src/database');
const { Payment, ParentStudent, Order } = require('../../../config/database_queries');

// Import shared services
const { cacheResult, invalidateCache } = require('../services/cache-service');

let redisClient = null;
try {
  const { redisClient: client } = require('../../redis');
  redisClient = client;
} catch (error) {
  console.log('Redis not available in student dashboard:', error.message);
}

function isRedisAvailable() {
  return redisClient && redisClient.isOpen;
}

// Student permission middleware
function requireStudent(req, res, next) {
  if (!req.session.user || !req.session.user.IsLoggedIn) {
    return res.sendFile(require('path').join(__dirname, '../../../public/no_perm/index.html'));
  }
  // Allow both students and admins to access student routes
  if (req.session.user.usertype === 'student' || req.session.user.usertype === 'admin') {
    next();
  } else {
    return res.sendFile(require('path').join(__dirname, '../../../public/no_perm/index.html'));
  }
}

// Apply middleware to all student routes
router.use('/', requireStudent);

// Serve student dashboard
router.get('/', (req, res) => {
  res.sendFile(require('path').join(__dirname, '../../../public/dashboard/student/student.html'));
});

// API endpoints for STUDENT DASHBOARD

router.get('/freeze_account', async (req, res) => {
  try {
    const userId = req.session.user.id;
    await User.findByIdAndUpdate(userId, { user_type: 'frozen' });
    // Invalidate userinfo cache
    invalidateCache([`student:userinfo:${userId}`]);
      res.status(202).json({ message: 'Account has been frozen' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/parent/link', [
  body('parentEmail').isEmail().normalizeEmail()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
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
    // Invalidate userinfo cache
    invalidateCache([`student:userinfo:${studentId}`]);
      res.status(202).json({ message: 'Parent linked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/parent', async (req, res) => {
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

router.get('/parent/unlink', async (req, res) => {
  try {
    const studentId = req.session.user.id;
    await ParentStudent.findOneAndDelete({ studentId });
    // Invalidate userinfo cache
    invalidateCache([`student:userinfo:${studentId}`]);
      res.status(202).json({ message: 'Parent unlinked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/transactions', cacheResult((req) => `student:transactions:${req.session.user.id}`, 300), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const transactions = await Payment.find({ userId }).sort({ date: -1 });
    res.status(202).json({ transactions });
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

router.get('/order_history', cacheResult((req) => `student:order_history:${req.session.user.id}`, 300), async (req, res) => {
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

// Health check endpoint for student dashboard
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Student dashboard is healthy' });
});

// Debug endpoint to check database and session
router.get('/debug', async (req, res) => {
  try {
    const session = req.session.user;
    const mongoose = require('mongoose');
    const dbConnection = mongoose.connection.readyState;

    let userFromDb = null;
    if (session && session.id) {
      userFromDb = await User.findById(session.id);
    }

    res.status(200).json({
      session: session ? { id: session.id, username: session.username, usertype: session.usertype } : null,
      dbConnection: dbConnection === 1 ? 'connected' : 'disconnected',
      userExists: !!userFromDb,
      userBalance: userFromDb ? userFromDb.balance : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get wallet balance
router.get('/wallet/balance', cacheResult((req) => `student:wallet_balance:${req.session.user.id}`, 300), async (req, res) => {
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
router.post('/wallet/add',
  [body('amount').isFloat({ gt: 0 }),
    body('currency').isIn(['USD', 'HUF', 'EUR']),
    body('paymentMethod').notEmpty(),
    body('transactionId').optional().isString()
  ], async (req, res) => {
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

    // Invalidate balance cache
    invalidateCache([`student:wallet_balance:${userId}`]);

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

      // Invalidate transactions cache
      invalidateCache([`student:transactions:${userId}`]);
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

router.get('/userinfo', cacheResult((req) => `student:userinfo:${req.session.user.id}`, 300), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId).select('username email usertype createdAt isVerified');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const data = {
      email: user.email,
      fullName: user.username,
      studentId: user.username, // Using username as student ID for now
      IsVerified: user.isVerified,
      createdAt: user.createdAt
    };
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;