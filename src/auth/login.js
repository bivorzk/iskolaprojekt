const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();

const User = require('../models/User');
const { createSecurityLog } = require('./security');
const { SecurityLogs } = require('../../config/database_queries');

/**
 * User Login Route
 * Handles user authentication with security logging
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Username received:', username);
    console.log('Password received:', password ? '***' : 'undefined');

    // Input validation
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).send('Username and password are required');
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      console.log('Username not found:', username);
      return res.status(401).send('Invalid credentials');
    }

    // Verify password
    console.log('User found:', user.username);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(401).send('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, username: user.username }, 'ourSecretKey');
    const decoded = jwt.verify(token, 'ourSecretKey');

    // Security logging with IP tracking
    const hashedIP = crypto.createHash('sha256').update(req.clientIp).digest('hex');
    const lastLog = await SecurityLogs.findOne({ userId: user._id })
      .sort({ Timestamp: -1 });

    const ipMatches = lastLog && lastLog.ipAddress === hashedIP;
    
    if (!ipMatches && lastLog) {
      // Different IP detected - security warning
      await createSecurityLog({
        userId: user._id,
        ipAddress: req.clientIp,
        action: 'ip_mismatch_login_attempt',
        type: 'WARNING',
        details: 'Login attempt from different IP address'
      });
    } else {
      // Normal login from known or new IP
      await createSecurityLog({
        userId: user._id,
        ipAddress: req.clientIp,
        action: 'login_attempt',
        type: 'INFO',
        details: ipMatches ? 'Login from known IP' : 'First login for user'
      });
    }
    
    // Set up user session
    req.session.user = {
      id: user.id,
      username: user.username,
      usertype: user.usertype,
      email: user.email,
      IsLoggedIn: true,
      jwtToken: decoded
    };

    console.log('Login successful for:', username);
    res.status(200).send(`Welcome, ${username}`);

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;