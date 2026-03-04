const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
const User = require('../models/User');
const { createSecurityLog } = require('./security');
const { SecurityLogs } = require('../../config/database_queries');
const { default: IPLocate } = require('node-iplocate');
const { redisClient, isRedisAvailable } = require('../redis');
require('dotenv').config();

/**
 * User Login Route
 * Handles user authentication with security logging
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIp = req.clientIp || req.ip || 'unknown';

    // Rate limiting to prevent brute-force attacks
    if (isRedisAvailable) {
      try {
        const rateLimitKey = `login_attempts:${clientIp}`;
        const attempts = await redisClient.get(rateLimitKey);
        const attemptCount = attempts ? parseInt(attempts) : 0;
        
        if (attemptCount >= 5) { // Max 5 attempts per hour
          return res.status(429).send('Too many login attempts. Please try again later.');
        }
        
        await redisClient.setEx(rateLimitKey, 3600, (attemptCount + 1).toString()); // Expire in 1 hour
      } catch (redisError) {
        console.error('Redis rate limiting error:', redisError);
        // Continue without rate limiting if Redis fails
      }
    }

    console.log('Login attempt from IP:', clientIp);

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
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_LOGIN_SECRET, { expiresIn: '2h' });
    const decoded = jwt.verify(token, process.env.JWT_LOGIN_SECRET);

    // Optional geo lookup for logging
    let geo = null;
    try {
      const IPClient = new IPLocate(process.env.GEOIP);
      geo = await IPClient.lookup(clientIp);
    } catch (geoError) {
      console.warn('Geo lookup failed:', geoError.message);
    }
    console.log('Login attempt from IP:', clientIp, geo ? `Location: ${geo.country}` : 'Location: unknown');
  


    // Security logging with IP tracking
    const hashedIP = crypto.createHash('sha256').update(clientIp).digest('hex');
    const lastLog = await SecurityLogs.findOne({ userId: user._id })
      .sort({ Timestamp: -1 });

    const ipMatches = lastLog && lastLog.ipAddress === hashedIP;
    
    

    if (!ipMatches && lastLog) {
      // Different IP detected - security warning
      await createSecurityLog({
        userId: user._id,
        ipAddress: clientIp,
        action: 'ip_mismatch_login_attempt',
        type: 'WARNING',
        details: 'Login attempt from different IP address' || 'First login for user',
        country: geo ? geo.country : 'unknown' || 'unknown',
        CountryCode: geo ? geo.countryCode : 'unknown' || 'unknown',
        currency: geo ? geo.currency : 'unknown' || 'unknown',
        Continent: geo ? geo.continent : 'unknown' || 'unknown',
        IsVPN: geo ? geo.isVPN : false || false,
        isTor: geo ? geo.isTor : false || false,
        isProxy: geo ? geo.isProxy : false || false,
        lattitude: geo ? geo.latitude : null,
        longitude: geo ? geo.longitude : null
      });
    } else {
      // Normal login from known or new IP
      await createSecurityLog({
        userId: user._id,
        ipAddress: clientIp,
        action: 'login_attempt',
        type: 'INFO',
        details: ipMatches ? 'Login from known IP' : 'First login for user',
        country: geo ? geo.country : 'unknown' || 'unknown',
        CountryCode: geo ? geo.countryCode : 'unknown' || 'unknown',
        currency: geo ? geo.currency : 'unknown' || 'unknown',
        Continent: geo ? geo.continent : 'unknown' || 'unknown',
        IsVPN: geo ? geo.isVPN : false || false,
        isTor: geo ? geo.isTor : false || false,
        isProxy: geo ? geo.isProxy : false || false,
        lattitude: geo ? geo.latitude : null,
        longitude: geo ? geo.longitude : null
        
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