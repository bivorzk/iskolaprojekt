---@diagnostic disable: undefined-global -- Disable undefined global warnings

-- Error Handler Module for Redis Lua Scripts
-- Provides comprehensive error handling, logging, and recovery mechanisms

-- Error types enumeration
local ERROR_TYPES = {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    REDIS_ERROR = "REDIS_ERROR",
    BUSINESS_LOGIC_ERROR = "BUSINESS_LOGIC_ERROR",
    NETWORK_ERROR = "NETWORK_ERROR",
    TIMEOUT_ERROR = "TIMEOUT_ERROR",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

-- Log levels
local LOG_LEVELS = {
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR",
    FATAL = "FATAL"
}

-- Configuration
local config = {
    max_retries = 3,
    retry_delay = 100, -- milliseconds
    enable_logging = true,
    log_prefix = "[ErrorHandler]"
}

-- Internal logging function
local function log(level, message, context)
    if not config.enable_logging then return end

    local timestamp = redis.call('TIME')[1] -- Get current timestamp
    local log_message = string.format("%s %s %s: %s",
        config.log_prefix,
        level,
        timestamp,
        message
    )

    if context and type(context) == "string" then
        log_message = log_message .. " | Context: " .. context
    elseif context and type(context) == "table" then
        -- Avoid complex table serialization to prevent read-only table issues
        log_message = log_message .. " | Context: [table]"
    end

    -- Use Redis logging (this will appear in Redis logs)
    redis.log(redis.LOG_NOTICE, log_message)
end

-- Safe execution wrapper
local function safeExecute(operation, context)
    local success, result = pcall(operation)

    if not success then
        local error_info = {
            error = result,
            context = context or {},
            timestamp = redis.call('TIME')[1],
            operation = operation
        }

        log(LOG_LEVELS.ERROR,
            string.format("Operation failed: %s", result),
            context
        )

        return false, result, error_info
    end

    return true, result
end

-- Retry mechanism with exponential backoff
local function retry(operation, maxRetries, context)
    maxRetries = maxRetries or config.max_retries
    local attempt = 0
    local lastError

    while attempt < maxRetries do
        attempt = attempt + 1

        local success, result, errorInfo = safeExecute(operation, context)

        if success then
            if attempt > 1 then
                log(LOG_LEVELS.INFO,
                    string.format("Operation succeeded on attempt %d", attempt),
                    context
                )
            end
            return true, result
        end

        lastError = errorInfo
        log(LOG_LEVELS.WARN,
            string.format("Attempt %d failed: %s", attempt, errorInfo.error),
            context
        )

        -- Exponential backoff delay (simulated)
        if attempt < maxRetries then
            local delay = config.retry_delay * (2 ^ (attempt - 1))
            -- In Redis Lua, we can't actually sleep, but we can log the intended delay
            log(LOG_LEVELS.DEBUG,
                string.format("Waiting %dms before retry", delay),
                context
            )
        end
    end

    log(LOG_LEVELS.ERROR,
        string.format("All %d attempts failed", maxRetries),
        context
    )

    return false, lastError
end

-- Input validation
local function validateInput(value, validator, fieldName)
    if not validator then
        return true -- No validator provided, assume valid
    end

    local success, result = pcall(validator, value)

    if not success then
        local errorMsg = string.format("Validation failed for field '%s': %s",
            fieldName or "unknown", result)
        log(LOG_LEVELS.ERROR, errorMsg)
        return false, result
    end

    if not result then
        local errorMsg = string.format("Validation failed for field '%s'", fieldName or "unknown")
        log(LOG_LEVELS.WARN, errorMsg)
        return false, "Validation failed"
    end

    return true
end

-- Redis operation wrapper with error handling
local function redisOperation(operation, ...)
    local args = {...}
    local context = {
        operation = operation,
        args = args
    }

    local function execute()
        return redis.call(operation, unpack(args))
    end

    local success, result, errorInfo = safeExecute(execute, context)

    if not success then
        -- Classify Redis errors
        local errorType = ERROR_TYPES.REDIS_ERROR

        if string.find(errorInfo.error, "timeout") then
            errorType = ERROR_TYPES.TIMEOUT_ERROR
        elseif string.find(errorInfo.error, "connection") then
            errorType = ERROR_TYPES.NETWORK_ERROR
        end

        return false, errorInfo.error, errorType
    end

    return true, result
end

-- Business logic error handler
local function handleBusinessError(condition, errorMessage, context)
    if condition then
        log(LOG_LEVELS.ERROR, errorMessage, context)
        return false, errorMessage, ERROR_TYPES.BUSINESS_LOGIC_ERROR
    end
    return true
end

-- Validation error handler
local function handleValidationError(value, expectedType, fieldName, context)
    local actualType = type(value)

    if actualType ~= expectedType then
        local errorMsg = string.format("Type validation failed for '%s': expected %s, got %s",
            fieldName or "unknown", expectedType, actualType)
        log(LOG_LEVELS.ERROR, errorMsg, context)
        return false, errorMsg, ERROR_TYPES.VALIDATION_ERROR
    end

    return true
end

-- Configuration setter
local function configure(options)
    if options.max_retries then
        config.max_retries = options.max_retries
    end
    if options.retry_delay then
        config.retry_delay = options.retry_delay
    end
    if options.enable_logging ~= nil then
        config.enable_logging = options.enable_logging
    end
    if options.log_prefix then
        config.log_prefix = options.log_prefix
    end
end

-- Health check function
local function healthCheck()
    local checks = {
        redis_connection = false,
        memory_usage = false,
        script_version = true
    }

    -- Check Redis connection
    local success, result = redisOperation('PING')
    checks.redis_connection = success

    -- Check memory usage (approximate)
    success, result = redisOperation('INFO', 'memory')
    if success then
        checks.memory_usage = true
    end

    local healthy = checks.redis_connection and checks.memory_usage and checks.script_version

    log(healthy and LOG_LEVELS.INFO or LOG_LEVELS.ERROR,
        string.format("Health check: %s", healthy and "PASSED" or "FAILED"),
        checks
    )

    return healthy, checks
end

-- Cleanup function
local function cleanup()
    log(LOG_LEVELS.INFO, "ErrorHandler cleanup completed")
    -- Any cleanup logic here
end

-- Return the module interface
local ErrorHandler = {
    ERROR_TYPES = ERROR_TYPES,
    LOG_LEVELS = LOG_LEVELS,
    safeExecute = safeExecute,
    retry = retry,
    validateInput = validateInput,
    redisOperation = redisOperation,
    handleBusinessError = handleBusinessError,
    handleValidationError = handleValidationError,
    configure = configure,
    healthCheck = healthCheck,
    cleanup = cleanup,
    log = log
}

-- If this script is executed directly, return the module
-- KEYS: [1] command (optional)
-- ARGV: [1..n] arguments for the command
if KEYS[1] then
    local command = KEYS[1]
    if command == "health_check" then
        local healthy, checks = healthCheck()
        return cjson.encode({healthy = healthy, checks = checks})
    elseif command == "configure" then
        local options = cjson.decode(ARGV[1] or "{}")
        configure(options)
        return "OK"
    else
        return redis.error_reply("Unknown command: " .. command)
    end
end

-- Return the module (this will be used when loaded as a script)
return ErrorHandler

