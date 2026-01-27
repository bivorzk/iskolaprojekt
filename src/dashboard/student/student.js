const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const path = require('path');

const { User } = require('../../../src/database');
const { Payment, ParentStudent, Order, UserLoyalty } = require('../../../config/database_queries');

// Import loyalty service
const { ConvertPoints, getHealthLevel } = require('../../LoyaltySystem/loyalty-service');

// Import shared services
const { cacheResult, invalidateCache } = require('../services/cache-service');

// Import Redis Lua service for atomic operations
const redisLuaService = require('../../services/redis-lua-service');

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

// Rate limiting middleware using Redis Lua service
async function rateLimit(req, res, next) {
  try {
    const key = `ratelimit:student:${req.session.user?.id || req.ip}`;
    const rateLimitResult = await redisLuaService.checkRateLimit(key, 60, 60); // 60 requests per minute for students

    if (!rateLimitResult.allowed) {
      return res.status(429).sendFile(path.join(__dirname, '../../../public/429/429.html'));
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': '60',
      'X-RateLimit-Remaining': Math.max(0, 59 - rateLimitResult.currentCount),
      'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 60
    });

    next();
  } catch (error) {
    console.log('Rate limiting failed, allowing request:', error.message);
    next(); // Allow request if rate limiting fails
  }
}

// Student permission middleware
function requireStudent(req, res, next) {
  if (!req.session.user || !req.session.user.IsLoggedIn) {
    return res.status(403).sendFile(path.join(__dirname, '../../../public/no_perm/index.html'));
  }
  // Allow both students and admins to access student routes
  if (req.session.user.usertype === 'student' || req.session.user.usertype === 'admin') {
    next();
  } else {
    return res.status(403).sendFile(path.join(__dirname, '../../../public/no_perm/index.html'));
  }
}

// Apply middleware to all student routes
router.use('/', requireStudent);
router.use('/', rateLimit); // Apply rate limiting to all student routes

// Serve student dashboard
router.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '../../../public/dashboard/student/student.html'));
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

    // First try to get balance from Redis (faster)
    const walletKey = `wallet:user:${userId}`;
    let balance = null;

    try {
      balance = await redisLuaService.getWalletBalance(walletKey);
      console.log('Balance from Redis:', balance);
    } catch (redisError) {
      console.log('Redis not available for balance, falling back to database');
    }

    // If Redis balance is null or Redis failed, get from database and sync to Redis
    if (balance === null || balance === undefined) {
      const user = await User.findById(userId).select('balance');

      if (!user) {
        console.log('User not found for balance request');
        return res.status(404).json({ error: 'User not found' });
      }

      balance = user.balance || 0;

      // Sync to Redis for future requests
      try {
        if (balance > 0) {
          await redisLuaService.updateWalletBalance(walletKey, balance - balance); // Set to exact amount
        }
      } catch (syncError) {
        console.log('Failed to sync balance to Redis:', syncError.message);
      }
    }

    console.log('Final balance:', balance);

    res.status(200).json({
      balance: balance,
      success: true
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get loyalty information
router.get('/loyalty', cacheResult((req) => `student:loyalty:${req.session.user.id}`, 300), async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    let userLoyalty = await UserLoyalty.findOne({ userId }).populate('userId', 'username');
    
    if (!userLoyalty) {
      // Create new loyalty record for user
      try {
        userLoyalty = new UserLoyalty({
          userId: userId,
          totalPoints: 0,
          userTier: require('../../../config/DATABASE_CONSTANTS.JS').TIERS.NONE,
          discounts: [],
          lastUpdated: new Date(),
          lastDecay: new Date(),
          pointHistory: [],
          milestonesAchieved: []
        });
        await userLoyalty.save();
        console.log(`Created new loyalty record for user: ${userId}`);
      } catch (createError) {
        console.error('Error creating loyalty record:', createError);
        // Return default values if creation fails
        return res.status(200).json({
          totalPoints: 0,
          userTier: require('../../../config/DATABASE_CONSTANTS.JS').TIERS.NONE,
          discounts: [],
          lastUpdated: null,
          pointHistory: [],
          milestonesAchieved: [],
          success: true
        });
      }
    }

    res.status(200).json({
      totalPoints: userLoyalty.totalPoints,
      userTier: userLoyalty.userTier,
      discounts: userLoyalty.discounts,
      lastUpdated: userLoyalty.lastUpdated,
      pointHistory: userLoyalty.pointHistory.slice(-20), // Last 20 entries
      milestonesAchieved: userLoyalty.milestonesAchieved,
      success: true
    });
  } catch (error) {
    console.error('Error fetching loyalty information:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Refresh loyalty data (bypass cache)
router.post('/loyalty/refresh', async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Clear cache first
    if (invalidateCache) {
      invalidateCache([`student:loyalty:${userId}`]);
    }
    
    let userLoyalty = await UserLoyalty.findOne({ userId }).populate('userId', 'username');
    
    if (!userLoyalty) {
      // Create new loyalty record for user
      userLoyalty = new UserLoyalty({
        userId: userId,
        totalPoints: 0,
        userTier: require('../../../config/DATABASE_CONSTANTS.JS').TIERS.NONE,
        discounts: [],
        lastUpdated: new Date(),
        lastDecay: new Date(),
        pointHistory: [],
        milestonesAchieved: []
      });
      await userLoyalty.save();
      console.log(`Created new loyalty record for user: ${userId}`);
    }

    res.status(200).json({
      totalPoints: userLoyalty.totalPoints,
      userTier: userLoyalty.userTier,
      discounts: userLoyalty.discounts,
      lastUpdated: userLoyalty.lastUpdated,
      pointHistory: userLoyalty.pointHistory.slice(-20), // Last 20 entries
      milestonesAchieved: userLoyalty.milestonesAchieved,
      success: true,
      refreshed: true
    });
  } catch (error) {
    console.error('Error refreshing loyalty information:', error);
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

    // Use Redis Lua service for atomic wallet update
    const walletKey = `wallet:user:${userId}`;
    let newBalance;

    try {
      // Update balance atomically in Redis
      newBalance = await redisLuaService.updateWalletBalance(walletKey, usdAmount);
      console.log('Redis wallet updated successfully:', newBalance);

      // Update database balance to match Redis
      await User.findByIdAndUpdate(userId, { balance: newBalance });

    } catch (redisError) {
      console.log('Redis wallet update failed, falling back to database:', redisError.message);

      // Fallback to database update
      const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { balance: usdAmount } },
        { new: true, upsert: false }
      );
      newBalance = user.balance;

      // Try to sync to Redis
      try {
        await redisLuaService.updateWalletBalance(walletKey, newBalance - newBalance); // Set exact amount
      } catch (syncError) {
        console.log('Failed to sync to Redis after fallback:', syncError.message);
      }
    }

    console.log('Final wallet balance:', newBalance);

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

    // Award loyalty points for wallet top-up
    try {
      const userLoyalty = await UserLoyalty.findOne({ userId });
      let currentTier = 'NONE';
      if (userLoyalty) {
        currentTier = userLoyalty.userTier;
      }
      
      // Use the same loyalty calculation as orders (4-9 random points per dollar)
      const healthLevel = await getHealthLevel(userId);
      const pointsToAward = ConvertPoints(usdAmount, currentTier, healthLevel, new Date());
      
      if (pointsToAward > 0) {
        await UserLoyalty.updatePointsAtomically(userId, pointsToAward, 'wallet_topup');
        
        // Invalidate loyalty cache
        invalidateCache([`student:loyalty:${userId}`]);
      }
    } catch (loyaltyError) {
      console.error('Error awarding loyalty points for wallet top-up:', loyaltyError.message || loyaltyError);
      // Continue even if loyalty update fails, wallet is already updated
    }

    // Always return success since wallet was updated successfully
    res.status(200).json({
      message: 'Money added successfully',
      newBalance: newBalance,
      addedAmount: usdAmount,
      success: true,
      debug: {
        originalAmount: amount,
        convertedAmount: usdAmount,
        currency: currency,
        finalBalance: newBalance
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