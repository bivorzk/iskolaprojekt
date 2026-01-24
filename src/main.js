const express = require('express');
const app = express();
const port = 3000;
const rateLimit = require('express-rate-limit');
const session = require('express-session'); 
const database = require('./database');
const path = require('path');
const emailverification = require('./auth/email_verification');
const api = require('./api');
const { RedisStore } = require('rate-limit-redis');
const favicon = require('serve-favicon');
const googlepayRouter = require('./payments/googlepay');
const paypalRouter = require('./payments/paypal');
const password_reset = require('./auth/password_reset');
const database_queries = require('../config/database_queries');
const TwoFA = require('./auth/2fa');
const dashboardRouter = require('./dashboard/dashboard');
const logoutRouter = require('./logout');
const admin = require('./admin/admin');
const Order = require('./Orders/Order');
const redisLuaService = require('./services/redis-lua-service');

require('dotenv').config({ path: path.join(__dirname, '../.env') });


let redisAvailable = false;
const { redisClient, isRedisAvailable } = require('./redis');

redisClient.on('connect', async () => {
  console.log('Redis connected in main.js');
  redisAvailable = true;

  // Initialize Redis Lua service
  try {
    await redisLuaService.initialize();
  } catch (error) {
    console.error('Failed to initialize Redis Lua service:', error);
  }
});
redisClient.on('error', (err) => {
  console.log('Redis Client Error in main.js', err);
  redisAvailable = false;
});


// Add session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } 
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/home_page/home_page.html'));
});
app.use(express.static(path.join(__dirname, '../public')));
app.use(favicon(path.join(__dirname, "../public", "favicon.ico")));


const createStore = () => redisAvailable ? new RedisStore({
  sendCommand: async (command, ...args) => await redisClient.sendCommand([command, ...args]),
}) : undefined;

const HOUR = 60 * 60 * 1000;
const QUARTERHOUR = 15 * 60 * 1000;

// Rate limiter for all non-sensitive routes
const limiter = rateLimit({
  windowMs: HOUR, // 1 hour
  max: 250, // Limit each IP to 250
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: createStore(),
    handler: (req, res) => {
    res.status(429).statusMessage = 'Too many requests from this IP, please try again after 15 minutes';
    res.status(429).sendFile(path.join(__dirname, '../public/429/429.html'));
  },
})

const registerLimiter = rateLimit({
  windowMs: HOUR, // 1 hour window
  max: 100, // start blocking after 100 requests
  handler: (req, res) => {
    res.status(429).statusMessage = 'Too many requests from this IP, please try again after 15 minutes';
    res.status(429).sendFile(path.join(__dirname, '../public/429/429.html'));
  },
  store: createStore(),
});


const LoginLimiter = rateLimit({
  windowMs: QUARTERHOUR, // 15 minutes window 
  max: 35,
  handler: (req, res) => {
    res.status(429).statusMessage = 'Too many requests from this IP, please try again after 15 minutes';
    res.status(429).sendFile(path.join(__dirname, '../public/429/429.html'));
  },
  store: createStore(),
});

const dashboardLimiter = rateLimit({
  windowMs: QUARTERHOUR, // 15 minutes window
  max: 1000, // start blocking after 1000 requests
  handler: (req, res) => {
     res.status(429).statusMessage = 'Too many requests from this IP, please try again after 15 minutes';
    res.status(429).sendFile(path.join(__dirname, '../public/429/429.html'));
  },
  store: createStore(),
});

// Apply the rate limiting middleware to all requests
app.use('/passwordhash', limiter);
app.use('/database', limiter);
app.use('/login', LoginLimiter);
app.use('/register', registerLimiter);
app.use('/api', limiter);
app.use('/dashboard', dashboardLimiter);
app.use('/admin', limiter);
app.use('/Order', limiter);
app.use('/2fa', limiter);
app.use('/email-verification', limiter);
app.use('/pay', limiter);

app.use('/dashboard', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});


// Serve HTML


app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});
app.get('/password-reset/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/password_reset.html'));
});

app.get('/pay', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pay.html'));
});
/*
app.get('/email-verification/verify/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'verify.html'));
});
*/

// Use routers
app.use('/password-reset', password_reset);
app.use('/forgot-password', password_reset);
app.use('/email-verification', emailverification);
app.use('/', database);
app.use('/api', api);
app.use('/api/payments', googlepayRouter);
app.use('/api/payments', paypalRouter);
app.use('/2fa', TwoFA);
app.use('/dashboard', dashboardRouter);
app.use('/', logoutRouter);
app.use('/admin', admin);
app.use('/Order', Order);


// 404 handler
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/404/404.html'));

//  res.status(404).send('Page not found 😀');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
