const scriptLoader = require('../script-loader');

/**
 * Redis Lua Service
 * High-level service for Redis Lua script operations
 */
class RedisLuaService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the service by loading all scripts
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await scriptLoader.loadAllScripts();
      this.initialized = true;
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
   * Update wallet balance atomically
   * @param {string} walletKey - Redis key for the wallet
   * @param {number} amount - Amount to add (negative for deduction)
   * @returns {Promise<number>} - New balance
   */
  async updateWalletBalance(walletKey, amount) {
    if (this.redisUnavailable) {
      throw new Error('Redis Lua scripting is not available - Redis server not running');
    }

    try {
      const result = await scriptLoader.executeScript('wallet_update', 1, [walletKey, amount.toString()]);
      return result;
    } catch (error) {
      if (error.message.includes('INSUFFICIENT_FUNDS')) {
        throw new Error('Insufficient funds in wallet');
      }
      throw error;
    }
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
      return 0; // Return 0 when Redis is not available
    }

    // This could be implemented with a simple Lua script or direct Redis call
    // For now, using direct call since it's simple
    const redisLua = require('./redis-lua');
    try {
      const balance = await redisLua.client.get(walletKey);
      return balance ? parseFloat(balance) : 0;
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      return 0;
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

    const redisLua = require('./redis-lua');
    try {
      const stock = await redisLua.client.get(inventoryKey);
      return stock ? parseInt(stock) : 0;
    } catch (error) {
      console.error('Failed to get inventory stock:', error);
      return 0;
    }
  }
}

// Create singleton instance
const redisLuaService = new RedisLuaService();

module.exports = redisLuaService;