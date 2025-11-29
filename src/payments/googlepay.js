const express = require('express');
const router = express.Router();
const { Payment, Users } = require('../../config/database_queries');


// Legacy Google Pay payment endpoint (kept for backward compatibility)
router.post('/googlepay', async (req, res) => {
    try {
        console.log('Incoming Google Pay payment (legacy):', req.body);
        const { paymentMethodData, amount, currency, merchantInfo, orderId } = req.body;
        // You may want to get userId from session/auth middleware
        const userId = req.user ? req.user._id : null;
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
            console.log('Payment from student dashboard - adding credits to wallet');
            
            await Users.updateOne(
                { _id: userId },
                { $inc: { credits: parseFloat(amount) || 0 } }
            );
            console.log(`Added ${amount} credits to user ${userId}`);
            
        } else if (referer && referer.includes('/order/')) {
            console.log('Payment from order page');
            // Handle order-related logic here
        }
        
        res.json({ success: true, payment });

    } catch (err) {
        console.error('Error saving Google Pay payment:', err);
        res.status(500).json({ success: false, error: 'Failed to save payment' });
    }
});

module.exports = router;
