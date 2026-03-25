const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const path = require('path');
const mongoose = require('mongoose');

const { User } = require('../../../src/database');
const { Payment, ParentStudent, Order, UserLoyalty } = require('../../../config/database_queries');
const { ConvertPoints, getHealthLevel } = require('../../LoyaltySystem/loyalty-service');
const { cacheResult, invalidateCache } = require('../services/cache-service');
const redisLuaService = require('../../services/redis-lua-service');

let redisClient = null;
try {
  const { redisClient: client } = require('../../redis');
  redisClient = client;
} catch (error) {
  console.log('Redis not available in teacher dashboard:', error.message);
}

function isRedisAvailable() {
  return redisClient && redisClient.isOpen;
}

// Rate limiting middleware for teachers
async function rateLimit(req, res, next) {
  try {
    const key = `ratelimit:teacher:${req.session.user?.id || req.ip}`;
    const rateLimitResult = await redisLuaService.checkRateLimit(key, 60, 60); // 60 requests per minute

    if (!rateLimitResult.allowed) {
      return res.status(429).sendFile(path.join(__dirname, '../../../public/429/429.html'));
    }

    res.set({
      'X-RateLimit-Limit': '60',
      'X-RateLimit-Remaining': Math.max(0, rateLimitResult.limit - rateLimitResult.currentCount),
      'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 60
    });

    next();
  } catch (error) {
    console.log('Rate limiting failed, allowing request:', error.message);
    next();
  }
}

// Teacher permission middleware
function requireTeacher(req, res, next) {
  if (!req.session.user || !req.session.user.IsLoggedIn) {
    return res.status(403).sendFile(path.join(__dirname, '../../../public/no_perm/index.html'));
  }
  if (req.session.user.usertype === 'teacher' || req.session.user.usertype === 'admin') {
    next();
  } else {
    return res.status(403).sendFile(path.join(__dirname, '../../../public/no_perm/index.html'));
  }
}

// Apply middlewares
router.use('/', requireTeacher);
router.use('/', rateLimit);

// Teacher dashboard main page
router.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '../../../public/dashboard/teacher/teacher.html'));
});

// Get teacher info
router.get('/userinfo', cacheResult((req) => `teacher:userinfo:${req.session.user.id}`, 300), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId).select('username email usertype createdAt isVerified');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(200).json({
      email: user.email,
      fullName: user.username,
      teacherId: user.username,
      IsVerified: user.isVerified,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all students assigned to this teacher
router.get('/students', cacheResult((req) => `teacher:students:${req.session.user.id}`, 300), async (req, res) => {
  try {
    const teacherId = req.session.user.id;
    const students = await User.find({ assignedTeacher: teacherId, usertype: 'student' }).select('username email balance createdAt');
    res.status(200).json({ students });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific student by ID
router.get('/students/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await User.findById(studentId).select('username email balance createdAt');
    if (!student) return res.status(404).json({ error: 'Student not found' });

    res.status(200).json({ student });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get student wallet balance
router.get('/students/:studentId/wallet', async (req, res) => {
  try {
    const { studentId } = req.params;
    const walletKey = `wallet:user:${studentId}`;
    let balance = null;

    try {
      balance = await redisLuaService.getWalletBalance(walletKey);
    } catch {
      console.log('Redis not available, falling back to DB');
    }

    if (balance === null || balance === undefined) {
      const student = await User.findById(studentId).select('balance');
      if (!student) return res.status(404).json({ error: 'Student not found' });
      balance = student.balance || 0;
    }

    res.status(200).json({ balance });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add money to student wallet
router.post('/students/:studentId/wallet/add',
  [body('amount').isFloat({ gt: 0 }), body('currency').isIn(['USD', 'HUF', 'EUR'])],
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const { amount, currency } = req.body;
      let usdAmount = parseFloat(amount);
      if (currency === 'HUF') usdAmount *= 0.0027;
      else if (currency === 'EUR') usdAmount *= 1.1;

      const walletKey = `wallet:user:${studentId}`;
      let newBalance;

      try {
        newBalance = await redisLuaService.updateWalletBalance(walletKey, usdAmount);
        await User.findByIdAndUpdate(studentId, { balance: newBalance });
      } catch {
        const student = await User.findByIdAndUpdate(studentId, { $inc: { balance: usdAmount } }, { new: true });
        newBalance = student.balance;
      }

      // Invalidate caches
      invalidateCache([`teacher:students:${req.session.user.id}`, `student:wallet_balance:${studentId}`]);

      res.status(200).json({ message: 'Wallet updated', newBalance, addedAmount: usdAmount });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get student order history
router.get('/students/:studentId/orders', async (req, res) => {
  try {
    const { studentId } = req.params;
    const orders = await Order.find({ userId: studentId }).populate('items.menuItemId').select('OrderDate totalAmount status items publicID orderDate');

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

    res.status(200).json({ orderData });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get teacher dashboard health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Teacher dashboard is healthy' });
});

// Debug endpoint
router.get('/debug', async (req, res) => {
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
      userBalance: userFromDb ? userFromDb.balance : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;