const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { redisClient, isRedisAvailable } = require('../redis');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

router.use(express.urlencoded({ extended: true }));
mongoose.connect(dbUrl + dbName, { maxPoolSize: 50, minPoolSize: 5 })
    .then(() => console.log('Connected to MongoDB for database queries'))
    .catch(err => console.error('Could not connect to MongoDB for database queries', err));

const { User } = require('../../src/database');

const pendingCodes = new Map(); // In-memory fallback

async function store2FACode(userId, code, ttlSeconds = 1500) {
    const key = `2fa:${userId}`;
    if (isRedisAvailable) {
        try {
            await redisClient.setEx(key, ttlSeconds, String(code));
            return;
        } catch (err) {
            console.error('Redis 2FA store failed, using memory fallback:', err.message);
        }
    }
    pendingCodes.set(String(userId), { code, expires: Date.now() + ttlSeconds * 1000 });
}

async function get2FACode(userId) {
    const key = `2fa:${userId}`;
    if (isRedisAvailable) {
        try {
            return await redisClient.get(key);
        } catch (err) {
            console.error('Redis 2FA get failed, using memory fallback:', err.message);
        }
    }
    const entry = pendingCodes.get(String(userId));
    if (entry && entry.expires > Date.now()) return String(entry.code);
    return null;
}

async function delete2FACode(userId) {
    const key = `2fa:${userId}`;
    if (isRedisAvailable) {
        try {
            await redisClient.del(key);
        } catch (err) {
            console.error('Redis 2FA del failed:', err.message);
        }
    }
    pendingCodes.delete(String(userId));
}

// Initiates 2FA — call this after successful password verification
router.post('/2fa', async (req, res) => {
    try {
        const email = req.body.email;
        if (!email) {
            return res.status(400).send('Email is required');
        }

        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).send('User not found');
        }

        const code = crypto.randomInt(10, 100); // 2-digit code (10–99)

        await store2FACode(user._id, code);

        // Return a short-lived token the client uses to poll /2fa/code and verify
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_2FA_SECRET,
            { expiresIn: '25m' }
        );

        res.json({ token });
    } catch (err) {
        console.error('2FA error:', err);
        res.status(500).send('Server error');
    }
});

// Mobile app polls this endpoint to display the pending code to the user
router.get('/2fa/code', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).send('Authorization token required');
        }

        let decoded;
        try {
            decoded = jwt.verify(authHeader.slice(7), process.env.JWT_2FA_SECRET);
        } catch (err) {
            return res.status(401).send('Token has expired or is invalid');
        }

        const code = await get2FACode(decoded.userId);
        if (!code) {
            return res.status(404).send('No pending 2FA code');
        }

        res.json({ code });
    } catch (err) {
        console.error('2FA code fetch error:', err);
        res.status(500).send('Server error');
    }
});

// Web app calls this with the token (from POST /2fa) and the code the user typed
router.post('/2fa/verify', async (req, res) => {
    try {
        const { token, code } = req.body;

        if (!token || !code) {
            return res.status(400).send('Token and code are required');
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_2FA_SECRET);
        } catch (err) {
            return res.status(401).send('Token has expired or is invalid');
        }

        const storedCode = await get2FACode(decoded.userId);
        if (!storedCode) {
            return res.status(401).send('2FA code has expired, please try again');
        }

        if (parseInt(code, 10) !== parseInt(storedCode, 10)) {
            return res.status(401).send('Invalid 2FA code');
        }

        await delete2FACode(decoded.userId);

        res.status(200).json({ success: true, userId: decoded.userId });
    } catch (err) {
        console.error('2FA verify error:', err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
