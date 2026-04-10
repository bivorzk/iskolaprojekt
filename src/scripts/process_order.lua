-- Lua script for processing orders with inventory check and error handling
-- KEYS: [1] inventory_key, [2] wallet_key, [3] order_key
-- ARGV: [1] item_quantity, [2] item_price, [3] user_id
---@diagnostic disable: undefined-global -- Disable undefined global warnings

-- Error handling utilities (inlined for Redis Lua compatibility)
local function log(level, message, context)
    local timestamp = redis.call('TIME')[1]
    local log_message = string.format("[ProcessOrder] %s %s: %s", level, timestamp, message)
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
local inventory_key = KEYS[1]
local wallet_key = KEYS[2]
local order_key = KEYS[3]

local quantity_str = ARGV[1]
local price_str = ARGV[2]
local user_id = ARGV[3]

-- Input validation
local validation_success, validation_error = validateInput(inventory_key, "string", "inventory_key")
if not validation_success then
    return redis.error_reply("VALIDATION_ERROR: " .. validation_error)
end

validation_success, validation_error = validateInput(wallet_key, "string", "wallet_key")
if not validation_success then
    return redis.error_reply("VALIDATION_ERROR: " .. validation_error)
end

validation_success, validation_error = validateInput(order_key, "string", "order_key")
if not validation_success then
    return redis.error_reply("VALIDATION_ERROR: " .. validation_error)
end

validation_success, validation_error = validateInput(quantity_str, "string", "quantity")
if not validation_success then
    return redis.error_reply("VALIDATION_ERROR: " .. validation_error)
end

validation_success, validation_error = validateInput(price_str, "string", "price")
if not validation_success then
    return redis.error_reply("VALIDATION_ERROR: " .. validation_error)
end

validation_success, validation_error = validateInput(user_id, "string", "user_id")
if not validation_success then
    return redis.error_reply("VALIDATION_ERROR: " .. validation_error)
end

local quantity = tonumber(quantity_str)
if not quantity or quantity <= 0 then
    log("ERROR", "Invalid quantity", {quantity_str = quantity_str})
    return redis.error_reply("INVALID_QUANTITY")
end

local price = tonumber(price_str)
if not price or price <= 0 then
    log("ERROR", "Invalid price", {price_str = price_str})
    return redis.error_reply("INVALID_PRICE")
end

local total_cost = quantity * price

-- Check inventory availability with error handling
local success, available_stock_str = safeRedisCall('GET', inventory_key)
if not success then
    return redis.error_reply("REDIS_ERROR: " .. tostring(available_stock_str))
end

if not available_stock_str then
    log("WARN", "Item not found in inventory", {inventory_key = inventory_key})
    return redis.error_reply('ITEM_NOT_FOUND')
end

local available_stock = tonumber(available_stock_str)
if not available_stock then
    log("ERROR", "Invalid inventory stock format", {available_stock_str = available_stock_str, inventory_key = inventory_key})
    return redis.error_reply("INVALID_INVENTORY_FORMAT")
end

if available_stock < quantity then
    log("WARN", "Insufficient stock", {
        inventory_key = inventory_key,
        available_stock = available_stock,
        requested_quantity = quantity
    })
    return redis.error_reply('INSUFFICIENT_STOCK')
end

-- Check wallet balance with error handling
local success, wallet_balance_str = safeRedisCall('GET', wallet_key)
if not success then
    return redis.error_reply("REDIS_ERROR: " .. tostring(wallet_balance_str))
end

if not wallet_balance_str then
    wallet_balance_str = '0'
    log("INFO", "Wallet not found, initializing with 0", {wallet_key = wallet_key})
end

local wallet_balance = tonumber(wallet_balance_str)
if not wallet_balance then
    log("ERROR", "Invalid wallet balance format", {wallet_balance_str = wallet_balance_str, wallet_key = wallet_key})
    return redis.error_reply("INVALID_WALLET_FORMAT")
end

if wallet_balance < total_cost then
    log("WARN", "Insufficient funds for order", {
        wallet_key = wallet_key,
        wallet_balance = wallet_balance,
        total_cost = total_cost,
        quantity = quantity,
        price = price
    })
    return redis.error_reply('INSUFFICIENT_FUNDS')
end

-- Perform atomic operations with error handling
success, result = safeRedisCall('DECRBY', inventory_key, quantity)
if not success then
    log("ERROR", "Failed to decrement inventory", {error = tostring(result), inventory_key = inventory_key})
    return redis.error_reply("INVENTORY_UPDATE_FAILED: " .. tostring(result))
end

success, result = safeRedisCall('DECRBY', wallet_key, total_cost)
if not success then
    -- Rollback inventory change
    local rollback_success, rollback_result = safeRedisCall('INCRBY', inventory_key, quantity)
    if not rollback_success then
        log("CRITICAL", "Failed to rollback inventory after wallet update failure", {
            inventory_key = inventory_key,
            wallet_key = wallet_key,
            error = tostring(result),
            rollback_error = tostring(rollback_result)
        })
    else
        log("WARN", "Rolled back inventory after wallet update failure", {inventory_key = inventory_key})
    end
    return redis.error_reply("WALLET_UPDATE_FAILED: " .. tostring(result))
end

-- Create order record as hash with error handling
success, result = safeRedisCall('HMSET', order_key,
    'user_id', user_id,
    'quantity', quantity,
    'price', price,
    'total_cost', total_cost,
    'timestamp', redis.call('TIME')[1]
)
if not success then
    -- Rollback both inventory and wallet changes
    local rollback_inv_success, rollback_inv_result = safeRedisCall('INCRBY', inventory_key, quantity)
    local rollback_wallet_success, rollback_wallet_result = safeRedisCall('INCRBY', wallet_key, total_cost)

    if not rollback_inv_success or not rollback_wallet_success then
        log("CRITICAL", "Failed to rollback changes after order record creation failure", {
            inventory_key = inventory_key,
            wallet_key = wallet_key,
            order_key = order_key,
            error = tostring(result),
            rollback_inv_error = tostring(rollback_inv_result),
            rollback_wallet_error = tostring(rollback_wallet_result)
        })
    else
        log("WARN", "Rolled back inventory and wallet after order record creation failure", {
            inventory_key = inventory_key,
            wallet_key = wallet_key
        })
    end
    return redis.error_reply("ORDER_RECORD_FAILED: " .. tostring(result))
end

-- Log successful operation
log("INFO", "Order processed successfully", {
    inventory_key = inventory_key,
    wallet_key = wallet_key,
    order_key = order_key,
    user_id = user_id,
    quantity = quantity,
    price = price,
    total_cost = total_cost
})

-- Return success with order details: {remaining_stock, remaining_balance, order_key}
return {available_stock - quantity, wallet_balance - total_cost, order_key}