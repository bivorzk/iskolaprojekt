const mongoose = require('mongoose');
const path = require('path');

// Environment configuration
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Database connection (reuse existing connection)
const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

// Message Schema for E2EE Chat
const messageSchema = new mongoose.Schema({
  // Encrypted message content (cannot be read by server)
  encryptedContent: {
    type: String,
    required: true
  },
  
  // Sender information
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Recipient information
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Encryption metadata
  encryptionMetadata: {
    // Encrypted symmetric key for sender (encrypted with sender's public key)
    senderEncryptedKey: {
      type: String,
      required: true
    },
    
    // Encrypted symmetric key for recipient (encrypted with recipient's public key)
    recipientEncryptedKey: {
      type: String,
      required: true
    },
    
    // Initialization vector for AES encryption
    iv: {
      type: String,
      required: true
    },
    
    // Algorithm used for encryption
    algorithm: {
      type: String,
      default: 'AES-GCM'
    }
  },
  
  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  readAt: {
    type: Date
  },
  
  // Optional: Message type for future extensions
  messageType: {
    type: String,
    enum: ['text', 'file', 'image'],
    default: 'text'
  }
});

// Indexes for performance
messageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, status: 1 });
messageSchema.index({ createdAt: -1 });

// Virtual for conversation participants
messageSchema.virtual('participants').get(function() {
  return [this.senderId, this.recipientId];
});

// Method to mark message as read
messageSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

const Message = mongoose.model('Message', messageSchema);

module.exports = { Message };