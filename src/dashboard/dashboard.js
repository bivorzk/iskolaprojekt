const express = require('express');
const router = express.Router();
const path = require('path');

// Import sub-modules
const adminRouter = require('./admin/admin');
const studentRouter = require('./student/student');
const statisticsRouter = require('./statistics/statistics');

// Apply middleware to all /admin routes
router.use('/admin', adminRouter);
router.use('/admin', statisticsRouter);

// Apply middleware to all /student routes
router.use('/student', studentRouter);

// General dashboard route
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/dashboard/dashboard.html'));
});

module.exports = router;