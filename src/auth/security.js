const crypto = require('crypto');
const { SecurityLogs } = require('../../config/database_queries');


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