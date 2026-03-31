'use strict';
const express = require('express');
const path    = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
app.set('trust proxy', 1);

const rateLimit = require('express-rate-limit');
const session   = require('express-session');
const { RedisStore: SessionRedisStore } = require('connect-redis');
const helmet      = require('helmet');
const compression = require('compression');
const database    = require('./database');
const emailverification = require('./auth/email_verification');
const api             = require('./api');
const { RedisStore }  = require('rate-limit-redis');
const favicon         = require('serve-favicon');
const googlepayRouter = require('./payments/googlepay');
const paypalRouter    = require('./payments/paypal');
const password_reset  = require('./auth/password_reset');
const database_queries = require('../config/database_queries');
const TwoFA           = require('./auth/2fa');
const dashboardRouter = require('./dashboard/dashboard');
const logoutRouter    = require('./logout');
const Order           = require('./Orders/Order');
const redisLuaService   = require('./services/redis-lua-service');
const chatService       = require('./services/chat-service');
const geosecurityService = require('./services/Geosecurity-service');
const cors = require('cors');
const { startChangeStreams, stopChangeStreams } = require('./dashboard/services/cache-service');
const { Server } = require('socket.io');

let redisAvailable = false;
const { redisClient } = require('./redis');

redisClient.on('connect', async () => {
  redisAvailable = true;
  try { await redisLuaService.initialize(); }
  catch (error) { console.error('Failed to initialize Redis Lua service:', error); }
});

const mongoose = require('mongoose');
if (mongoose.connection.readyState === 1) {
  startChangeStreams();
} else {
  mongoose.connection.once('open', startChangeStreams);
}

process.on('SIGTERM', stopChangeStreams);
process.on('SIGINT',  stopChangeStreams);
redisClient.on('error', (err) => {
  redisAvailable = false;
  console.error('Redis error:', err.message);
});

// Static assets served before session (no Redis op per asset)
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(favicon(path.join(process.cwd(), 'public', 'favicon.ico')));
app.use(express.static(path.join(process.cwd(), 'public'), { maxAge: '1d', etag: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new SessionRedisStore({ client: redisClient }),
  cookie: { secure: false }
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public/home_page/home_page.html'));
});

const server = require('http').createServer(app);
server.keepAliveTimeout = 65000;
server.headersTimeout   = 66000;

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

chatService.initializeChatSocket(io);

const createStore = () => redisAvailable ? new RedisStore({
  sendCommand: async (command, ...args) => await redisClient.sendCommand([command, ...args]),
}) : undefined;

const HOUR        = 60 * 60 * 1000;
const QUARTERHOUR = 15 * 60 * 1000;

const limiter = rateLimit({
  windowMs: HOUR,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  handler: (req, res) => {
    res.status(429).sendFile(path.join(process.cwd(), 'public/429/429.html'));
  },
});

const registerLimiter = rateLimit({
  windowMs: HOUR,
  max: 100,
  handler: (req, res) => {
    res.status(429).sendFile(path.join(process.cwd(), 'public/429/429.html'));
  },
  store: createStore(),
});

const LoginLimiter = rateLimit({
  windowMs: QUARTERHOUR,
  max: 35,
  handler: (req, res) => {
    res.status(429).sendFile(path.join(process.cwd(), 'public/429/429.html'));
  },
  store: createStore(),
});

const dashboardLimiter = rateLimit({
  windowMs: QUARTERHOUR,
  max: 1000,
  handler: (req, res) => {
    res.status(429).sendFile(path.join(process.cwd(), 'public/429/429.html'));
  },
  store: createStore(),
});

app.use('/passwordhash', limiter);
app.use('/database', limiter);
app.use('/login', LoginLimiter);
app.use('/register', registerLimiter);
app.use('/api', limiter);
app.use('/dashboard', dashboardLimiter);
app.use('/2fa', limiter);
app.use('/email-verification', limiter);
app.use('/pay', limiter);

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
app.get('/chat', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public/chat/index.html'));
});

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
app.use('/order', Order);
app.use('/chat', chatService);
app.use('/api/geosecurity', geosecurityService);

app.use((req, res) => {
  res.sendFile(path.join(process.cwd(), 'public/404/404.html'));
});

server.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`);
});

