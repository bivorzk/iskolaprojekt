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

  // subdocument schema for user personal information
  const userPersonalInfoSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    firstName: { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
    dateOfBirth: { type: Date, required: false },
    grade: { type: String, enum: ['1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade', '13th Grade'], required: false },
    school: { type: String, trim: true, maxlength: 100 },
    address: {
      street: { type: String, trim: true, maxlength: 100 },
      city: { type: String, trim: true, maxlength: 50 },
      state: { type: String, trim: true, maxlength: 50 },
      postalCode: { type: String, trim: true, match: [/^\d{4,10}$/, 'Invalid postal code format'] },
      country: { type: String, trim: true, maxlength: 50 }
    }
  });


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
    enum: ['admin', 'student', 'parent', 'teacher', 'frozen', 'editor'], 
    default: "student"
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  balance: { 
    type: Number, 
    default: 0 
  },
  isBanned : {
    type: Boolean,
    default: false,
    banReason: {
      type: String,
      default: ''
    }
  },
  userPersonalInfo: [userPersonalInfoSchema], // Subdocument for personal info
  
  // E2EE encryption fields
  encryption: {
    // Public key for receiving encrypted messages (stored as base64)
    publicKey: {
      type: String,
      required: false
    },
    
    // Key generation timestamp
    keyGeneratedAt: {
      type: Date,
      required: false
    },
    
    // Whether the user has E2EE enabled
    isE2EEEnabled: {
      type: Boolean,
      default: false
    },
    
    // Encryption algorithm details
    keyAlgorithm: {
      type: String,
      default: 'RSA-OAEP'
    }
  }
});



userSchema.index({ usertype: 1 }); 
userSchema.index({ email: 1, usertype: 1 }); 

const User = mongoose.model('User', userSchema);

module.exports = User;