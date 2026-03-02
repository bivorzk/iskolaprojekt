/**
 * DeviceSyncSession — ephemeral cross-device key sync relay.
 * The server stores the AES-GCM ciphertext only (established via ECDH between devices).
 * TTL: 10 minutes. Documents are auto-deleted via the expireAfterSeconds index.
 */
const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const deviceSyncSchema = new mongoose.Schema({
  // The device that is being onboarded (awaiting the sync payload)
  responderDeviceId:  { type: String, required: true, index: true },
  // The device that uploaded the sync payload (already trusted)
  initiatorDeviceId:  { type: String },
  // Encrypted sync payload (ECDH + AES-GCM; server cannot decrypt)
  encryptedPayload:   { type: String, required: true },
  iv:                 { type: String, required: true },
  // Ephemeral ECDH public key used by initiator to establish shared secret
  ephemeralKey:       { type: String, required: true },
  // Auto-expire after 10 minutes
  expiresAt:          { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) }
});

// TTL index — MongoDB removes documents automatically after expiresAt
deviceSyncSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const DeviceSyncSession = mongoose.model('DeviceSyncSession', deviceSyncSchema);
module.exports = DeviceSyncSession;
