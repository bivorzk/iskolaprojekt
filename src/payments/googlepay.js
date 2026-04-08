const express = require('express');
const router = express.Router();
const { Payment } = require('../../config/database_queries');
const { User } = require('../database');
const { redisClient } = require('../redis');
const redisLuaService = require('../services/redis-lua-service');


// Legacy Google Pay payment endpoint (kept for backward compatibility)
router.post('/googlepay', async (req, res) => {
    try {
        console.log('Incoming Google Pay payment (legacy):', req.body);
        const { paymentMethodData, amount, currency, merchantInfo, orderId } = req.body;
        const amountNum = parseFloat(amount) || 0;
        // Get userId from session (the app uses express-session, not passport)
        const userId = req.session?.user?.id || null;
        const referer = req.headers.referer || req.headers.referrer || null;
        
        console.log('User ID from session:', userId);
        console.log('Request came from (referer):', referer);

        const payment = new Payment({
            userId: userId,
            amount: amount,
            currency: currency,
            paymentMethod: 'GooglePay',
            status: 'Completed',
            createdAt: new Date(),
            details: {
                paymentMethodData,
                merchantInfo,
                orderId: orderId || null,
           //     referer: referer,
                raw: req.body // Save raw for debugging
            }
        });
        await payment.save();
        
        // Handle different payment sources
        if (referer && referer.includes('/dashboard/student/') && userId) {
            console.log('Payment from student dashboard - adding balance to wallet');

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $inc: { balance: amountNum } },
                { new: true }
            ).lean();
            
            if (updatedUser) {
                const walletKey = `wallet:user:${userId}`;
                try {
                    await redisLuaService.setWalletBalance(walletKey, updatedUser.balance || 0);
                } catch (syncError) {
                    console.log('Failed to sync Google Pay balance to Redis:', syncError.message);
                }

                if (redisClient?.isOpen) {
                    await redisClient.del(`student:wallet_balance:${userId}`);
                    await redisClient.del(`student:transactions:${userId}`);
                }
            }

            console.log(`Added ${amountNum} balance to user ${userId}`);
            
        } else if (referer && referer.includes('/order/')) {
            console.log('Payment from order page');
            // Handle order-related logic here
        }
        
        res.json({ success: true, payment, newBalance: userId ? (await User.findById(userId).select('balance').lean())?.balance ?? null : null });

    } catch (err) {
        console.error('Error saving Google Pay payment:', err);
        res.status(500).json({ success: false, error: 'Failed to save payment' });
    }
});

module.exports = router;
