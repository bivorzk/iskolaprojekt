// parent-pay.js
import express from 'express';
const router = express.Router();

// Ellenőrzi, hogy a szülő valóban kapcsolatban áll a gyerekkel
import { verifyParentChild } from '../auth/validation.js';

// PayPal vagy saját fizetési logika
import { processPaypalPayment } from './paypal.js';

// POST endpoint a szülő fizetéséhez
router.post('/api/parent/pay', async (req, res) => {
  const { studentId, orderId, amount } = req.body;

  // Ellenőrizzük, hogy a szülő jogosult-e fizetni a gyerek számára
  try {
    const isAuthorized = await verifyParentChild(req.user.id, studentId);
    if (!isAuthorized) {
      return res.status(403).json({ error: "Unauthorized" });
    }
  } catch (err) {
    console.error("Parent-child verification error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }

  // Fizetés feldolgozása
  try {
    const result = await processPaypalPayment(orderId, amount);

    // Példa visszaadott objektum: { status: "success", transactionId: "...", amount: 500 }
    return res.json(result);
  } catch (err) {
    console.error("Payment processing error:", err);
    return res.status(500).json({ error: err.message || "Payment failed" });
  }
});

export default router;


