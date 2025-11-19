const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');
const stats = require('simple-statistics');

// Connect to MongoDB

const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

router.use(express.urlencoded({ extended: true }));

mongoose.connect(dbUrl + dbName)
  .then(() => console.log('Connected to MongoDB for admin'))
  .catch(err => console.error('Could not connect to MongoDB for user auth', err));

const { User } = require('../../src/database');
const { Payment, LoyaltyProgram, MenuItems, Order, OrderItems } = require('../../config/database_queries');


// Admin permission middleware
function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.IsLoggedIn) {
    return res.status(401).send('Unauthorized: No session available');
  }
  if (req.session.user.usertype !== 'admin') {
    return res.status(403).send('No admin rights');
  }
  next();
}

router.use('/', requireAdmin);

// Update all test user to match TEST usertype
router.get('/changeuser', async (req, res) => {
    try {
      const filter = { child: req.query.child };
      const update = { $set: { usertype: "TEST" } };
      const result = await User.updateMany(filter, update);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
});




module.exports = router;