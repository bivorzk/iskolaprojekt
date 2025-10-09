const express = require('express');
const router = express.Router();
const { token } = require('./email_verification.js')

router.post('/api/verify', (req, res) => {
    const token = token;
    if (!token) {
        return res.status(400).send('Token is required');
    }
    try {
        const decoded = jwt.verify(token, 'ourSecretKey');
        console.log('Decoded token:', decoded);
        res.status(200).send('Email verified successfully');
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(400).send('Token has expired or is invalid please try again');
    }
});






module.exports = router;