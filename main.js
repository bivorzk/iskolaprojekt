const express = require('express');
const app = express();
const port = 3000;
const rateLimit = require('express-rate-limit');
const database = require('./database');
const path = require('path');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
  

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 15, // start blocking after 5 requests
  message: 'Too many accounts created from this IP, please try again after an hour'
});

app.use('/passwordhash', limiter);
app.use('/database', limiter);
app.use('/login', limiter);
app.use('/register', registerLimiter);


// Mount routes from database router at root so it provides POST /login and POST /register

// Serve HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});


app.use('/', database);


app.use((req, res) => {
  res.status(404).send('Page not found 😀');
});

// Note: POST /login and POST /register are handled by the database router

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
  