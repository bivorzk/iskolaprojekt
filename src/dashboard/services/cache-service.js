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

/**
 * Middleware to cache API responses
 * @param {string|function} cacheKey - Cache key or function that returns cache key
 * @param {number} ttl - Time to live in seconds
 */
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

/**
 * Invalidate multiple cache keys
 * @param {string[]} keys - Array of cache keys to invalidate
 */
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

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Cached value or null
 */
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

/**
 * Set cached value
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 */
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

module.exports = {
  cacheResult,
  invalidateCache,
  getCached,
  setCached,
  isRedisAvailable
};