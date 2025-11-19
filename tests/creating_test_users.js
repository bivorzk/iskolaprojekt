const mongooose = require('mongoose');
const User = require('../../src/database');
require('dotenv').config();

// Connect to MongoDB
const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

mongooose.connect(dbUrl + dbName)
  .then(() => {
    console.log('Connected to MongoDB for creating test users');
    createTestUsers();
  })
  .catch(err => console.error('Could not connect to MongoDB for creating test users', err));
  