const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB

const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

router.use(express.urlencoded({ extended: true }));

const { User } = require('../../src/database');

mongoose.connect(dbUrl + dbName)
  .then(() => console.log('Connected to MongoDB for dashboard'))
  .catch(err => console.error('Could not connect to MongoDB for user auth', err));

// Get Admin userType
// Use inside an async function or route handler, for example:
router.get('/admin', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).send('Unauthorized: No session available');
    }
    const Admin = await User.find({ usertype: 'admin' });
    res.json(Admin); // Only send one response
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).send('Server error');
  }

});

module.exports = router;