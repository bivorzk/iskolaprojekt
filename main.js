const express = require('express');
const app = express();
const port = 3000;
const rateLimit = require('express-rate-limit');
const database = require('./database');
const path = require('path');
const emailverification = require('./email_verification');
const api = require('./api');
const password_reset = require('./password_reset');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 15, // Teszt célokra max 15 orankent
  message: 'Too many accounts created from this IP, please try again after an hour'
});

const LoginLimiter = rateLimit({
  windowMs: 20 * 60 * 1000, // 20  minutes window 
  max: 35,
  message: 'Too many login attempts from this IP, please try again after 20 minutes'
});

app.use('/passwordhash', limiter);
app.use('/database', limiter);
app.use('/login', LoginLimiter);
app.use('/register', registerLimiter);

// Serve HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});
app.get('/password-reset/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'password_reset.html'));
});


/*
app.get('/email-verification/verify/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'verify.html'));
});
*/

app.use('/password-reset', password_reset);
app.use('/forgot-password', password_reset);
app.use('/email-verification', emailverification);
app.use('/', database);
app.use('/api', api);


app.use((req, res) => {
  res.status(404).send('Page not found 😀');
});

// Note: POST /login and POST /register are handled by the database router

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
  