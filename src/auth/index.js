const express = require('express');
const { configureAuthMiddleware } = require('./middleware');
const { router: registerRouter, getLastRegisteredEmail } = require('./register');
const loginRouter = require('./login');

// Create main auth router
const authRouter = express.Router();

// Configure middleware for auth routes
authRouter.use(express.urlencoded({ extended: true }));

// Mount sub-routes
authRouter.use('/', registerRouter);
authRouter.use('/', loginRouter);

/**
 * Creates and configures the complete authentication system
 * @returns {Object} Object containing the auth router and helper functions
 */
function createAuthSystem() {
  const app = express();
  
  // Configure base middleware
  configureAuthMiddleware(app);
  
  // Mount auth routes
  app.use('/', authRouter);
  
  return {
    app,
    authRouter,
    getLastRegisteredEmail
  };
}

module.exports = {
  createAuthSystem,
  authRouter,
  getLastRegisteredEmail
};