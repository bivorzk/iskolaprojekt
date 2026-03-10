const express = require('express');
const router = express.Router();
const path = require('path');

// Import sub-modules
const adminRouter = require('./admin/admin');
const studentRouter = require('./student/student');
const parentRouter = require('./parent/parent');
const editorRouter = require('./editor/editor');
const statisticsRouter = require('./statistics/statistics');

// Apply middleware to all /admin routes
router.use('/admin', adminRouter);
router.use('/admin', statisticsRouter);

// Apply middleware to all /editor routes
router.use('/editor', editorRouter);

// Apply middleware to all /student routes
router.use('/student', studentRouter);

// Apply middleware to all /parent routes
router.use('/parent', parentRouter);

// General dashboard route
router.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public/dashboard/dashboard.html'));
});

module.exports = router;