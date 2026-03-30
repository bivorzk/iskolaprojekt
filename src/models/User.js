const mongoose = require('mongoose');
const path = require('path');
const { act } = require('react');

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
  lastActive : {
    type: Date,
    default: Date.now
  }
  ,
  userPersonalInfo: [userPersonalInfoSchema], // Subdocument for personal info
  
  // ── V2 E2EE identity (ECDH P-256) ────────────────────────────────────────
  identity: {
    publicKey:        { type: String },          // IK public SPKI base64
    signingPublicKey: { type: String },          // ECDSA P-256 signing pub
    keyId:            { type: String },          // SHA-256 fingerprint (first 16 hex chars)
    registeredAt:     { type: Date },
    isE2EEEnabled:    { type: Boolean, default: false }
  },

  // ── Registered devices ────────────────────────────────────────────────────
  devices: [{
    deviceId:      { type: String, required: true },
    publicKey:     { type: String, required: true },  // DIK public SPKI base64
    label:         { type: String, default: 'Unknown device' },
    registeredAt:  { type: Date,   default: Date.now },
    lastSeenAt:    { type: Date,   default: Date.now },
    signedPreKey: {
      keyId:     { type: String },
      publicKey: { type: String },
      signature: { type: String },
      createdAt: { type: Date }
    }
  }],

  // ── Recovery blob (AES-GCM; server is blind) ──────────────────────────────
  recoveryBlob: {
    encryptedData: { type: String },
    iv:            { type: String },
    salt:          { type: String },
    storedAt:      { type: Date }
  },

  // ── V1 legacy fields (kept for migration, do not use for new messages) ────
  encryption: {
    publicKey:          { type: String },
    keyGeneratedAt:     { type: Date },
    isE2EEEnabled:      { type: Boolean, default: false },
    keyAlgorithm:       { type: String,  default: 'RSA-OAEP' },
    encryptedPrivateKey:{ type: String },
    keySalt:            { type: String },
    keyIv:              { type: String },
    hasKeyBackup:       { type: Boolean, default: false }
  },
  is2Active: {
    type: Boolean,
    default: false,
    activatedAt: { type: Date, default: Date.now },
    deactivatedAt: { type: Date }
  }
});



userSchema.index({ usertype: 1 }); 
userSchema.index({ email: 1, usertype: 1 }); 

const User = mongoose.model('User', userSchema);

module.exports = User;