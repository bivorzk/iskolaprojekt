/**
 * PreKey model — stores one-time prekeys (OPKs) per device.
 * High-churn collection: OPKs are deleted immediately after use.
 */
const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const preKeySchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deviceId:  { type: String, required: true },
  keyId:     { type: Number, required: true },          // monotonically increasing per user+device
  publicKey: { type: String, required: true },          // ECDH P-256 SPKI base64
  used:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

preKeySchema.index({ userId: 1, deviceId: 1, used: 1 });
preKeySchema.index({ userId: 1, keyId: 1 }, { unique: true });

const PreKey = mongoose.model('PreKey', preKeySchema);
module.exports = PreKey;
