const scriptLoader = require('../script-loader');

/**
 * Redis Lua Service
 * High-level service for Redis Lua script operations
 */
class RedisLuaService {
  constructor() {
    this.initialized = false;
    this.errorHandler = null;
  }

  /**
   * Initialize the service by loading all scripts
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await scriptLoader.loadAllScripts();
      this.initialized = true;

      // Initialize error handler
      await this.initializeErrorHandler();

      console.log('Redis Lua Service initialized');
    } catch (error) {
      if (error.message.includes('Redis is not available')) {
        console.warn('Redis Lua Service: Redis is not available. Lua scripting features will be disabled.');
        console.warn('To enable Lua scripting features, please start Redis server.');
        this.redisUnavailable = true;
        // Don't throw error - allow application to continue without Lua features
        return;
      }
      console.error('Failed to initialize Redis Lua Service:', error);
      throw error;
    }
  }

  /**
   * Initialize the error handler
   */
  async initializeErrorHandler() {
    try {
      // Execute error handler script to get the module
      const errorHandlerResult = await scriptLoader.executeScript('error_handler', 0, []);
      this.errorHandler = errorHandlerResult;

      // Configure error handler with sensible defaults
      await this.configureErrorHandler({
        max_retries: 3,
        retry_delay: 100,
        enable_logging: true,
        log_prefix: '[RedisLuaService]'
      });

      console.log('Error handler initialized');
    } catch (error) {
      console.warn('Failed to initialize error handler:', error.message);
      // Continue without error handler
    }
  }

  /**
   * Configure the error handler
   * @param {Object} options - Configuration options
   */
  async configureErrorHandler(options) {
    if (!this.errorHandler) return;

    try {
      await scriptLoader.executeScript('error_handler', 1, ['configure', JSON.stringify(options)]);
    } catch (error) {
      console.warn('Failed to configure error handler:', error.message);
    }
  }

  /**
   * Execute error handler health check
   */
  async errorHandlerHealthCheck() {
    if (!this.errorHandler) {
      return { healthy: false, reason: 'Error handler not initialized' };
    }

    try {
      const result = await scriptLoader.executeScript('error_handler', 1, ['health_check']);
      return JSON.parse(result);
    } catch (error) {
      console.warn('Error handler health check failed:', error.message);
      return { healthy: false, reason: error.message };
    }
  }

  /**
   * Update wallet balance atomically
   * @param {string} walletKey - Redis key for the wallet
   * @param {number} amount - Amount to add (negative for deduction)
   * @returns {Promise<number>} - New balance
   */
  async updateWalletBalance(walletKey, amount) {
    if (this.redisUnavailable) {
      throw new Error('Redis Lua scripting is not available - Redis server not running');
    }

    // Check if service is initialized
    if (!this.initialized) {
      throw new Error('Redis Lua scripts not loaded yet');
    }

    try {
      const result = await scriptLoader.executeScript('wallet_update', 1, [walletKey, amount.toString()]);
      return result;
    } catch (error) {
      // Enhanced error handling with error handler
      if (this.errorHandler) {
        console.error('Wallet update failed, attempting error analysis...');
        const healthCheck = await this.errorHandlerHealthCheck();
        if (!healthCheck.healthy) {
          console.error('Error handler health check failed:', healthCheck.reason);
        }
      }

      if (error.message.includes('INSUFFICIENT_FUNDS')) {
        throw new Error('Insufficient funds in wallet');
      }
      throw error;
    }
  }

  /**
   * Set wallet balance to an exact value in Redis
   * @param {string} walletKey - Redis key for the wallet
   * @param {number} balance - Exact balance to store
   * @returns {Promise<number>} - Stored balance
   */
  async setWalletBalance(walletKey, balance) {
    if (this.redisUnavailable) {
      throw new Error('Redis Lua scripting is not available - Redis server not running');
    }

    if (!this.client || !this.client.isOpen) {
      throw new Error('Redis is not available');
    }

    await this.client.set(walletKey, String(balance));
    return balance;
  }

  /**
   * Process an order with inventory and wallet checks
   * @param {string} inventoryKey - Redis key for inventory
   * @param {string} walletKey - Redis key for wallet
   * @param {string} orderKey - Redis key for order record
   * @param {number} quantity - Quantity to order
   * @param {number} price - Price per item
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Order result
   */
  async processOrder(inventoryKey, walletKey, orderKey, quantity, price, userId) {
    if (this.redisUnavailable) {
      throw new Error('Redis Lua scripting is not available - Redis server not running');
    }

    // Check if service is initialized
    if (!this.initialized) {
      throw new Error('Redis Lua scripts not loaded yet');
    }

    // Input validation
    if (!inventoryKey || !walletKey || !orderKey || !userId) {
      throw new Error('Missing required parameters for order processing');
    }
    if (quantity <= 0 || price < 0) {
      throw new Error('Invalid quantity or price values');
    }

    try {
      const result = await scriptLoader.executeScript('process_order', 3,
        [inventoryKey, walletKey, orderKey, quantity.toString(), price.toString(), userId]
      );

      return {
        newStock: result[0],
        newBalance: result[1],
        orderId: result[2]
      };
    } catch (error) {
      // Enhanced error handling
      if (this.errorHandler) {
        console.error('Order processing failed, error details logged by error handler');
      }

      if (error.message.includes('ITEM_NOT_FOUND')) {
        throw new Error('Item not found in inventory');
      }
      if (error.message.includes('INSUFFICIENT_STOCK')) {
        throw new Error('Insufficient stock available');
      }
      if (error.message.includes('INSUFFICIENT_FUNDS')) {
        throw new Error('Insufficient funds in wallet');
      }
      throw error;
    }
  }

  /**
   * Check rate limit using Lua script
   * @param {string} key - Rate limit key
   * @param {number} windowSeconds - Time window in seconds
   * @param {number} maxRequests - Maximum requests allowed
   * @returns {Promise<Object>} - Rate limit result
   */
  async checkRateLimit(key, windowSeconds, maxRequests) {
    if (this.redisUnavailable) {
      // When Redis is unavailable, allow all requests but log warning
      console.warn('Rate limiting disabled - Redis not available');
      return { allowed: true, currentCount: 0 };
    }

    // Check if service is initialized
    if (!this.initialized) {
      // Scripts not loaded yet, allow request but log warning
      console.warn('Rate limiting disabled - Redis Lua scripts not loaded yet');
      return { allowed: true, currentCount: 0 };
    }

    // Input validation
    if (!key || windowSeconds <= 0 || maxRequests <= 0) {
      throw new Error('Invalid parameters for rate limit check');
    }

    try {
      const now = Math.floor(Date.now() / 1000); // Unix timestamp
      const result = await scriptLoader.executeScript('rate_limit', 1,
        [key, windowSeconds.toString(), maxRequests.toString(), now.toString()]
      );

      return {
        allowed: result[0] === 1,
        currentCount: result[1]
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);

      // Enhanced error handling
      if (this.errorHandler) {
        console.error('Rate limit error logged by error handler');
      }

      // On error, allow the request to prevent blocking legitimate users
      return { allowed: true, currentCount: 0 };
    }
  }

  /**
   * Get wallet balance
   * @param {string} walletKey - Redis key for the wallet
   * @returns {Promise<number>} - Current balance
   */
  async getWalletBalance(walletKey) {
    if (this.redisUnavailable) {
      console.warn('Wallet balance retrieval from Redis unavailable - Redis not running');
      return null;
    }

    if (!walletKey) {
      throw new Error('Wallet key is required');
    }

    const redisLua = require('./redis-lua');
    try {
      const balance = await redisLua.client.get(walletKey);
      const parsedBalance = balance !== null ? parseFloat(balance) : null;

      // Validate the result
      if (parsedBalance !== null && isNaN(parsedBalance)) {
        throw new Error('Invalid balance format in Redis');
      }

      return parsedBalance;
    } catch (error) {
      console.error('Failed to get wallet balance:', error);

      if (this.errorHandler) {
        console.error('Wallet balance retrieval error logged by error handler');
      }

      return null;
    }
  }

  /**
   * Get inventory stock
   * @param {string} inventoryKey - Redis key for inventory
   * @returns {Promise<number>} - Current stock
   */
  async getInventoryStock(inventoryKey) {
    if (this.redisUnavailable) {
      console.warn('Inventory stock retrieval from Redis unavailable - Redis not running');
      return 0; // Return 0 when Redis is not available
    }

    if (!inventoryKey) {
      throw new Error('Inventory key is required');
    }

    const redisLua = require('./redis-lua');
    try {
      const stock = await redisLua.client.get(inventoryKey);
      const parsedStock = stock ? parseInt(stock) : 0;

      // Validate the result
      if (isNaN(parsedStock) || parsedStock < 0) {
        console.warn(`Invalid stock value for key ${inventoryKey}: ${stock}`);
        return 0;
      }

      return parsedStock;
    } catch (error) {
      console.error('Failed to get inventory stock:', error);

      if (this.errorHandler) {
        console.error('Inventory stock retrieval error logged by error handler');
      }

      return 0;
    }
  }
}

// Create singleton instance
const redisLuaService = new RedisLuaService();

module.exports = redisLuaService;