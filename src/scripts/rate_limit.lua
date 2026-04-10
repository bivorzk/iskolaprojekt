-- Lua script for advanced rate limiting with error handling
-- KEYS: [1] rate_limit_key
-- ARGV: [1] window_size_seconds, [2] max_requests, [3] current_timestamp
---@diagnostic disable: undefined-global -- Disable undefined global warnings

-- Error handling utilities (inlined for Redis Lua compatibility)
local function log(level, message, context)
    local timestamp = redis.call('TIME')[1]
    local log_message = string.format("[RateLimit] %s %s: %s", level, timestamp, message)
    if context and type(context) == "string" then
        log_message = log_message .. " | Context: " .. context
    elseif context and type(context) == "table" then
        -- Avoid complex table serialization to prevent read-only table issues
        log_message = log_message .. " | Context: [table]"
    end
    redis.log(redis.LOG_NOTICE, log_message)
end

local function safeRedisCall(operation, ...)
    local args = {...}
    local success, result = pcall(function()
        return redis.call(operation, unpack(args))
    end)

    if not success then
        log("ERROR", "Redis operation failed: " .. tostring(result), operation)
        return false, result
    end

    return true, result
end

local function validateInput(value, expectedType, fieldName)
    if type(value) ~= expectedType then
        local errorMsg = string.format("Type validation failed for '%s': expected %s, got %s",
            fieldName or "unknown", expectedType, type(value))
        log("ERROR", errorMsg)
        return false, errorMsg
    end
    return true
end

local function fnv1a(str)
    if type(str) ~= "string" then
        log("ERROR", "fnv1a: Invalid input type", type(str))
        return nil
    end

    local hash = 2166136261
    for i = 1, #str do
        hash = bit.bxor(hash, string.byte(str, i))
        hash = bit.band(hash * 16777619, 0xFFFFFFFF)
    end
    return tostring(hash)
end

-- Main script logic
local rate_limit_key = KEYS[1]
local window_size_str = ARGV[1]
local max_requests_str = ARGV[2]
local current_timestamp_str = ARGV[3]

-- Input validation
local validation_success, validation_error = validateInput(rate_limit_key, "string", "rate_limit_key")
if not validation_success then
    return redis.error_reply("VALIDATION_ERROR: " .. validation_error)
end

validation_success, validation_error = validateInput(window_size_str, "string", "window_size")
if not validation_success then
    return redis.error_reply("VALIDATION_ERROR: " .. validation_error)
end

validation_success, validation_error = validateInput(max_requests_str, "string", "max_requests")
if not validation_success then
    return redis.error_reply("VALIDATION_ERROR: " .. validation_error)
end

validation_success, validation_error = validateInput(current_timestamp_str, "string", "current_timestamp")
if not validation_success then
    return redis.error_reply("VALIDATION_ERROR: " .. validation_error)
end

local window = tonumber(window_size_str)
if not window or window <= 0 then
    log("ERROR", "Invalid window size", window_size_str)
    return redis.error_reply("INVALID_WINDOW_SIZE")
end

local max_requests = tonumber(max_requests_str)
if not max_requests or max_requests <= 0 then
    log("ERROR", "Invalid max requests", max_requests_str)
    return redis.error_reply("INVALID_MAX_REQUESTS")
end

local now = tonumber(current_timestamp_str)
if not now or now <= 0 then
    log("ERROR", "Invalid timestamp", current_timestamp_str)
    return redis.error_reply("INVALID_TIMESTAMP")
end

-- Hash the input key to keep Redis keys short and uniform
local hashed_key = fnv1a(rate_limit_key)
if not hashed_key then
    return redis.error_reply("KEY_HASHING_FAILED")
end

local key = "rl:" .. hashed_key

-- Clean up old entries with error handling
local success, result = safeRedisCall('ZREMRANGEBYSCORE', key, 0, now - window)
if not success then
    log("ERROR", "Failed to clean up old rate limit entries", tostring(result))
    return redis.error_reply("CLEANUP_FAILED: " .. tostring(result))
end

-- Get current count with error handling
local current_count
success, current_count = safeRedisCall('ZCARD', key)
if not success then
    log("ERROR", "Failed to get current request count: " .. tostring(current_count), key)
    return redis.error_reply("COUNT_CHECK_FAILED: " .. tostring(current_count))
end

if current_count >= max_requests then
    log("WARN", "Rate limit exceeded", tostring(current_count))
    return {0, current_count}
end

-- Add new request with error handling
success, result = safeRedisCall('ZADD', key, now, now)
if not success then
    log("ERROR", "Failed to add rate limit entry", tostring(result))
    return redis.error_reply("ADD_ENTRY_FAILED: " .. tostring(result))
end

-- Set expiration with error handling
success, result = safeRedisCall('EXPIRE', key, window)
if not success then
    log("WARN", "Failed to set expiration on rate limit key", tostring(result))
    -- Don't fail the request for this, just log the warning
end

-- Log successful operation
log("INFO", "Rate limit check passed", tostring(current_count + 1))

return {1, current_count + 1}