const jwt = require('jsonwebtoken');
const express = require('express');
const sgMail = require('@sendgrid/mail');
const router = express.Router();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const app = express();
const { getVerificationCode, deleteVerificationCode } = require('../verificationStore');

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


const token = jwt.sign({
    data: 'Token Data'
    }, process.env.JWT_EMAIL_SECRET, { expiresIn: '15m' }
);

function sendVerificationEmail(email, verificationCode) {
    // Generate JWT token with email (expires in 20 minutes)
    const token = jwt.sign({ email }, process.env.JWT_EMAIL_SECRET, { expiresIn: '20m' });
    
    console.log('=== EMAIL CONFIGURATION DEBUG ===');
    console.log('FROM EMAIL:', process.env.EMAIL_USER);
    console.log('TO EMAIL:', email);
    console.log('SENDGRID_API_KEY set:', !!process.env.SENDGRID_API_KEY);
    console.log('=====================================');

    const mailConfig = {
        from: {
            email: process.env.EMAIL_USER,
            name: 'SnapTray'
        },
        to: email,
        subject: 'Email Verification - SnapTray',
        html: `Hi, please verify your email in one of the following ways. Both are valid for 10 minutes.<br><br>
        <strong>Option 1: Click the link</strong><br>
        <a href="http://snaptray.onrender.com/email-verification/verify/${token}">Verify Email</a><br><br>
        <strong>Option 2: Enter the code manually</strong><br>
        Verification Code: ${verificationCode}<br>
        Go to the verification page and enter your email and this code.<br><br>
        If you did not request this, please ignore this email.<br><br>
        Thank you!`
    };

    sgMail.send(mailConfig)
        .then((response) => {
            console.log('Email sent successfully via SendGrid');
            console.log('SendGrid Response Status:', response[0].statusCode);
            console.log('SendGrid Message ID:', response[0].headers['x-message-id']);
            return true;
        })
        .catch((error) => {
            console.log('Email sending failed:', error.message);
            console.log('Full error:', JSON.stringify(error, null, 2));
            return false;
        });
}

router.post('/verify-code', async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).send('Email and code are required');
    }

    try {
        const storedCode = await getVerificationCode(email);
        if (!storedCode || storedCode !== code) {
            return res.status(400).send('Invalid or expired verification code');
        }

        // Code is valid, verify the user
        const User = require('../models/User');
        await User.updateOne({ email: email }, { isVerified: true });
        console.log('User email verified:', email);

        // Delete the code from store
        await deleteVerificationCode(email);

        res.status(200).send('Email verified successfully');
    } catch (error) {
        console.error('Error verifying code:', error);
        res.status(500).send('Server error');
    }
});

router.get('/verify/:token', async (req, res) => {
    const token = req.params.token;

    if (!token) {
        return res.status(400).send('Token is required');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_EMAIL_SECRET);
        const email = decoded.email;

        const User = require('../models/User');
        await User.updateOne({ email }, { isVerified: true });
        console.log('User email verified:', email);

        res.status(200).send('Email verified successfully');
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(400).send('Token has expired or is invalid, please try again');
    }
});

router.sendVerificationEmail = sendVerificationEmail;
module.exports = router;