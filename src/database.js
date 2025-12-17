// Main database.js file - Now serves as a compatibility layer
// This file maintains backward compatibility while using the new modular auth system

// Import the User model from the new location
const User = require('./models/User');

// Import the new auth system
const { createAuthSystem, getLastRegisteredEmail } = require('./auth/index');

// Create the auth system
const { app } = createAuthSystem();

// Export the app and User model for backward compatibility
// This ensures existing imports like require('./database').User still work
module.exports = app;
module.exports.User = User;

// Dynamic getter for lastRegisteredEmail to ensure it's always current
Object.defineProperty(module.exports, 'lastRegisteredEmail', {
  get: function() {
    return getLastRegisteredEmail();
  }
});