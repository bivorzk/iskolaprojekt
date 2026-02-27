const mongoose = require('mongoose');
const path = require('path');

// Environment configuration
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Database connection (reuse existing connection)
const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

const messageSchema = new mongoose.Schema({
  encryptedContent: {
    type: String,
    required: true
  },
  
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Encryption metadata
  encryptionMetadata: {
    senderEncryptedKey: {
      type: String,
      required: true
    },
    
    recipientEncryptedKey: {
      type: String,
      required: true
    },
    
    // Initialization vector for AES encryption
    iv: {
      type: String,
      required: true
    },
    
    algorithm: {
      type: String,
      default: 'AES-GCM'
    }
  },
  
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  readAt: {
    type: Date
  },
  
  messageType: {
    type: String,
    enum: ['text', 'file', 'image'],
    default: 'text'
  }
});

messageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, status: 1 });
messageSchema.index({ createdAt: -1 });

messageSchema.virtual('participants').get(function() {
  return [this.senderId, this.recipientId];
});

messageSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

const Message = mongoose.model('Message', messageSchema);

module.exports = { Message };