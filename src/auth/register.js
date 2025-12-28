const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const router = express.Router();

// Import dependencies
const User = require('../models/User');
const { validateUsername, validatePassword, validateEmail, verifyCaptcha } = require('./validation');
const { createSecurityLog } = require('./security');
const sendVerificationEmail = require('./email_verification');
const { setVerificationCode } = require('../verificationStore');

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
    console.log('Registration attempt from IP:', req.clientIp);

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

    // Check for existing users
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send('User already exists');
    }
    
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).send('Email already in use');
    }

    // Send verification email
    try {
      // Generate verification code
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      // Store in verification store (Redis or memory)
      await setVerificationCode(email, verificationCode);
      
      await sendVerificationEmail.sendVerificationEmail(email, verificationCode);
      console.log('Verification email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with registration even if email fails
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const userType = req.body.isParent ? 'parent' : 'student';
    
    const user = new User({
      username,
      password: hashedPassword,
      email,
      usertype: userType,
      isVerified: false
    });
    
    await user.save();

    // Create security log
    await createSecurityLog({
      userId: user._id,
      ipAddress: req.clientIp,
      action: 'registration_attempt',
      type: 'INFO',
      details: "--"
    });
    
    console.log('User registered:', username);
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