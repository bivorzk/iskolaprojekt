const express = require('express');


function configureAuthMiddleware(app) {
  // Trust proxy for correct IP extraction
  app.set('trust proxy', 1);
  
  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true }));

  // IP extraction middleware
  app.use((req, res, next) => {
    let ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    
    // Clean up IPv6 mapped IPv4 addresses
    if (ip && ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
    
    // Convert localhost IPv6 to IPv4
    if (ip === '::1') {
      ip = '127.0.0.1';
    }
    
    req.clientIp = ip;
    next();
  });
}

module.exports = {
  configureAuthMiddleware
};