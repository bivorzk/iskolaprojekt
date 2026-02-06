const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const router = express.Router();
const redis = require('redis');
const crypto = require('crypto');

// Import dependencies
const User = require('../models/User');
const { validateUsername, validatePassword, validateEmail, verifyCaptcha } = require('./validation');
const { createSecurityLog } = require('./security');
const sendVerificationEmail = require('./email_verification');
const { setVerificationCode } = require('../verificationStore');
const { redisClient, isRedisAvailable } = require('../redis');

// Environment configuration
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const secretKey = process.env.Server_Side_Captha;

/**
 * User Registration Route
 * Handles user registration with comprehensive validation and security checks
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const clientIp = req.clientIp || req.ip || 'unknown';

    // Rate limiting to prevent brute-force and spam
    if (isRedisAvailable) {
      try {
        const rateLimitKey = `reg_attempts:${clientIp}`;
        const attempts = await redisClient.get(rateLimitKey);
        const attemptCount = attempts ? parseInt(attempts) : 0;
        
        if (attemptCount >= 5) { // Max 5 attempts per hour
          return res.status(429).send('Too many registration attempts. Please try again later.');
        }
        
        await redisClient.setEx(rateLimitKey, 3600, (attemptCount + 1).toString()); // Expire in 1 hour
      } catch (redisError) {
        console.error('Redis rate limiting error:', redisError);
        // Continue without rate limiting if Redis fails
      }
    }

    console.log('Registration attempt from IP:', clientIp);

    // Basic input validation
    if (!username || !password) {
      return res.status(400).send('Username and password are required');
    }

    // reCAPTCHA verification
    const captchaResponse = req.body['g-recaptcha-response'];
    console.log('Received CAPTCHA token:', captchaResponse ? 'YES (length: ' + captchaResponse.length + ')' : 'NO');
    console.log('Request body keys:', Object.keys(req.body));

    const captchaResult = await verifyCaptcha(captchaResponse, secretKey);
    if (!captchaResult.success) {
      return res.status(400).json({ 
        error: captchaResult.error, 
        details: captchaResult.details 
      });
    }

    // Validation using helper functions
    const usernameError = validateUsername(username, password);
    if (usernameError) {
      return res.status(400).send(usernameError);
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).send(passwordError);
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).send(emailError);
    }

    // Check for existing users (but don't reveal existence to prevent enumeration)
    const existingUser = await User.findOne({ username });
    const existingEmail = await User.findOne({ email });
    
    let shouldCreateUser = !existingUser && !existingEmail;
    let shouldSendEmail = shouldCreateUser || (existingEmail && !existingEmail.isVerified);

    // Send verification email if appropriate
    if (shouldSendEmail) {
      try {
        // Generate verification code
        const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        // Store in verification store (Redis or memory)
        await setVerificationCode(email, verificationCode);
        
        await sendVerificationEmail.sendVerificationEmail(email, verificationCode);
        console.log('Verification email sent to:', email);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Continue with registration even if email fails
      }
    }

    // Create new user only if doesn't exist
    if (shouldCreateUser) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userType = req.body.isParent === 'true' ? 'parent' : 'student';    
      const user = new User({
        username,
        password: hashedPassword,
        email,
        usertype: userType,
        isVerified: false,
      });
      
      await user.save();

      // Create security log
      await createSecurityLog({
        userId: user._id,
        ipAddress: clientIp,
        action: 'registration_attempt',
        type: 'INFO',
        details: "--",
        country: "--",
        CountryCode: "--",
        currency: "--",
        Continent: "--",
        IsVPN: false,
        isTor: false,
        isProxy: false
      });
      
      console.log('User registered:', username);
    } else {
      console.log('Registration attempt for existing user/email:', username, email);
    }
    console.log('reCAPTCHA verification SUCCESS, score:', captchaResult.score);

    return res.status(200).json({ message: 'Registration successful! Check your email for verification code.' });
    
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = {
  router
};