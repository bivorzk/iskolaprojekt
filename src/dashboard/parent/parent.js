const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
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
router.use(requireParentAuth);

// Get list of students linked to the parent
router.get('/studentlist', cacheResult((req) => `parent:studentlist:${req.session.user.id}`, 300), async (req, res) => {
  try {
    console.log('Fetching student list for parent:', req.session.user.id);
    const parentId = req.session.user.id;
    const links = await ParentStudent.find({ parentId }).populate('studentId', 'username email createdAt balance');
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

module.exports = router;