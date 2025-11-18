const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');

// Connect to MongoDB

const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

router.use(express.urlencoded({ extended: true }));

const { User } = require('../../src/database');

mongoose.connect(dbUrl + dbName)
  .then(() => console.log('Connected to MongoDB for dashboard'))
  .catch(err => console.error('Could not connect to MongoDB for user auth', err));

// Get Admin userType

router.get('/admin', async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.IsLoggedIn) {
      return res.status(401).send('Unauthorized: No session available');
    }
    const adminUsers = await User.find({ usertype: 'admin' });
    if (adminUsers.map(user => user.username).includes(req.session.user.username)) {
      show = true;
    //  res.json(adminUsers);
    }else {
      show = false;
      console.log('No admin rights for user:', req.session.user.username);
     return res.status(203).send('No admin rights');
    }
    //const Admin = await User.find({ usertype: 'admin' });
    // res.json(Admin); // Only send one response
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).send('Server error');
  } 

  if (show) {
      res.sendFile(path.join(__dirname, '../../public/dashboard/admin.html'));
  }
});


router.get('/admin/usercount', async (req, res) => {
  try {
    const count = await User.countDocuments({});
    res.json({ total: count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/userlist', async (req, res) => {
  try {
    const users = await User.find({}, 'username email usertype createdAt');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});



module.exports = router;