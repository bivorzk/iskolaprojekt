const { faker } = require('@faker-js/faker');
const mongoose = require('mongoose');


const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

const User = require('../../src/database').User;
const { Payment, LoyaltyProgram, MenuItems, Order, OrderItems } = require('../../config/database_queries');
mongoose.connect(dbUrl + dbName)
  .then(() => console.log('Connected to MongoDB for user auth'))
  .catch(err => console.error('Could not connect to MongoDB for user auth', err));


// Set locale to Hungarian


