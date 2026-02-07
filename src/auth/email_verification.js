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
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <h2 style="color: #333;">Welcome to SnapTray!</h2>
        <p>Thank you for signing up. To complete your registration and start enjoying our services, please verify your email address using one of the methods below. Both options are valid for 10 minutes.</p>
        
        <h3 style="color: #4CAF50;">Option 1: Click the verification link</h3>
        <p><a href="http://snaptray.onrender.com/email-verification/verify/${token}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify My Email</a></p>
        
        <h3 style="color: #4CAF50;">Option 2: Enter the verification code</h3>
        <p>Verification Code: <strong style="font-size: 18px; color: #333;">${verificationCode}</strong></p>
        <p>Visit our <a href="http://snaptray.onrender.com/verify.html" style="color: #4CAF50;">verification page</a> and enter your email along with this code.</p>
        
        <p style="color: #666; font-size: 14px;">If you didn't create an account with SnapTray, please ignore this email.</p>
        
        <p>Thank you for joining us!</p>
        <p>Best regards,<br>The SnapTray Team</p>
        </div>`
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