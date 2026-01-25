-- Lua script for atomic wallet balance update
-- KEYS: [1] wallet_key
-- ARGV: [1] amount_to_add (can be negative for deduction)
---@diagnostic disable: undefined-global -- Disable undefined global warnings

local wallet_key = KEYS[1]
local amount = tonumber(ARGV[1])

-- Get current balance
local current_balance = redis.call('GET', wallet_key)
if not current_balance then
    current_balance = '0'
end

local balance = tonumber(current_balance)

-- Check if deduction would result in negative balance
if amount < 0 and (balance + amount) < 0 then
    return redis.error_reply('INSUFFICIENT_FUNDS')
end

-- Update balance
local new_balance = balance + amount
redis.call('SET', wallet_key, tostring(new_balance))

-- Return new balance
return new_balance