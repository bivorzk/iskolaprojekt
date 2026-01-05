// Dependencies
const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const passwordStrength = require('zxcvbn');
const sendVerificationEmail = require('./auth/email_verification');
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Environment configuration
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Network dependencies
const realFetch = fetch.default || fetch;
const { SecurityLogs } = require('../config/database_queries');

// Data imports for validation
const banned_words_hu = require('../config/hu.json');
const banned_words = require('badwords-list').array;
const password_characters = require('../data/password_characters.json');
const disposable_email_list = require('../data/disposable_email_list.json');
const banned_passwords = require('../data/Most_used_passwords.json');

// Express setup
const app = express();
const router = express.Router();


// Configuration constants
const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
const secretKey = process.env.Server_Side_Captha;

// Global variables
let lastRegisteredEmail = null;

// Express middleware configuration
app.set('trust proxy', true);
app.use(express.urlencoded({ extended: true }));
router.use(express.urlencoded({ extended: true }));

// IP extraction middleware
app.use((req, res, next) => {
  let ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  
  // Clean up IPv6 mapped IPv4 addresses
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  
  // Convert localhost IPv6 to IPv4
  if (ip === '::1') {
    ip = '127.0.0.1';
  }
  
  req.clientIp = ip;
  next();
});

// Database connection
mongoose.connect(dbUrl + dbName)
  .then(() => console.log('Connected to MongoDB for user auth'))
  .catch(err => console.error('Could not connect to MongoDB for user auth', err));

// User Schema Definition
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'], 
    trim: true 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  usertype: {
    type: String,
    enum: ['admin', 'student', 'parent', 'teacher', 'frozen'], 
    default: "student"
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  balance: { 
    type: Number, 
    default: 0 
  }
});

const User = mongoose.model('User', userSchema);

// ===== VALIDATION HELPER FUNCTIONS =====

/**
 * Validates username format and content
 * @param {string} username - The username to validate
 * @param {string} password - The password to compare against
 * @returns {string|null} Error message or null if valid
 */
function validateUsername(username, password) {
  // Length validation
  if (username.length < 3 || username.length > 40) {
    return 'Username must be between 3 and 40 characters';
  }

  // Username cannot equal password
  if (username === password) {
    return 'Username and password cannot be the same';
  }

  // Character validation - allow letters, digits, and specific special characters
  const allowedChars = [
    ...password_characters.hungarian_lowercase,
    ...password_characters.hungarian_uppercase,
    ...password_characters.lowercase,
    ...password_characters.uppercase,
    ...password_characters.digits,
    '_', '.', '-', ' '
  ];

  for (const char of username) {
    if (!allowedChars.includes(char)) {
      return 'Username has to be made up of letters and digits special characters are not allowed for safety reasons';
    }
  }

  // Banned words validation
  for (const word of Object.values(banned_words_hu)) {
    if (username.toLowerCase().includes(word)) {
      return 'Username contains banned words';
    }
  }

  for (const word of banned_words) {
    if (username.toLowerCase().includes(word)) {
      return 'Username contains banned words';
    }
  }

  return null;
}

/**
 * Validates password strength and security requirements
 * @param {string} password - The password to validate
 * @returns {string|null} Error message or null if valid
 */
function validatePassword(password) {
  // Length validation
  if (password.length < 8 || password.length > 50) {
    return 'Password must be between 8 and 50 characters';
  }

  // Banned passwords check
  for (const bannedPassword of banned_passwords) {
    if (password.toLowerCase() === bannedPassword) {
      return 'Password is too common, choose a stronger one';
    }
  }

  // Character requirements validation
  const hasUppercase = [...password_characters.uppercase, ...password_characters.hungarian_uppercase]
    .some(char => password.includes(char));
  const hasDigit = Array.from(password_characters.digits)
    .some(char => password.includes(char));
  const hasSpecial = Array.from(password_characters.special)
    .some(char => password.includes(char));

  if (!hasUppercase || !hasDigit || !hasSpecial) {
    return 'Password must contain at least one uppercase letter, one digit, and one special character';
  }

  // Password strength check
  const strengthResult = passwordStrength(password);
  if (strengthResult.score <= 3) {
    return `Password is too weak, choose a stronger one ${strengthResult.feedback.warning} ${strengthResult.guesses}`;
  }

  // Dangerous characters check
  const dangerousPatterns = [
    '(', ')', '[', ']', '{', '}', '<', '>', '"', "'", '`', '\\', '/', '$'
  ];
  
  const hasDangerousChars = dangerousPatterns.some(char => password.includes(char)) ||
    password.includes('db.') || password.includes('DB.');

  if (hasDangerousChars) {
    return 'Please consider avoiding using matching pairs of brackets or quotes in your password, as they can sometimes cause issues during input or processing.';
  }

  // Banned words validation
  for (const word of Object.values(banned_words_hu)) {
    if (password.toLowerCase().includes(word)) {
      return 'Password contains banned words';
    }
  }

  for (const word of banned_words) {
    if (password.toLowerCase().includes(word)) {
      return 'Password contains banned words';
    }
  }

  return null;
}

/**
 * Validates email address
 * @param {string} email - The email to validate
 * @returns {string|null} Error message or null if valid
 */
function validateEmail(email) {
  if (disposable_email_list.includes(email)) {
    return 'This type of email is not allowed please use another email';
  }
  return null;
}

/**
 * Verifies reCAPTCHA response
 * @param {string} captchaResponse - The reCAPTCHA response token
 * @returns {Promise<Object>} Object with success status and optional error
 */
async function verifyCaptcha(captchaResponse) {
  if (!captchaResponse) {
    return { success: false, error: 'Please complete the CAPTCHA verification' };
  }

  if (!secretKey) {
    return { success: false, error: 'CAPTCHA configuration error' };
  }

  try {
    console.log('Starting reCAPTCHA verification...');
    
    const response = await realFetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: captchaResponse
      })
    });

    const data = await response.json();
    console.log('reCAPTCHA verification result:', data);
    
    if (!data.success) {
      console.log('reCAPTCHA verification failed:', data['error-codes']);
      return { 
        success: false, 
        error: 'CAPTCHA verification failed', 
        details: data['error-codes'] 
      };
    }

    // For tests set 0.5 to 0.1 to get successful registration more easily
    if (data.score <= 0.5) {
      console.log('CAPTCHA score too low:', data.score);
      return { success: false, error: 'CAPTCHA verification failed' };
    }

    console.log('reCAPTCHA verification SUCCESS, score:', data.score);
    return { success: true, score: data.score };

  } catch (captchaError) {
    console.error('reCAPTCHA verification error:', captchaError);
    return { success: false, error: 'CAPTCHA verification service error' };
  }
}


async function createSecurityLog({ userId, ipAddress, action, type, details }) {
  const hashedIP = crypto.createHash('sha256').update(ipAddress).digest('hex');
  
  const log = new SecurityLogs({
    userId,
    ipAddress: hashedIP,
    action,
    type,
    Timestamp: Date.now(),
    details
  });
  
  await log.save();
}

// ===== ROUTE HANDLERS =====

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

    const captchaResult = await verifyCaptcha(captchaResponse);
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
      await sendVerificationEmail.sendVerificationEmail(email);
      lastRegisteredEmail = email;
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
      usertype: userType
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
    console.log('Email registered:', lastRegisteredEmail);
    console.log('reCAPTCHA verification SUCCESS, score:', captchaResult.score);

    return res.status(200).json({ message: 'Registration successful!' });
    
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).send('Server error');
  }
});

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





// ===== MODULE SETUP =====

// Attach router to app
app.use(router);

// ===== MODULE EXPORTS =====

module.exports = app;
module.exports.lastRegisteredEmail = lastRegisteredEmail;
module.exports.User = User;
