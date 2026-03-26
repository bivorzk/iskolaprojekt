-- Lua script for advanced rate limiting
-- KEYS: [1] rate_limit_key
-- ARGV: [1] window_size_seconds, [2] max_requests, [3] current_timestamp
---@diagnostic disable: undefined-global -- Disable undefined global warnings

local function fnv1a(str)
    local hash = 2166136261
    for i = 1, #str do
        hash = bit.bxor(hash, string.byte(str, i))
        hash = bit.band(hash * 16777619, 0xFFFFFFFF)
    end
    return tostring(hash)
end

-- Hash the input key to keep Redis keys short and uniform
local key = "rl:" .. fnv1a(KEYS[1])
local window = tonumber(ARGV[1])
local max_requests = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local current_count = redis.call('ZCARD', key)

if current_count >= max_requests then
    return {0, current_count}
end

-- Using 'now' as both score and member to save space
redis.call('ZADD', key, now, now)
redis.call('EXPIRE', key, window)

return {1, current_count + 1}