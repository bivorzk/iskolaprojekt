-- Lua script for atomic wallet balance update with error handling
-- KEYS: [1] wallet_key
-- ARGV: [1] amount_to_add (can be negative for deduction)
---@diagnostic disable: undefined-global -- Disable undefined global warnings

-- Error handling utilities (inlined for Redis Lua compatibility)
local function log(level, message, context)
    local timestamp = redis.call('TIME')[1]
    local log_message = string.format("[WalletUpdate] %s %s: %s", level, timestamp, message)
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

-- Main script logic
local wallet_key = KEYS[1]
local amount_str = ARGV[1]

-- Input validation
local validation_success, validation_error = validateInput(wallet_key, "string", "wallet_key")
if not validation_success then
    return redis.error_reply("VALIDATION_ERROR: " .. validation_error)
end

validation_success, validation_error = validateInput(amount_str, "string", "amount")
if not validation_success then
    return redis.error_reply("VALIDATION_ERROR: " .. validation_error)
end

local amount = tonumber(amount_str)
if not amount then
    log("ERROR", "Invalid amount format", {amount_str = amount_str})
    return redis.error_reply("INVALID_AMOUNT_FORMAT")
end

-- Get current balance with error handling
local success, current_balance = safeRedisCall('GET', wallet_key)
if not success then
    return redis.error_reply("REDIS_ERROR: " .. tostring(current_balance))
end

if not current_balance then
    current_balance = '0'
    log("INFO", "Wallet not found, initializing with 0", {wallet_key = wallet_key})
end

local balance = tonumber(current_balance)
if not balance then
    log("ERROR", "Invalid balance format in Redis", {current_balance = current_balance, wallet_key = wallet_key})
    return redis.error_reply("INVALID_BALANCE_FORMAT")
end

-- Check if deduction would result in negative balance
if amount < 0 and (balance + amount) < 0 then
    log("WARN", "Insufficient funds attempt", {
        wallet_key = wallet_key,
        current_balance = balance,
        requested_amount = amount
    })
    return redis.error_reply('INSUFFICIENT_FUNDS')
end

-- Update balance with error handling
local new_balance = balance + amount
success, result = safeRedisCall('SET', wallet_key, tostring(new_balance))
if not success then
    log("ERROR", "Failed to update wallet balance", {error = tostring(result), wallet_key = wallet_key})
    return redis.error_reply("UPDATE_FAILED: " .. tostring(result))
end

-- Log successful operation
log("INFO", "Wallet balance updated successfully", {
    wallet_key = wallet_key,
    old_balance = balance,
    new_balance = new_balance,
    amount_changed = amount
})

-- Return new balance
return new_balance