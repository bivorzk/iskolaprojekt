let redisClient = null;

try {
  const { redisClient: client } = require('../../redis');
  redisClient = client;
} catch (error) {
  console.log('Redis not available in cache service:', error.message);
}

function isRedisAvailable() {
  return redisClient && redisClient.isOpen;
}


function cacheResult(cacheKey, ttl = 300) {
  return async (req, res, next) => {
    if (!isRedisAvailable()) {
      return next();
    }

    try {
      // Support both string keys and functions that generate keys
      const key = typeof cacheKey === 'function' ? cacheKey(req) : cacheKey;

      const cached = await redisClient.get(key);
      if (cached) {
        const parsedData = JSON.parse(cached);
        return res.status(200).json(parsedData);
      }

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache response
      res.json = function(data) {
        if (isRedisAvailable()) {
          redisClient.setEx(key, ttl, JSON.stringify(data)).catch(err =>
            console.error('Redis cache set error:', err)
          );
        }
        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}


async function invalidateCache(keys) {
  if (!isRedisAvailable() || !keys || keys.length === 0) {
    return;
  }

  try {
    await redisClient.del(keys);
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

async function getCached(key) {
  if (!isRedisAvailable()) {
    return null;
  }

  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

async function setCached(key, value, ttl = 300) {
  if (!isRedisAvailable()) {
    return;
  }

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

const { startChangeStreams, stopChangeStreams } = require('../../cache/ChangeStreamManager');

module.exports = {
  cacheResult,
  invalidateCache,
  getCached,
  setCached,
  isRedisAvailable,
  startChangeStreams,
  stopChangeStreams,
};