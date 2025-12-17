const crypto = require('crypto');
const { SecurityLogs } = require('../../config/database_queries');

/**
 * Creates a security log entry
 * @param {Object} params - Log parameters
 * @param {string} params.userId - User ID
 * @param {string} params.ipAddress - Client IP address
 * @param {string} params.action - Action performed
 * @param {string} params.type - Log type (INFO, WARNING, ERROR)
 * @param {string} params.details - Additional details
 * @returns {Promise<void>}
 */
async function createSecurityLog({ userId, ipAddress, action, type, details }) {
  const hashedIP = crypto.createHash('sha256').update(ipAddress).digest('hex');
  
  const log = new SecurityLogs({
    userId,
    ipAddress: hashedIP,
    action,
    type,
    Timestamp: Date.now(),
    details
  });
  
  await log.save();
}

module.exports = {
  createSecurityLog
};