const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const passwordStrength = require('zxcvbn')

require('dotenv').config();


// Banned words lists json files
const banned_words_hu = require('./hu.json');
const banned_words = require('badwords-list').array;
// Password characters json file
const password_characters = require('./password_characters.json');
// Disposable email domains list json file
const disposable_email_list = require('./disposable_email_list.json');

// Banned password list (too weak/most used) at least 8 characters
// Source:
const banned_passwords = require('./Most_used_passwords.json');


// https://www.google.com/recaptcha/api/siteverify (POST request) 


/*
const dbUrl = 'mongodb+srv://bzkugli_db_user:P5HxcxzhTC24DCt2@cluster0.kkpdosb.mongodb.net/';
const dbName = 'Projekt_vizsgaremek'; 
*/

const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
// Captcha secret key
const secretKey = process.env.Server_Side_Captha;


router.use(express.urlencoded({ extended: true }));

mongoose.connect(dbUrl + dbName)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email format'], trim: true }
});

const User = mongoose.model('User', userSchema);

// Registration route
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Verify reCAPTCHA v3 first
    const captchaResponse = req.body['g-recaptcha-response'];
    
    console.log('Received CAPTCHA token:', captchaResponse ? 'YES (length: ' + captchaResponse.length + ')' : 'NO');
    console.log('Request body keys:', Object.keys(req.body));
    
    if (!captchaResponse) {
      console.log('CAPTCHA token missing from request');
      return res.status(400).send('Please complete the CAPTCHA verification');
    }

    try {
      // Verify reCAPTCHA v3
      const response = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: secretKey,
          response: captchaResponse,
          remoteip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
        }),
      });

      if (!response.ok) {
        console.error('reCAPTCHA API response not ok:', response.status);
        return res.status(400).send('CAPTCHA verification service unavailable');
      }

      const data = await response.json();
      console.log('reCAPTCHA verification result:', data);
      
      if (!data.success) {
        console.error('reCAPTCHA verification failed:', data['error-codes']);
        return res.status(400).send('CAPTCHA verification failed');
      }

      // Check reCAPTCHA v3 score (0.0 = bot, 1.0 = human)
      if (data.score !== undefined) {
        console.log('reCAPTCHA score:', data.score);
        if (data.score < 0.5) {
          console.log('reCAPTCHA score too low, possible bot activity');
          return res.status(400).send('Registration blocked due to suspicious activity');
        }
      }

      // Check if action matches
      if (data.action && data.action !== 'register') {
        console.log('reCAPTCHA action mismatch:', data.action);
        return res.status(400).send('CAPTCHA verification failed - action mismatch');
      }

      console.log('reCAPTCHA verification successful');
    } catch (captchaError) {
      console.error('reCAPTCHA verification error:', captchaError);
      return res.status(500).send('CAPTCHA verification service error');
    }

    // Input validation
    // Username and password length checks
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

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, email });
    await user.save();
    res.status(201).send('User registered successfully');
    console.log('User registered:', username);
  }
   catch (err) {
    console.error('Registration error:', err);
    res.status(500).send('Server error');
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
      return res.status(400).send('Username and password are required');
    }

    const user = await User.findOne({ username });
    if (!user) {
      console.log('Username not found:', username);
      return res.status(401).send('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send('Invalid credentials');
    }

    res.status(200).send(`Welcome, ${username}`);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;