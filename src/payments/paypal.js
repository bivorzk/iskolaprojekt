const express = require('express');
const router = express.Router();
const { Payment } = require('../../config/database_queries');
const { Users } = require('../database');
// POST /api/payments/paypal
router.post('/paypal', async (req, res) => {
    try {
        console.log('=== PayPal Payment Route Called ===');
        console.log('Request method:', req.method);
        console.log('Request URL:', req.url);
        console.log('Request headers:', req.headers);
        console.log('Incoming PayPal payment body:', JSON.stringify(req.body, null, 2));
        
        const { orderID, payerID, amount, currency, paypalAmountUSD } = req.body;
        
        // Validate required fields
        if (!orderID || !amount) {
            console.error('Missing required fields: orderID or amount');
            return res.status(400).json({ success: false, error: 'Missing required fields: orderID or amount' });
        }
        
        // You may want to get userId from session/auth middleware
        const userId = req.user ? req.user._id : null;
        const referer = req.headers.referer || req.headers.referrer || null;
        console.log('User ID from session:', userId);

        // Save amount as number, fallback to 0 if invalid
        const amountNum = parseFloat(amount) || 0;
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
            console.log('Payment from student dashboard - adding credits to wallet');
            
            await Users.updateOne(
                { _id: userId },
                { $inc: { credits: parseFloat(amountNum) || 0 } }
            );
            console.log(`Added ${amountNum} credits to user ${userId}`);
            
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