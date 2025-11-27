const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

const User = require('../database').User;

router.get('/student', async (req, res) => {
  try {
        const students = await User.find({ role: 'student' });
        res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;