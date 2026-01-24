-- Lua script for advanced rate limiting
-- KEYS: [1] rate_limit_key
-- ARGV: [1] window_size_seconds, [2] max_requests, [3] current_timestamp

local key = KEYS[1]
local window = tonumber(ARGV[1])
local max_requests = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Remove old entries outside the window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count current requests in window
local current_count = redis.call('ZCARD', key)

-- Check if limit exceeded
if current_count >= max_requests then
    return {0, current_count} -- 0 = blocked, current count
end

-- Add current request
redis.call('ZADD', key, now, now)

-- Set expiration on the key (cleanup)
redis.call('EXPIRE', key, window)

return {1, current_count + 1} -- 1 = allowed, new count