const { redisClient, isRedisAvailable } = require('./redis');

const verificationCodes = new Map(); // Fallback in-memory store

async function setVerificationCode(email, code, expirationSeconds = 600) {
  if (isRedisAvailable) {
    try {
      await redisClient.setex(`verification:${email}`, expirationSeconds, code);
    } catch (err) {
      console.log('Redis set failed, using memory store', err);
      verificationCodes.set(email, { code, expires: Date.now() + expirationSeconds * 1000 });
    }
  } else {
    verificationCodes.set(email, { code, expires: Date.now() + expirationSeconds * 1000 });
  }
}

async function getVerificationCode(email) {
  if (isRedisAvailable) {
    try {
      return await redisClient.get(`verification:${email}`);
    } catch (err) {
      console.log('Redis get failed, using memory store', err);
      const entry = verificationCodes.get(email);
      if (entry && entry.expires > Date.now()) {
        return entry.code;
      }
      return null;
    }
  } else {
    const entry = verificationCodes.get(email);
    if (entry && entry.expires > Date.now()) {
      return entry.code;
    }
    return null;
  }
}

async function deleteVerificationCode(email) {
  if (isRedisAvailable) {
    try {
      await redisClient.del(`verification:${email}`);
    } catch (err) {
      console.log('Redis del failed, using memory store', err);
    }
  }
  verificationCodes.delete(email);
}

module.exports = {
  setVerificationCode,
  getVerificationCode,
  deleteVerificationCode
};