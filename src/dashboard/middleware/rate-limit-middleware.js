const path = require('path');
const redisLuaService = require('../../services/redis-lua-service');

const defaultLimitPage = path.join(__dirname, '../../../public/429/429.html');

function buildRateLimitHeaders(maxRequests, currentCount) {
  return {
    'X-RateLimit-Limit': `${maxRequests}`,
    'X-RateLimit-Remaining': `${Math.max(0, maxRequests - currentCount)}`,
    'X-RateLimit-Reset': `${Math.floor(Date.now() / 1000) + 60}`
  };
}

function createDashboardRateLimiter({ prefix, windowSeconds, maxRequests }) {
  if (!prefix || !windowSeconds || !maxRequests) {
    throw new Error('createDashboardRateLimiter requires prefix, windowSeconds, and maxRequests');
  }

  return async function dashboardRateLimit(req, res, next) {
    try {
      const key = `ratelimit:${prefix}:${req.session.user?.id || req.ip}`;
      const result = await redisLuaService.checkRateLimit(key, windowSeconds, maxRequests);

      if (!result.allowed) {
        return res.status(429).sendFile(defaultLimitPage);
      }

      res.set(buildRateLimitHeaders(maxRequests, result.currentCount));
      next();
    } catch (error) {
      console.log('Rate limiting failed, allowing request:', error.message);
      next();
    }
  };
}

module.exports = { createDashboardRateLimiter };
