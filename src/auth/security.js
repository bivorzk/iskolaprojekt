const crypto = require('crypto');
const { SecurityLogs } = require('../../config/database_queries');
require('dotenv').config();



// Create a security log entry
async function createSecurityLog({ userId, ipAddress, action, type, details }) {
  // const hashedIP = crypto.createHash('sha256').update(ipAddress).digest('hex');
  
  // Hash IP address using HMAC with secret key from env variable for better security
  function hashIP(ipAddress) {
  return crypto.createHmac("sha256", process.env.IP_HASH_SECRET).update(ipAddress).digest("hex");
}

  const log = new SecurityLogs({
    userId,
    ipAddress: hashIP(ipAddress),
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