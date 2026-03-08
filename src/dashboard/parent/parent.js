const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const { body } = require('express-validator');
const { User } = require('../../../src/database');
const { Payment, Order, ParentStudent } = require('../../../config/database_queries');
const {requireParentAuth} = require('../middleware/auth-middleware');

// Import shared services
const { cacheResult, invalidateCache } = require('../services/cache-service');

// Middleware to check if user is authenticated and is a parent


router.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public/dashboard/parent/parent.html'));
});

// Apply auth middleware to all routes
router.use('/',requireParentAuth);

// Get list of students linked to the parent
router.get('/studentlist', cacheResult((req) => `parent:studentlist:${req.session.user.id}`, 300), async (req, res) => {
  try {
    console.log('Fetching student list for parent:', req.session.user.id);
    const parentId = req.session.user.id;
    const links = await ParentStudent.find({ parentId, status: 'approved' }).populate('studentId', 'username email createdAt balance');
    console.log('Found links:', links.length);
    const students = links.map(link => ({
      id: link.studentId._id,
      name: link.studentId.username,
      email: link.studentId.email,
      createdAt: link.studentId.createdAt,
      balance: link.studentId.balance,
      class: 'N/A' // Default class since it's not in the User model
    }));
    console.log('Returning students:', students.length);
    res.json({ students });
  } catch (error) {
    console.error('Error fetching student list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending link requests
router.get('/link-requests', async (req, res) => {
  try {
    const parentId = req.session.user.id;

    const requests = await ParentStudent.find({ parentId, status: 'pending' })
      .populate('studentId', 'username email createdAt')
      .sort({ createdAt: -1 });

    const pendingRequests = requests.map(request => ({
      id: request._id,
      studentId: request.studentId._id,
      studentName: request.studentId.username,
      studentEmail: request.studentId.email,
      requestedAt: request.createdAt
    }));

    res.json({ requests: pendingRequests });
  } catch (error) {
    console.error('Error fetching link requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve or deny link request
router.post('/link-request/:requestId', [
  body('action').isIn(['approve', 'deny'])
], async (req, res) => {
  try {
    const parentId = req.session.user.id;
    const { requestId } = req.params;
    const { action } = req.body;

    const request = await ParentStudent.findOne({
      _id: requestId,
      parentId,
      status: 'pending'
    });

    if (!request) {
      return res.status(404).json({ error: 'Link request not found' });
    }

    if (action === 'approve') {
      request.status = 'approved';
      request.approvedAt = new Date();
    } else if (action === 'deny') {
      request.status = 'denied';
      request.deniedAt = new Date();
    }

    await request.save();

    // Invalidate cache
    invalidateCache([`parent:studentlist:${parentId}`, `parent:link-requests:${parentId}`]);

    res.json({
      success: true,
      message: `Link request ${action}d successfully`
    });
  } catch (error) {
    console.error('Error processing link request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get orders made by the parent's students
router.get('/orders', cacheResult((req) => `parent:orders:${req.session.user.id}`, 60), async (req, res) => {
  try {
    const parentId = req.session.user.id;
    const links = await ParentStudent.find({ parentId });
    const studentIds = links.map(link => link.studentId);

    const orders = await Order.find({ userId: { $in: studentIds } })
      .populate('userId', 'username')
      .sort({ orderDate: -1 })
      .limit(50); // Limit to last 50 orders

    const ordersData = orders.map(order => ({
      _id: order._id,
      studentName: order.userId.username,
      total: order.totalAmount,
      status: order.status,
      createdAt: order.orderDate
    }));

    res.json({ orders: ordersData });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stats for the parent dashboard
router.get('/stats', cacheResult((req) => `parent:stats:${req.session.user.id}`, 120), async (req, res) => {
  try {
    console.log('Fetching stats for parent:', req.session.user.id);
    const parentId = req.session.user.id;
    const links = await ParentStudent.find({ parentId });
    console.log('Found parent-student links:', links.length);
    const studentIds = links.map(link => link.studentId);

    // Total students
    const totalStudents = studentIds.length;

    // Active children (students who have made orders in the last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeOrders = await Order.find({
      userId: { $in: studentIds },
      orderDate: { $gte: thirtyDaysAgo }
    }).distinct('userId');
    const activeChildren = activeOrders.length;

    // Orders made
    const ordersMade = await Order.countDocuments({ userId: { $in: studentIds } });

    // Total payments
    const payments = await Payment.find({
      userId: { $in: studentIds },
      status: 'Completed'
    });
    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Parent's balance
    const parent = await User.findById(parentId);
    const balance = parent ? parent.balance : 0;

    // Signup data (creation dates of students)
    const signupData = links.map(link => {
      const date = link.createdAt;
      return {
        _id: {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate()
        },
        count: 1
      };
    }).reduce((acc, curr) => {
      const key = `${curr._id.year}-${curr._id.month}-${curr._id.day}`;
      const existing = acc.find(item => 
        item._id.year === curr._id.year && 
        item._id.month === curr._id.month && 
        item._id.day === curr._id.day
      );
      if (existing) {
        existing.count += curr.count;
      } else {
        acc.push(curr);
      }
      return acc;
    }, []);

    console.log('Stats:', { totalStudents, activeChildren, ordersMade, totalPayments, balance, signupDataLength: signupData.length });
    res.json({
      totalStudents,
      activeChildren,
      ordersMade,
      totalPayments,
      balance,
      signupData
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get welcome message
router.get('/welcome-message', cacheResult((req) => `parent:welcome:${req.session.user.id}`, 3600), async (req, res) => {
  console.log('Welcome message request, session user:', req.session.user);
  const username = req.session.user.username;
  console.log('Username from session:', username);
  res.json({ message: `Welcome, ${username}` });
});

router.post('/transfer', async (req, res) => {
  try {
    const parentId = req.session.user.id;
    const { studentId, amount } = req.body;

    if (!studentId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid student ID or amount' });
    }

    const link = await ParentStudent.findOne({ parentId, studentId });
    if (!link) {
      return res.status(403).json({ error: 'Student not linked to your account' });
    }

    const parent = await User.findById(parentId);
    const student = await User.findById(studentId);

    if (!parent || !student) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (parent.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    parent.balance -= amount;
    student.balance += amount;

    await parent.save();
    await student.save();

    invalidateCache([
      `parent:stats:${parentId}`,
      `student:userinfo:${studentId}`,
      `student:wallet:${studentId}`
    ]);

    res.json({ message: 'Transfer successful', newBalance: parent.balance });
  } catch (error) {
    console.error('Error transferring money:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/wallet/balance', async (req, res) => {
  try {
    const parentId = req.session.user.id;
    const parent = await User.findById(parentId);

    if (!parent) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ balance: parent.balance || 0 });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/userinfo', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId).select('username email IsVerified createdAt');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      username: user.username,
      email: user.email,
      IsVerified: user.IsVerified,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/transactions', async (req, res) => {
  try {

    res.json({ transactions: [] });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    console.log('Parent wallet add request:', { userId, amount, currency, paymentMethod, transactionId });

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method required' });
    }

    // Convert amount to USD for storage (if needed)
    let usdAmount = parseFloat(amount);
    if (currency === 'HUF') {
      usdAmount = amount * 0.0027; // Simple conversion rate
    } else if (currency === 'EUR') {
      usdAmount = amount * 1.1; // Simple conversion rate
    }

    // Check if user exists first
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update database balance
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: usdAmount } },
      { new: true, upsert: false }
    );
    const newBalance = user.balance;

    console.log('Parent wallet updated successfully:', newBalance);

    // Invalidate balance cache
    invalidateCache([`parent:stats:${userId}`]);

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

      const paymentRecord = await Payment.create(paymentData);
      console.log('Parent payment record created successfully:', paymentRecord._id);

      // Invalidate transactions cache if exists
      invalidateCache([`parent:transactions:${userId}`]);
    } catch (paymentError) {
      console.error('Error creating parent payment record:', paymentError);
      // Continue even if payment record fails, wallet is already updated
    }

    res.json({
      success: true,
      newBalance: newBalance,
      message: 'Funds added successfully'
    });

  } catch (error) {
    console.error('Error adding funds to parent wallet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;