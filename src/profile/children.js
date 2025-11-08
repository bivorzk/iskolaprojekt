const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

const User = require('../database').User;

router.get('/children', async (req, res) => {
  try {
        const children = await User.find({ role: 'children' });
        res.json(children);
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
