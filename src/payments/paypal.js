const express = require('express');
const router = express.Router();
const { Payment } = require('../../config/database_queries');
const { User } = require('../database');
const { redisClient } = require('../redis');
const redisLuaService = require('../services/redis-lua-service');
// POST /api/payments/paypal
router.post('/paypal', async (req, res) => {
    try {
        console.log('=== PayPal Payment Route Called ===');
        console.log('Request method:', req.method);
        console.log('Request URL:', req.url);
        console.log('Request headers:', req.headers);
        console.log('Incoming PayPal payment body:', JSON.stringify(req.body, null, 2));
        
        const { orderID, payerID, amount, currency, paypalAmountUSD } = req.body;
        const amountNum = parseFloat(amount) || 0;
        
        // Validate required fields
        if (!orderID || !amount) {
            console.error('Missing required fields: orderID or amount');
            return res.status(400).json({ success: false, error: 'Missing required fields: orderID or amount' });
        }
        
        // Get userId from session (the app uses express-session, not passport)
        const userId = req.session?.user?.id || null;
        const referer = req.headers.referer || req.headers.referrer || null;
        console.log('User ID from session:', userId);

        // Save amount as number, fallback to 0 if invalid
        const paypalAmountNum = paypalAmountUSD ? parseFloat(paypalAmountUSD) : undefined;
        
        console.log('Parsed amounts - Original:', amountNum, 'PayPal USD:', paypalAmountNum);

        // Optionally save PayPal transactionId if available
        let transactionId = null;
        if (orderID) transactionId = orderID;

        const paymentData = {
            userId: userId,
            amount: amountNum,
            currency: currency || 'USD',
            paymentMethod: 'PayPal',
            status: 'Completed',
            transactionId: transactionId,
            createdAt: new Date(),
            details: {
                orderID,
                payerID,
                paypalAmountUSD: paypalAmountNum,
                raw: req.body // Save raw for debugging
            }
        };
    
        
        console.log('Creating payment with data:', JSON.stringify(paymentData, null, 2));
        
        const payment = new Payment(paymentData);
        
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
                    console.log('Failed to sync PayPal balance to Redis:', syncError.message);
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
        
        console.log('Payment object created, attempting to save...');
        const savedPayment = await payment.save();
        console.log('✅ Payment successfully saved to DB with ID:', savedPayment._id);
        console.log('Saved payment data:', JSON.stringify(savedPayment, null, 2));
        
        res.json({ success: true, payment: savedPayment });
    } catch (err) {
        console.error('❌ Error saving PayPal payment:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to save payment', 
            details: err.message,
            stack: err.stack 
        });
    }
});

module.exports = router;