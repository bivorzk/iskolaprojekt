
const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const storageBlobSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  blobType:         { type: String, required: true,
                      enum: ['message_log', 'session_state', 'skipped_keys'] },
  partitionKey:     { type: String, required: true },  // e.g. conversationId or deviceId
  encryptedPayload: { type: String, required: true },  // AES-256-GCM base64
  iv:               { type: String, required: true },  // 96-bit GCM IV base64
  version:          { type: Number, default: 1 },
  updatedAt:        { type: Date,   default: Date.now }
});

storageBlobSchema.index({ userId: 1, blobType: 1, partitionKey: 1 }, { unique: true });
storageBlobSchema.index({ userId: 1, updatedAt: -1 });

const StorageBlob = mongoose.model('StorageBlob', storageBlobSchema);
module.exports = StorageBlob;
