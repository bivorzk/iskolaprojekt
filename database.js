const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();


require('dotenv').config();


// Banned words lists json files
const banned_words_hu = require('./hu.json');
const banned_words = require('badwords-list').array;
// Password characters json file
const password_characters = require('./password_characters.json');

// Banned password list (too weak/most used) at least 8 characters
// Source:
const banned_passwords = require('./Most_used_passwords.json');


/*
const dbUrl = 'mongodb+srv://bzkugli_db_user:P5HxcxzhTC24DCt2@cluster0.kkpdosb.mongodb.net/';
const dbName = 'Projekt_vizsgaremek'; 
*/

const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

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

    // Input validation
    if (!username || !password || username.length < 3 || password.length <= 8) {
      return res.status(400).send('Invalid username or password');
    }
    
    if (username.length >= 40 || password.length >= 50) {
      return res.status(400).send('Username or password too long Please shorten it');
    }

    if (username === password) {
      return res.status(400).send('Username and password cannot be the same');
    }
 
    for (const word of banned_words_hu ) {
      if (username.toLowerCase().includes(word) || password.toLowerCase().includes(word)) {
        return res.status(400).send('Username or password contains banned words');
      }
    }

    for (const word of banned_words) {
      if (username.toLowerCase().includes(word) || password.toLowerCase().includes(word)) {
        return res.status(400).send('Username or password contains banned words');
      }
    }
    
    for (const bannedPassword of banned_passwords) {
      if (password.toLowerCase() === bannedPassword) {
        return res.status(400).send('Password is too common, choose a stronger one');
      }
    }

    for (const char of password_characters.uppercase + password_characters.hungarian_uppercase) {
      if (!password.toLowerCase().includes(char)) {
        return res.status(400).send('Password must contain uppercase, lowercase, digit, and special character');
      }
    }
    for (const char of password_characters.digits) {
      if (!password.toLowerCase().includes(char)) {
        return res.status(400).send('Password must contain uppercase, lowercase, digit, and special character');
      }
    }

    for (const char of password_characters.special) {
      if (!password.toLowerCase().includes(char)) {
        return res.status(400).send('Password must contain uppercase, lowercase, digit, and special character');
      }
    }

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