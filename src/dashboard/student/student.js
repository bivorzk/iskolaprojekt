const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

const { User } = require('../../../src/database');
const { Payment, ParentStudent, Order, UserLoyalty, Reward, Redemption } = require('../../../config/database_queries');
const { requireStudent } = require('../middleware/auth-middleware');
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
    const existingLink = await ParentStudent.findOne({
      parentId: parentUser._id,
      studentId,
      $or: [{ status: 'pending' }, { status: 'approved' }]
    });
    if (existingLink) {
      if (existingLink.status === 'pending') {
        return res.status(400).json({ error: 'Link request already sent, waiting for approval' });
      } else {
        return res.status(400).json({ error: 'Link already exists' });
      }
    }
    await ParentStudent.create({
      parentId: parentUser._id,
      studentId,
      status: 'pending'
    });
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
      currentStreak: userLoyalty.currentStreak || 0,
      longestStreak: userLoyalty.longestStreak || 0,
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
      currentStreak: userLoyalty.currentStreak || 0,
      longestStreak: userLoyalty.longestStreak || 0,
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
    const user = await User.findById(userId).select('username email usertype createdAt isVerified is2Active');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const data = {
      email: user.email,
      fullName: user.username,
      studentId: user.username,
      IsVerified: user.isVerified,
      createdAt: user.createdAt,
      usertype: user.usertype,
      is2Active: user.is2Active === true
    };
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get reward catalog
router.get('/loyalty/rewards', cacheResult((req) => `loyalty:rewards:${req.session.user.id}`, 300), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const tierOrder = ['none', 'Bronze', 'Silver', 'Gold', 'Platinum'];
    const [rewards, userLoyalty] = await Promise.all([
      Reward.find({ isActive: true }).lean(),
      UserLoyalty.findOne({ userId }).lean()
    ]);

    const userPoints = userLoyalty?.totalPoints ?? 0;
    const userTierIdx = tierOrder.indexOf(userLoyalty?.userTier ?? 'none');

    const catalog = rewards.map(r => {
      const healthDiscount = r.healthScore >= 75;
      const finalCost = healthDiscount ? Math.floor(r.pointCost * 0.8) : r.pointCost;
      return {
        ...r,
        finalCost,
        healthDiscount,
        canAfford: userPoints >= finalCost,
        tierLocked: tierOrder.indexOf(r.minTier) > userTierIdx
      };
    });

    res.status(200).json({ rewards: catalog, userPoints, success: true });
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Redeem a reward from the shop
router.post('/loyalty/redeem',
  [body('rewardId').notEmpty().isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const userId = req.session.user.id;
    const { rewardId } = req.body;
    const tierOrder = ['none', 'Bronze', 'Silver', 'Gold', 'Platinum'];

    const session = await mongoose.startSession();
    try {
      let voucherCode, expiresAt;
      await session.withTransaction(async () => {
        const [reward, userLoyalty] = await Promise.all([
          Reward.findById(rewardId).session(session),
          UserLoyalty.findOne({ userId }).session(session)
        ]);

        if (!reward || !reward.isActive)
          throw Object.assign(new Error('Reward not available'), { status: 404 });

        if (tierOrder.indexOf(userLoyalty?.userTier ?? 'none') < tierOrder.indexOf(reward.minTier))
          throw Object.assign(new Error('Your tier is too low for this reward'), { status: 403 });

        const finalCost = reward.healthScore >= 75 ? Math.floor(reward.pointCost * 0.8) : reward.pointCost;
        if ((userLoyalty?.totalPoints ?? 0) < finalCost)
          throw Object.assign(new Error('Insufficient points'), { status: 400 });

        if (reward.dailyStockLimit !== null && reward.redeemedToday >= reward.dailyStockLimit)
          throw Object.assign(new Error('Daily limit reached for this reward'), { status: 409 });

        await UserLoyalty.updatePointsAtomically(userId, -finalCost, `redeemed:${reward.name}`);

        voucherCode = crypto.randomUUID();
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await Redemption.create([{
          userId,
          rewardId: reward._id,
          pointsSpent: finalCost,
          redemptionType: 'shop',
          status: 'pending',
          voucherCode,
          voucherExpiresAt: expiresAt,
          ipAddress: req.ip
        }], { session });

        await Reward.findByIdAndUpdate(rewardId, { $inc: { redeemedToday: 1 } }, { session });
      });

      invalidateCache([`student:loyalty:${userId}`, `loyalty:rewards:${userId}`]);
      res.status(201).json({ voucherCode, expiresAt, success: true });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    } finally {
      session.endSession();
    }
  }
);

// Get student's vouchers
router.get('/loyalty/vouchers', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const vouchers = await Redemption.find({ userId })
      .populate('rewardId', 'name category')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Auto-expire pending vouchers past their expiry date
    const now = new Date();
    const toExpire = vouchers
      .filter(v => v.status === 'pending' && v.voucherExpiresAt < now)
      .map(v => v._id);

    if (toExpire.length > 0) {
      await Redemption.updateMany({ _id: { $in: toExpire } }, { $set: { status: 'expired' } });
      vouchers.forEach(v => {
        if (toExpire.some(id => id.equals(v._id))) v.status = 'expired';
      });
    }

    res.status(200).json({ vouchers, success: true });
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Validate a voucher code for use at checkout (must belong to this user)
router.post('/loyalty/voucher/validate',
  [body('voucherCode').notEmpty().trim()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const userId = req.session.user.id;
    const { voucherCode } = req.body;

    try {
      const redemption = await Redemption.findOne({ voucherCode, userId, status: 'pending' })
        .populate('rewardId', 'name marketValue category');

      if (!redemption) {
        return res.status(404).json({ error: 'Voucher not found or already used' });
      }

      if (redemption.voucherExpiresAt < new Date()) {
        await Redemption.findByIdAndUpdate(redemption._id, { status: 'expired' });
        return res.status(410).json({ error: 'This voucher has expired' });
      }

      res.json({
        valid: true,
        voucherCode,
        redemptionId: redemption._id,
        rewardName: redemption.rewardId?.name || 'Reward',
        rewardCategory: redemption.rewardId?.category,
        marketValue: redemption.rewardId?.marketValue ?? 0,
        expiresAt: redemption.voucherExpiresAt,
        success: true
      });
    } catch (error) {
      console.error('Error validating voucher:', error);
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  }
);

// Mark a voucher as fulfilled (called automatically after checkout)
router.post('/loyalty/voucher/fulfill',
  [body('voucherCode').notEmpty().trim()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const userId = req.session.user.id;
    const { voucherCode } = req.body;

    try {
      const redemption = await Redemption.findOneAndUpdate(
        { voucherCode, userId, status: 'pending' },
        { status: 'fulfilled', fulfilledAt: new Date() },
        { new: true }
      );

      if (!redemption) {
        return res.status(404).json({ error: 'Voucher not found or already used' });
      }

      res.json({ success: true, message: 'Voucher fulfilled' });
    } catch (error) {
      console.error('Error fulfilling voucher:', error);
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  }
);

// ── Settings: 2FA status ──────────────────────────────────────────────────────
router.get('/settings/2fa/status', async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('is2Active');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ is2Active: user.is2Active === true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Settings: toggle 2FA ──────────────────────────────────────────────────────
router.post('/settings/2fa/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('is2Active');
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.is2Active = !user.is2Active;
    await user.save();
    res.json({ is2Active: user.is2Active });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Settings: get personal info ───────────────────────────────────────────────
router.get('/settings/personal-info', async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('userPersonalInfo');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const info = user.userPersonalInfo && user.userPersonalInfo[0] ? user.userPersonalInfo[0].toObject() : {};
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Settings: save personal info ─────────────────────────────────────────────
router.post('/settings/personal-info', [
  body('firstName').trim().isLength({ min: 1, max: 50 }),
  body('lastName').trim().isLength({ min: 1, max: 50 }),
  body('dateOfBirth').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('grade').optional({ nullable: true }).isString(),
  body('school').optional({ nullable: true }).trim().isLength({ max: 100 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input', details: errors.array() });
  try {
    const userId = req.session.user.id;
    const { firstName, lastName, dateOfBirth, grade, school, address } = req.body;
    const update = { firstName, lastName };
    if (dateOfBirth) update.dateOfBirth = new Date(dateOfBirth);
    if (grade) update.grade = grade;
    if (school) update.school = school;
    if (address) update.address = address;

    await User.updateOne(
      { _id: userId },
      { $set: { 'userPersonalInfo': [{ userId, ...update }] } }
    );
    invalidateCache([`student:userinfo:${userId}`]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;