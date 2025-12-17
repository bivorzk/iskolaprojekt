const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

router.use(express.urlencoded({ extended: true }));
mongoose.connect(dbUrl + dbName)
    .then(() => console.log('Connected to MongoDB for database queries'))
    .catch(err => console.error('Could not connect to MongoDB for database queries', err));

const { User } = require('../../src/database');

router.post('/2fa', async (req, res) => {
    const email = req.body.email;
    const user = await User.findOne({ email: email });
    if (!user) {
        return res.status(404).send('User not found');
    }

    // UPDATE RANDOM TO NOT INTEGRATE MATH.RANDOM 
    const random = crypto.randomInt(10, 100);
    console.log(random);

    const TwoFA = {
        userId: user._id,
        secret: random
    };

    const token = jwt.sign({
        data: TwoFA
    }, 'our2FASecretKey', { expiresIn: '25m' });

    res.json({ token });
});

module.exports = router;
