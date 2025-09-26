const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const mongodb = require('mongodb');

const dbUrl = 'mongodb+srv://bzkugli_db_user:P5HxcxzhTC24DCt2@cluster0.kkpdosb.mongodb.net/';
const dbName = 'Projekt_vizsgaremek';

router.use(express.urlencoded({ extended: true }));

mongoose.connect(dbUrl + dbName, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

router.post('/', async (req, res) => {
  const { username, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).send('User already exists');
  }

  // Create new user
  const user = new User({ username, password });
  await user.save();
  res.status(201).send('User registered successfully');
  console.log(username, password);
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({
    username,
    password
  });
  if (!user) {
    return res.status(401).send('Authentication failed');
  }
  res.status(200).send(`Welcome, ${username}`, password);
  console.log(username, password);
});

module.exports = router;
