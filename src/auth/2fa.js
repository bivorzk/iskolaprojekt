const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const path = require('path');
const app = express();
const mongoose = require('mongoose');

    
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

mongoose.connect(dbUrl + dbName)
    .then(() => console.log('Connected to MongoDB for database queries'))
    .catch(err => console.error('Could not connect to MongoDB for database queries', err));

const db = mongoose.connection;

const User = require('../src/database').User;


const random = Math.floor(Math.random() * 90) + 10;
console.log(random);


const user = await User.findOne({ email: req.body.email });
const userid = user?._id

const TwoFA = {
    userId: userid,
    secret: random
};

const token = jwt.sign({
    data: TwoFA
    }, 'our2FASecretKey', { expiresIn: '25m' }
);
router.post('/setup-2fa', async (req, res) => {
    const email = req.body.email;

    const user = await User.findOne({ email: email });
    if (!user) {
        return res.status(404).send('User not found');
    });
