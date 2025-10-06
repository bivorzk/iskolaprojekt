const express = require('express');
const app = express();
const port = 3000;
const rateLimit = require('express-rate-limit');
const database = require('./database');
const path = require('path');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

app.use('/database', limiter);



// Mount routes from database router at root so it provides POST /login and POST /register
app.use('/', database);

// Serve HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

// Note: POST /login and POST /register are handled by the database router

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
  