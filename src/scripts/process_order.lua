-- Lua script for processing orders with inventory check
-- KEYS: [1] inventory_key, [2] wallet_key, [3] order_key
-- ARGV: [1] item_quantity, [2] item_price, [3] user_id

local inventory_key = KEYS[1]
local wallet_key = KEYS[2]
local order_key = KEYS[3]

local quantity = tonumber(ARGV[1])
local price = tonumber(ARGV[2])
local user_id = ARGV[3]

local total_cost = quantity * price

-- Check inventory availability
local available_stock = redis.call('GET', inventory_key)
if not available_stock then
    return redis.error_reply('ITEM_NOT_FOUND')
end

available_stock = tonumber(available_stock)
if available_stock < quantity then
    return redis.error_reply('INSUFFICIENT_STOCK')
end

-- Check wallet balance
local wallet_balance = redis.call('GET', wallet_key)
if not wallet_balance then
    wallet_balance = '0'
end

wallet_balance = tonumber(wallet_balance)
if wallet_balance < total_cost then
    return redis.error_reply('INSUFFICIENT_FUNDS')
end

-- Perform atomic operations
redis.call('DECRBY', inventory_key, quantity)
redis.call('DECRBY', wallet_key, total_cost)

-- Create order record as hash
redis.call('HMSET', order_key,
    'user_id', user_id,
    'quantity', quantity,
    'price', price,
    'total_cost', total_cost,
    'timestamp', redis.call('TIME')[1]
)

-- Return success with order details
return {
    available_stock - quantity,
    wallet_balance - total_cost,
    order_key
}