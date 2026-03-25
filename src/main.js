const express = require('express');
const app = express();

// Trust proxy for correct IP extraction
app.set('trust proxy', 1);

const port = 3000;
const rateLimit = require('express-rate-limit');
const session = require('express-session'); 
const database = require('./database');
const path = require('path');
const emailverification = require('./auth/email_verification'); // object
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
const cors = require('cors');

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
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(favicon(path.join(process.cwd(), "public", "favicon.ico")));
app.use(cors());

const createStore = () => redisAvailable ? new RedisStore({
  sendCommand: async (command, ...args) => await redisClient.sendCommand([command, ...args]),
}) : undefined;

const HOUR = 60 * 60 * 1000;
const QUARTERHOUR = 15 * 60 * 1000;

// Rate limiters
const limiter = rateLimit({
  windowMs: HOUR,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  handler: (req, res) => {
    res.status(429).statusMessage = 'Too many requests from this IP, please try again after 15 minutes';
    res.status(429).sendFile(path.join(process.cwd(), 'public/429/429.html'));
  },
});

const registerLimiter = rateLimit({
  windowMs: HOUR,
  max: 100,
  store: createStore(),
  handler: (req, res) => {
    res.status(429).statusMessage = 'Too many requests from this IP, please try again after 15 minutes';
    res.status(429).sendFile(path.join(process.cwd(), 'public/429/429.html'));
  },
});

const LoginLimiter = rateLimit({
  windowMs: QUARTERHOUR,
  max: 35,
  store: createStore(),
  handler: (req, res) => {
    res.status(429).statusMessage = 'Too many requests from this IP, please try again after 15 minutes';
    res.status(429).sendFile(path.join(process.cwd(), 'public/429/429.html'));
  },
});

const dashboardLimiter = rateLimit({
  windowMs: QUARTERHOUR,
  max: 1000,
  store: createStore(),
  handler: (req, res) => {
    res.status(429).statusMessage = 'Too many requests from this IP, please try again after 15 minutes';
    res.status(429).sendFile(path.join(process.cwd(), 'public/429/429.html'));
  },
});

// Apply rate limiting
app.use('/passwordhash', limiter);
app.use('/database', limiter);
app.use('/login', LoginLimiter);
app.use('/register', registerLimiter);
app.use('/api', limiter);
app.use('/dashboard', dashboardLimiter);
app.use('/admin', limiter);
app.use('/order', limiter);
app.use('/2fa', limiter);
app.use('/email-verification', limiter);
app.use('/pay', limiter);

app.use('/dashboard', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// Serve static HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public/home_page/home_page.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public/index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public/register.html'));
});

app.get('/password-reset/:token', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public/password_reset.html'));
});

app.get('/pay', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public/pay.html'));
});

// --- EMAIL VERIFICATION ROUTES ---
app.post('/email-verification/send', async (req, res) => {
  try {
    await emailverification.sendVerificationEmail(req.body.email);
    res.json({ success: true });
  } catch (error) {
    console.error('Email verification send error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

app.get('/email-verification/verify/:token', async (req, res) => {
  try {
    const result = await emailverification.verifyToken(req.params.token);
    res.json({ success: result });
  } catch (error) {
    console.error('Email verification token error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// Use other routers
app.use('/password-reset', password_reset);
app.use('/forgot-password', password_reset);
app.use('/', database);
app.use('/api', api);
app.use('/api/payments', googlepayRouter);
app.use('/api/payments', paypalRouter);
app.use('/2fa', TwoFA);
app.use('/dashboard', dashboardRouter);
app.use('/', logoutRouter);
app.use('/admin', admin);
app.use('/order', Order);

// 404 handler
app.use((req, res) => {
  res.sendFile(path.join(process.cwd(), 'public/404/404.html'));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
