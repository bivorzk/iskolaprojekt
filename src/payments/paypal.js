const express = require('express');
const router = express.Router();
const { Payment } = require('../../config/database_queries');

// POST /api/payments/paypal
router.post('/paypal', async (req, res) => {
    try {
        console.log('Incoming PayPal payment:', req.body);
        const { orderID, payerID, amount, currency } = req.body;
        // You may want to get userId from session/auth middleware
        const userId = req.user ? req.user._id : null;

        const payment = new Payment({
            userId: userId,
            amount: amount,
            currency: currency,
            paymentMethod: 'PayPal',
            status: 'Completed',
            createdAt: new Date(),
            details: {
                orderID,
                payerID,
                raw: req.body // Save raw for debugging
            }
        });
        await payment.save();
        res.json({ success: true, payment });
    } catch (err) {
        console.error('Error saving PayPal payment:', err);
        res.status(500).json({ success: false, error: 'Failed to save payment' });

    }
});

module.exports = router;