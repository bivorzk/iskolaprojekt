const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });


const User = require('../database').User;


router.get('/parents', async (req, res) => {
    try {
        const parents = await User.find({ role: 'parent' });
        res.json(parents);
    } catch (error) {
        console.error('Error fetching parents:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
