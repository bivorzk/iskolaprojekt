const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

const messageSchema = new mongoose.Schema({
  // Routing
  senderId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderDeviceId:    { type: String },
  recipientDeviceId: { type: String },

  schemaVersion:     { type: Number, default: 2 },


  header: {
    dh:  { type: String },   // sender ratchet public key (SPKI base64)
    n:   { type: Number },   // message number in current chain
    pn:  { type: Number }    // messages in previous sending chain
  },
  // X3DH bootstrap header — only present on the very first message of a session
  x3dhHeader: {
    identityKey:       { type: String },
    ephemeralKey:      { type: String },
    spkKeyId:          { type: String },
    opkKeyId:          { type: mongoose.Schema.Types.Mixed },  // Number | null
    recipientDeviceId: { type: String }
  },
  ciphertext: { type: String },   // AES-256-GCM ciphertext (base64)
  iv:         { type: String },   // 96-bit GCM IV (base64)

  // ── v1 legacy fields (kept for migration reads) ───────────────────────────
  encryptedContent:   { type: String },
  encryptionMetadata: {
    senderEncryptedKey:    { type: String },
    recipientEncryptedKey: { type: String },
    iv:                    { type: String },
    algorithm:             { type: String, default: 'AES-GCM' }
  },

  status:      { type: String, enum: ['sent', 'delivered', 'read', 'replaced'], default: 'sent' },
  messageType: { type: String, enum: ['text', 'file', 'image'], default: 'text' },
  createdAt:   { type: Date,   default: Date.now },
  readAt:      { type: Date },

  senderKeyRecovery: {
    needed:          { type: Boolean, default: false },
    failed:          { type: Boolean, default: false },
    senderPublicKey: { type: String },
    senderKeyId:     { type: String }
  }
});

messageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, status: 1 });
messageSchema.index({ recipientId: 1, 'senderKeyRecovery.needed': 1 });
messageSchema.index({ recipientDeviceId: 1, status: 1 });
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