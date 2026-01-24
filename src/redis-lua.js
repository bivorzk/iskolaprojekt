const { redisClient, isRedisAvailable } = require('./redis');

/**
 * Redis Lua Scripting Module
 * Provides utilities for loading and executing Lua scripts in Redis
 */
class RedisLua {
  constructor() {
    this.scripts = new Map(); // Cache for script SHA1 hashes
    this.client = redisClient;
  }

  /**
   * Load a Lua script and cache its SHA1 hash
   * @param {string} scriptName - Name to identify the script
   * @param {string} script - The Lua script content
   * @returns {Promise<string>} - SHA1 hash of the script
   */
  async loadScript(scriptName, script) {
    // Check if Redis client is actually connected
    if (!this.client || !this.client.isOpen) {
      throw new Error('Redis is not available');
    }

    try {
      const sha = await this.client.scriptLoad(script);
      this.scripts.set(scriptName, { sha, script });
      console.log(`Loaded Lua script '${scriptName}' with SHA: ${sha}`);
      return sha;
    } catch (error) {
      console.error(`Failed to load script '${scriptName}':`, error);
      throw error;
    }
  }

  /**
   * Execute a cached Lua script using EVALSHA
   * @param {string} scriptName - Name of the previously loaded script
   * @param {number} numKeys - Number of keys the script will access
   * @param {Array} keysAndArgs - Array of keys followed by arguments
   * @returns {Promise<any>} - Result of script execution
   */
  async executeScript(scriptName, numKeys, keysAndArgs) {
    if (!this.client || !this.client.isOpen) {
      throw new Error('Redis is not available');
    }

    const scriptData = this.scripts.get(scriptName);
    if (!scriptData) {
      throw new Error(`Script '${scriptName}' not found. Load it first using loadScript().`);
    }

    try {
      const result = await this.client.evalSha(scriptData.sha, {
        keys: keysAndArgs.slice(0, numKeys),
        arguments: keysAndArgs.slice(numKeys)
      });
      return result;
    } catch (error) {
      // If EVALSHA fails with NOSCRIPT, fall back to EVAL
      if (error.message.includes('NOSCRIPT')) {
        console.log(`Script '${scriptName}' not cached, falling back to EVAL`);
        return await this.evalScript(scriptData.script, numKeys, keysAndArgs);
      }
      throw error;
    }
  }

  /**
   * Execute a Lua script directly using EVAL (not cached)
   * @param {string} script - The Lua script content
   * @param {number} numKeys - Number of keys the script will access
   * @param {Array} keysAndArgs - Array of keys followed by arguments
   * @returns {Promise<any>} - Result of script execution
   */
  async evalScript(script, numKeys, keysAndArgs) {
    if (!this.client || !this.client.isOpen) {
      throw new Error('Redis is not available');
    }

    try {
      const result = await this.client.eval(script, {
        keys: keysAndArgs.slice(0, numKeys),
        arguments: keysAndArgs.slice(numKeys)
      });
      return result;
    } catch (error) {
      console.error('Failed to execute Lua script:', error);
      throw error;
    }
  }

  /**
   * Check if a script exists in the cache
   * @param {string} scriptName - Name of the script
   * @returns {boolean} - True if script is cached
   */
  hasScript(scriptName) {
    return this.scripts.has(scriptName);
  }

  /**
   * Get all loaded script names
   * @returns {Array<string>} - Array of script names
   */
  getLoadedScripts() {
    return Array.from(this.scripts.keys());
  }

  /**
   * Remove a script from cache and Redis
   * @param {string} scriptName - Name of the script to remove
   */
  async removeScript(scriptName) {
    if (!isRedisAvailable) {
      throw new Error('Redis is not available');
    }

    const scriptData = this.scripts.get(scriptName);
    if (scriptData) {
      try {
        await this.client.scriptFlush();
        this.scripts.delete(scriptName);
        console.log(`Removed script '${scriptName}'`);
      } catch (error) {
        console.error(`Failed to remove script '${scriptName}':`, error);
        throw error;
      }
    }
  }

  /**
   * Clear all cached scripts
   */
  async clearAllScripts() {
    if (!isRedisAvailable) {
      throw new Error('Redis is not available');
    }

    try {
      await this.client.scriptFlush();
      this.scripts.clear();
      console.log('Cleared all Lua scripts');
    } catch (error) {
      console.error('Failed to clear scripts:', error);
      throw error;
    }
  }

  /**
   * Get script information
   * @param {string} scriptName - Name of the script
   * @returns {Object|null} - Script data or null if not found
   */
  getScriptInfo(scriptName) {
    return this.scripts.get(scriptName) || null;
  }
}

// Create singleton instance
const redisLua = new RedisLua();

module.exports = redisLua;