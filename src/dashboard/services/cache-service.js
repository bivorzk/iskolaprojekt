const { redisClient } = require('../../redis');
const { startChangeStreams, stopChangeStreams } = require('../../cache/ChangeStreamManager');

function isRedisAvailable() {
  return Boolean(redisClient?.isOpen);
}

function normalizeKeys(keys) {
  if (!keys) return [];
  if (typeof keys === 'string') return [keys];
  if (Array.isArray(keys)) return keys.filter(Boolean);
  return [];
}

async function resolveCacheKey(cacheKey, req) {
  if (typeof cacheKey === 'function') {
    return await cacheKey(req);
  }
  return cacheKey;
}

function cacheResult(cacheKey, ttlOrOptions = 300) {
  const options = typeof ttlOrOptions === 'object' && ttlOrOptions !== null
    ? ttlOrOptions
    : { ttl: ttlOrOptions };

  const ttl = Number.isFinite(options.ttl) ? options.ttl : parseInt(options.ttl, 10) || 300;
  const shouldCache = typeof options.shouldCache === 'function'
    ? options.shouldCache
    : () => true;

  return async (req, res, next) => {
    if (req.method !== 'GET' || !isRedisAvailable()) {
      return next();
    }

    let key;
    try {
      key = await resolveCacheKey(cacheKey, req);
    } catch (error) {
      console.error('Cache key resolution error:', error);
      return next();
    }

    if (!key) {
      return next();
    }

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        const parsedData = JSON.parse(cached);
        return res.status(200).json(parsedData);
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    const cacheResponse = (data) => {
      const statusOk = res.statusCode >= 200 && res.statusCode < 300;
      if (!statusOk || !isRedisAvailable() || !shouldCache(req, res, data)) {
        return;
      }

      try {
        redisClient.setEx(key, ttl, JSON.stringify(data)).catch(err =>
          console.error('Redis cache set error:', err)
        );
      } catch (err) {
        console.error('Cache serialization error:', err);
      }
    };

    res.json = function (data) {
      cacheResponse(data);
      return originalJson(data);
    };

    res.send = function (body) {
      if (body && typeof body === 'object' && !(body instanceof Buffer)) {
        cacheResponse(body);
      }
      return originalSend(body);
    };

    next();
  };
}

async function invalidateCache(keys) {
  if (!isRedisAvailable()) {
    return;
  }

  const normalizedKeys = normalizeKeys(keys);
  if (normalizedKeys.length === 0) {
    return;
  }

  try {
    await redisClient.del(normalizedKeys);
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

module.exports = {
  cacheResult,
  invalidateCache,
  getCached,
  setCached,
  isRedisAvailable,
  startChangeStreams,
  stopChangeStreams,
};