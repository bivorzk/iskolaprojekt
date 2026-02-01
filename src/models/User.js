const mongoose = require('mongoose');
const path = require('path');

// Environment configuration
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Configuration constants
const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

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

userSchema.index({ usertype: 1 }); 
userSchema.index({ email: 1, usertype: 1 }); 

const User = mongoose.model('User', userSchema);

module.exports = User;