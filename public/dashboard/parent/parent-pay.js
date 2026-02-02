const express = require('express');
const router = express.Router();
const { verifyParentChild } = require('../auth/validation'); // ellenőrzi a szülő-gyerek kapcsolatot
const { processPaypalPayment } = require('./paypal'); // vagy saját fizetési logika

router.post('/api/parent/pay', async (req, res) => {
  const { studentId, orderId, amount } = req.body;

  if (!await verifyParentChild(req.user.id, studentId)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const result = await processPaypalPayment(orderId, amount);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
