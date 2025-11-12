const express = require('express');
const app = express();
const port = 3000;
const rateLimit = require('express-rate-limit');
const database = require('./database');
const path = require('path');
const emailverification = require('./auth/email_verification');
const api = require('./api');
const googlepayRouter = require('./payments/googlepay');
const paypalRouter = require('./payments/paypal');
const password_reset = require('./auth/password_reset');
const database_queries = require('../config/database_queries');
const TwoFA = require('./auth/2fa');
const dashboardRouter = require('./dashboard/dashboard');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 50, // Teszt célokra max 15 orankent
  message: 'Too many accounts created from this IP, please try again after an hour'
});

const LoginLimiter = rateLimit({
  windowMs: 20 * 60 * 1000, // 20  minutes window 
  max: 35,
  message: 'Too many login attempts from this IP, please try again after 20 minutes'
});


// Apply the rate limiting middleware to all requests
app.use('/passwordhash', limiter);
app.use('/database', limiter);
app.use('/login', LoginLimiter);
app.use('/register', registerLimiter);



// Serve HTML
app.get('/', (req, res) => {
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


// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found 😀');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
  