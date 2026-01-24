const redisLua = require('./redis-lua');
const fs = require('fs');
const path = require('path');

/**
 * Script Loader for Redis Lua Scripts
 * Loads and manages Lua scripts for the application
 */
class ScriptLoader {
  constructor() {
    this.scriptsDir = path.join(__dirname, 'scripts');
    this.loadedScripts = new Map();
  }

  /**
   * Load all Lua scripts from the scripts directory
   */
  async loadAllScripts() {
    try {
      const files = fs.readdirSync(this.scriptsDir).filter(file => file.endsWith('.lua'));

      for (const file of files) {
        const scriptName = path.basename(file, '.lua');
        const scriptPath = path.join(this.scriptsDir, file);
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');

        await redisLua.loadScript(scriptName, scriptContent);
        this.loadedScripts.set(scriptName, scriptPath);
        console.log(`Loaded script: ${scriptName}`);
      }

      console.log(`Successfully loaded ${files.length} Lua scripts`);
    } catch (error) {
      console.error('Failed to load scripts:', error);
      throw error;
    }
  }

  /**
   * Load a specific script
   * @param {string} scriptName - Name of the script file (without .lua extension)
   */
  async loadScript(scriptName) {
    try {
      const scriptPath = path.join(this.scriptsDir, `${scriptName}.lua`);
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');

      await redisLua.loadScript(scriptName, scriptContent);
      this.loadedScripts.set(scriptName, scriptPath);
      console.log(`Loaded script: ${scriptName}`);
    } catch (error) {
      console.error(`Failed to load script ${scriptName}:`, error);
      throw error;
    }
  }

  /**
   * Get list of available scripts
   */
  getAvailableScripts() {
    return fs.readdirSync(this.scriptsDir)
      .filter(file => file.endsWith('.lua'))
      .map(file => path.basename(file, '.lua'));
  }

  /**
   * Check if a script is loaded
   * @param {string} scriptName - Name of the script
   */
  isScriptLoaded(scriptName) {
    return redisLua.hasScript(scriptName);
  }

  /**
   * Execute a loaded script
   * @param {string} scriptName - Name of the script
   * @param {number} numKeys - Number of keys
   * @param {Array} keysAndArgs - Keys and arguments array
   */
  async executeScript(scriptName, numKeys, keysAndArgs) {
    return await redisLua.executeScript(scriptName, numKeys, keysAndArgs);
  }
}

// Create singleton instance
const scriptLoader = new ScriptLoader();

module.exports = scriptLoader;