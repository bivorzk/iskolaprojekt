const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const deviceSyncSchema = new mongoose.Schema({
  responderDeviceId:  { type: String, required: true, index: true },
  initiatorDeviceId:  { type: String },
  encryptedPayload:   { type: String, required: true },
  iv:                 { type: String, required: true },
  ephemeralKey:       { type: String, required: true },
  expiresAt:          { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) }
});

// TTL index — MongoDB removes documents automatically after expiresAt
deviceSyncSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const DeviceSyncSession = mongoose.model('DeviceSyncSession', deviceSyncSchema);
module.exports = DeviceSyncSession;
