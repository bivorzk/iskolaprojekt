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
    .then(() => console.log('Connected to MongoDB for 2FA'))
    .catch(err => console.error('Could not connect to MongoDB for 2FA', err));

const User = require('../models/User');

const pendingCodes = new Map();
const pendingSessions = new Map();
const pendingApprovals = new Map();


async function store2FACode(userId, code, ttlSeconds = 1500) {
    const key = `2fa:${userId}`;
    if (isRedisAvailable) {
        try { await redisClient.setEx(key, ttlSeconds, String(code)); return; }
        catch (err) { console.error('Redis 2FA store failed:', err.message); }
    }
    pendingCodes.set(String(userId), { code, expires: Date.now() + ttlSeconds * 1000 });
}

async function get2FACode(userId) {
    const key = `2fa:${userId}`;
    if (isRedisAvailable) {
        try { return await redisClient.get(key); }
        catch (err) { console.error('Redis 2FA get failed:', err.message); }
    }
    const entry = pendingCodes.get(String(userId));
    if (entry && entry.expires > Date.now()) return String(entry.code);
    return null;
}

async function delete2FACode(userId) {
    const key = `2fa:${userId}`;
    if (isRedisAvailable) {
        try { await redisClient.del(key); }
        catch (err) { console.error('Redis 2FA del failed:', err.message); }
    }
    pendingCodes.delete(String(userId));
}

async function storePendingSession(userId, data, ttlSeconds = 1500) {
    const key = `2fa:pending:${userId}`;
    if (isRedisAvailable) {
        try { await redisClient.setEx(key, ttlSeconds, JSON.stringify(data)); return; }
        catch (err) { console.error('Redis 2FA pending store failed:', err.message); }
    }
    pendingSessions.set(String(userId), { data, expires: Date.now() + ttlSeconds * 1000 });
}

async function getPendingSession(userId) {
    const key = `2fa:pending:${userId}`;
    if (isRedisAvailable) {
        try {
            const val = await redisClient.get(key);
            return val ? JSON.parse(val) : null;
        } catch (err) { console.error('Redis 2FA pending get failed:', err.message); }
    }
    const entry = pendingSessions.get(String(userId));
    if (entry && entry.expires > Date.now()) return entry.data;
    return null;
}

async function deletePendingSession(userId) {
    const key = `2fa:pending:${userId}`;
    if (isRedisAvailable) {
        try { await redisClient.del(key); }
        catch (err) { console.error('Redis 2FA pending del failed:', err.message); }
    }
    pendingSessions.delete(String(userId));
}

async function storeApproval(userId, ttlSeconds = 600) {
    const key = `2fa:approved:${userId}`;
    if (isRedisAvailable) {
        try { await redisClient.setEx(key, ttlSeconds, '1'); return; }
        catch (err) { console.error('Redis 2FA approval store failed:', err.message); }
    }
    pendingApprovals.set(String(userId), { expires: Date.now() + ttlSeconds * 1000 });
}

async function getApproval(userId) {
    const key = `2fa:approved:${userId}`;
    if (isRedisAvailable) {
        try { return await redisClient.get(key); }
        catch (err) { console.error('Redis 2FA approval get failed:', err.message); }
    }
    const entry = pendingApprovals.get(String(userId));
    if (entry && entry.expires > Date.now()) return '1';
    return null;
}

async function deleteApproval(userId) {
    const key = `2fa:approved:${userId}`;
    if (isRedisAvailable) {
        try { await redisClient.del(key); }
        catch (err) { console.error('Redis 2FA approval del failed:', err.message); }
    }
    pendingApprovals.delete(String(userId));
}

// ── Routes (mounted at /2fa via app.use('/2fa', router)) ───────────────────

// POST /2fa — initiate number-match challenge after successful credential check
router.post('/', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).send('Email is required');

        const user = await User.findOne({ email });
        if (!user) return res.status(404).send('User not found');

        if (!user.is2Active) return res.status(403).send('2FA is not enabled for this account');

        // Reuse the existing code if one is already pending (idempotent).
        // This prevents the desktop/mobile app from overwriting the web's code.
        const existingCode = await get2FACode(user._id);
        const code = existingCode ? parseInt(existingCode, 10) : crypto.randomInt(10, 100);
        if (!existingCode) {
            await store2FACode(user._id, code);
        }

        // Pre-build the session payload so /status can restore it on approval
        const loginToken = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_LOGIN_SECRET,
            { expiresIn: '2h' }
        );
        const decodedToken = jwt.verify(loginToken, process.env.JWT_LOGIN_SECRET);

        await storePendingSession(user._id, {
            id: user.id,
            username: user.username,
            usertype: user.usertype,
            email: user.email,
            jwtToken: decodedToken,
        });

        const token = jwt.sign(
            { userId: String(user._id) },
            process.env.JWT_2FA_SECRET,
            { expiresIn: '25m' }
        );

        res.json({ token, code });
    } catch (err) {
        console.error('2FA initiate error:', err);
        res.status(500).send('Server error');
    }
});

router.get('/code', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer '))
            return res.status(401).send('Authorization token required');

        let decoded;
        try {
            decoded = jwt.verify(authHeader.slice(7), process.env.JWT_2FA_SECRET);
        } catch {
            return res.status(401).send('Token has expired or is invalid');
        }

        const code = await get2FACode(decoded.userId);
        if (!code) return res.status(404).send('No pending 2FA code');

        res.json({ code });
    } catch (err) {
        console.error('2FA code fetch error:', err);
        res.status(500).send('Server error');
    }
});

router.post('/approve', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer '))
            return res.status(401).send('Authorization token required');

        let decoded;
        try {
            decoded = jwt.verify(authHeader.slice(7), process.env.JWT_2FA_SECRET);
        } catch {
            return res.status(401).send('Token has expired or is invalid');
        }

        const code = await get2FACode(decoded.userId);
        if (!code) return res.status(404).send('No pending 2FA session');

        await storeApproval(decoded.userId);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('2FA approve error:', err);
        res.status(500).send('Server error');
    }
});

router.get('/status', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer '))
            return res.status(401).json({ approved: false });

        let decoded;
        try {
            decoded = jwt.verify(authHeader.slice(7), process.env.JWT_2FA_SECRET);
        } catch {
            return res.status(401).json({ approved: false, expired: true });
        }

        const approved = await getApproval(decoded.userId);
        if (!approved) return res.json({ approved: false });

        const sessionData = await getPendingSession(decoded.userId);
        if (!sessionData) {
            return res.status(404).json({ approved: false, error: 'Session data missing' });
        }

        // Clean up all 2FA keys (consume once)
        await Promise.all([
            delete2FACode(decoded.userId),
            deleteApproval(decoded.userId),
            deletePendingSession(decoded.userId),
        ]);

        await User.findByIdAndUpdate(decoded.userId, { lastActive: Date.now() });

        req.session.user = {
            id: sessionData.id,
            username: sessionData.username,
            usertype: sessionData.usertype,
            email: sessionData.email,
            IsLoggedIn: true,
            jwtToken: sessionData.jwtToken,
        };

        const redirectMap = {
            admin: '/dashboard/admin',
            editor: '/dashboard/editor',
            parent: '/dashboard/parent',
            teacher: '/dashboard/teacher',
        };
        const redirect = redirectMap[sessionData.usertype] || '/dashboard/student';

        res.json({ approved: true, redirect });
    } catch (err) {
        console.error('2FA status error:', err);
        res.status(500).send('Server error');
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { token, code } = req.body;
        if (!token || !code) return res.status(400).send('Token and code are required');

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_2FA_SECRET);
        } catch {
            return res.status(401).send('Token has expired or is invalid');
        }

        const storedCode = await get2FACode(decoded.userId);
        if (!storedCode) return res.status(401).send('2FA code has expired, please try again');

        if (parseInt(code, 10) !== parseInt(storedCode, 10))
            return res.status(401).send('Invalid 2FA code');

        await delete2FACode(decoded.userId);
        res.status(200).json({ success: true, userId: decoded.userId });
    } catch (err) {
        console.error('2FA verify error:', err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
