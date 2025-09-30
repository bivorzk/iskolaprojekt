const express = require('express');
const app = express();
const port = 3000;
const passwordhash = require('./passwordhash');
const database = require('./database');
const path = require('path');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Mount routes
app.use('/passwordhash', passwordhash);
app.use('/database', database);

// Serve HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
  