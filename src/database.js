const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const app = express();
const router = express.Router();
const passwordStrength = require('zxcvbn');
const sendVerificationEmail = require('./auth/email_verification');
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
// const fetch = require('node-fetch'); // if doesnt work realFetch use this one
const realFetch = fetch.default || fetch;
const { SecurityLogs } = require('../config/database_queries')


// Banned words lists json files
const banned_words_hu = require('../config/hu.json');
const banned_words = require('badwords-list').array;
// Password characters json file
const password_characters = require('../data/password_characters.json');
// Disposable email domains list json file
const disposable_email_list = require('../data/disposable_email_list.json');

// Banned password list (too weak/most used) at least 8 characters
// Source:
const banned_passwords = require('../data/Most_used_passwords.json');


// https://www.google.com/recaptcha/api/siteverify (POST request) 




const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
// Captcha secret key
const secretKey = process.env.Server_Side_Captha;

let lastRegisteredEmail = null;


// Trust proxy for correct IP extraction
app.set('trust proxy', true);

// IP middleware
app.use((req, res, next) => {
  let ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  if (ip && ip.startsWith('::ffff:')) ip = ip.substring(7);
  if (ip === '::1') ip = '127.0.0.1';
  req.clientIp = ip;
  next();
});

app.use(express.urlencoded({ extended: true }));
router.use(express.urlencoded({ extended: true }));

mongoose.connect(dbUrl + dbName)
  .then(() => console.log('Connected to MongoDB for user auth'))
  .catch(err => console.error('Could not connect to MongoDB for user auth', err));

const userSchema =  new mongoose.Schema({ 
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email format'], trim: true },
  isVerified: { type: Boolean, default: false }, // Email verification status
  usertype: {type: String,enum:['admin', 'student', 'parent', 'teacher','frozen'], default: "student"}, // Defines user type e.g if they are admin, student,parent or anything else default = student
  createdAt: { type: Date, default: Date.now }, // Account creation date
  balance : { type: Number, default: 0 } // User balance for in-app purchases
});

const User = mongoose.model('User', userSchema);

// Registration route

// Registration route
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    console.log('Registration attempt from IP:', req.clientIp);


    // Verify reCAPTCHA v3 first
    const captchaResponse = req.body['g-recaptcha-response'];
    
    console.log('Received CAPTCHA token:', captchaResponse ? 'YES (length: ' + captchaResponse.length + ')' : 'NO');
    console.log('Request body keys:', Object.keys(req.body));
    
    if (!captchaResponse) {
      console.log('CAPTCHA token missing from request');
      return res.status(400).send('Please complete the CAPTCHA verification');
    }

    if (req.body.isParent) {
    req.body.usertype = 'parent';
    }

    try {
      console.log('Starting reCAPTCHA verification...');
      console.log('Secret key present:', secretKey ? 'YES' : 'NO');
      
      // Verify reCAPTCHA v3
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
      
// For tests set 0.5 to 0.1 to get a sucessful registration more easily 
      if (data.success && data.score <= 0.5) {
      console.log('CAPTCHA score too low:', data.score);
      return res.status(400).send('CAPTCHA verification failed');
    }
      
      if (!data.success) {
        console.log('reCAPTCHA verification failed:', data['error-codes']);
        return res.status(400).json({ 
          error: 'CAPTCHA verification failed', 
          details: data['error-codes'] 
        });
      }

      if (!username || !password) {
      return res.status(400).send('Username and password are required');
    }
    if (username.length < 3 || username.length > 40) {
      return res.status(400).send('Username must be between 3 and 40 characters');
    }
    if (password.length < 8 || password.length > 50) {
      return res.status(400).send('Password must be between 8 and 50 characters');
    }


    // Username security checks

    if (username === password) {
      return res.status(400).send('Username and password cannot be the same');
    }

  const usernameletters = [...password_characters.hungarian_lowercase,
     ...password_characters.hungarian_uppercase,
      ...password_characters.lowercase,
    ...password_characters.uppercase]


    for (const char of username) {
      if (!usernameletters.includes(char) && !password_characters.digits.includes(char) && char !== '_' && char !== '.' && char !== '-' && char !== " ") {
        return res.status(400).send('Username has to be made up of letters and digits special characters are not allowed for safety reasosn');
      }
    }



    for (const word of Object.values(banned_words_hu)) {
      if (username.toLowerCase().includes(word) || password.toLowerCase().includes(word)) {
        return res.status(400).send('Username or password contains banned words');
      }
    }

    for (const word of banned_words) {
      if (username.toLowerCase().includes(word) || password.toLowerCase().includes(word)) {
        return res.status(400).send('Username or password contains banned words');
      }
    }
  
    // Password security checks

    for (const bannedPassword of banned_passwords) {
      if (password.toLowerCase() === bannedPassword) {
        return res.status(400).send('Password is too common, choose a stronger one');
      }
    }

    // Check for at least one uppercase (including Hungarian), one digit, and one special character
const hasUppercase = [...password_characters.uppercase, ...password_characters.hungarian_uppercase].find(char => password.includes(char));
const hasDigit = Array.from(password_characters.digits).find(char => password.includes(char));
const hasSpecial = Array.from(password_characters.special).find(char => password.includes(char));

if (!hasUppercase || !hasDigit || !hasSpecial) {
  return res.status(400).send('Password must contain at least one uppercase letter, one digit, and one special character');
}

    if (passwordStrength(password).score <= 3) {
      return res.status(400).send('Password is too weak, choose a stronger one' + passwordStrength(password).feedback.warning + ' ' + passwordStrength(password).guesses);
    }

    if (password.includes('(') && password.includes(')') ||
     password.includes('[') && password.includes(']') ||
      password.includes('{') && password.includes('}') ||
       password.includes('<') && password.includes('>') ||
        password.includes('"') && password.includes('"') ||
         password.includes("'") && password.includes("'") ||
         password.includes("`") && password.includes("`") ||
         password.includes("\\") || password.includes("/") ||
         password.includes("\'") || password.includes('\"') ||
         password.includes("db.") || password.includes("DB.") ||
         password.includes("$")
      )  {
      return res.status(400).send('Please consider avoiding using matching pairs of brackets or quotes in your password, as they can sometimes cause issues during input or processing.');
    }

// Email security checks

    if (disposable_email_list.includes(email)) {
      return res.status(400).send('This type of email is not allowed please user another email');
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

  
  try {
    await sendVerificationEmail.sendVerificationEmail(email);
    lastRegisteredEmail = email;
    console.log('Verification email sent to:', email);
  } catch (emailError) {
    console.error('Failed to send verification email:', emailError);
    // Continue with registration even if email fails
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      email,
      usertype: req.body.usertype || 'student'
    });
    await user.save();

    const hashedIP = crypto.createHash('sha256').update(req.clientIp).digest('hex');

    let logUser = await User.findOne({ username });
    const log = new SecurityLogs({
      userId: logUser ? logUser._id : null,
      ipAddress: hashedIP,
      action: 'registration_attempt',
      type: 'INFO',
      Timestamp: Date.now(),
      details: "--"
    });
    
    await log.save();
    
    console.log('User registered:', username);
    console.log('Email registered:', lastRegisteredEmail);

    console.log('reCAPTCHA verification SUCCESS, score:', data.score);

    // Only send one response:
    return res.status(200).json({ message: 'Registration successful!' });
      
      
    } catch (captchaError) {
      console.error('reCAPTCHA verification error:', captchaError);
      return res.status(500).send('CAPTCHA verification service error');
    }
    

    // Input validation
    // Username and password length checks
    
  }
   catch (err) {
    console.error('Registration error:', err);
    res.status(500).send('Server error');
  }

});

// Login route
router.post('/login', async (req, res) => {
  try {
   // console.log('Login request body:', req.body); Uncomment for debugging purposes
    const { username, password } = req.body;
    
    console.log('Username received:', username);
    console.log('Password received:', password ? '***' : 'undefined');

    // Input validation
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).send('Username and password are required');
    }

    const user = await User.findOne({ username });
    if (!user) {
      console.log('Username not found:', username);
      return res.status(401).send('Invalid credentials');
    }

    console.log('User found:', user.username);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(401).send('Invalid credentials');
    }

    const token = jwt.sign({ id: user.id, username: user.username }, 'ourSecretKey');
    const decoded = jwt.verify(token, 'ourSecretKey');
    const currentUser = decoded;


  const ip = req.clientIp;
  const hashedIP = crypto.createHash('sha256').update(ip).digest('hex');

    
    
  const lastLog = await SecurityLogs.findOne({ userId: user._id })
  .sort({ Timestamp: -1 }); // Get most recent log

    // Check if this IP has been used before by comparing hashes
    const ipMatches = lastLog && lastLog.ipAddress === hashedIP;
    
  
    if (!ipMatches && lastLog) {
      await SecurityLogs.create({
        userId: user._id,
        ipAddress: hashedIP,
        action: 'ip_mismatch_login_attempt',
        type: 'WARNING',
        Timestamp: Date.now(),
        details: `Login attempt from different IP address`
      });
    } else {
      // Log successful login from known or new IP
      await SecurityLogs.create({
        userId: user._id,
        ipAddress: hashedIP,
        action: 'login_attempt',
        type: 'INFO',
        Timestamp: Date.now(),
        details: ipMatches ? 'Login from known IP' : 'First login for user'
      });
    }
    
    console.log('Login successful for:', username);
      req.session.user = {
        id: user.id,
        username: user.username,
        usertype: user.usertype,
        email: user.email,
        IsLoggedIn: true,
        jwtToken: currentUser
      }; // Store user details in session

    res.status(200).send(`Welcome, ${username}`);


  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Server error');
  }
});





console.log('======================================')
console.log(lastRegisteredEmail);
console.log(lastRegisteredEmail);
console.log(lastRegisteredEmail);
console.log(lastRegisteredEmail);
console.log(lastRegisteredEmail);
console.log(lastRegisteredEmail);
console.log(lastRegisteredEmail);
console.log('======================================')


// Attach router to app
app.use(router);

module.exports = app;
module.exports.lastRegisteredEmail = lastRegisteredEmail;
module.exports.User = User;
