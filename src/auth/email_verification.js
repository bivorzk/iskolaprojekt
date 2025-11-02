const jwt = require('jsonwebtoken');
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const app = express();

const transport = nodemailer.createTransport({
    port: 465,
    host: 'smtp.gmail.com',
    secure: true,
    service: 'Gmail',
    type: 'login',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const token = jwt.sign({
    data: 'Token Data'
    }, 'ourSecretKey', { expiresIn: '15m' }
);

function sendVerificationEmail(email) {
    const mailConfig = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email verification',
        text: 'Hi, please verify your email by clicking the link below. This link is valid for 15 minutes.\n\n' +
        'http://localhost:3000/email-verification/verify/' + token + '\n\n' +
        'If you did not request this, please ignore this email.\n\n' +
        'Thank you!\n'
    };

    newemail = null

    transport.sendMail(mailConfig, function(err, info){
        if(err){
            console.log(err);
            return false;
        } else {
            console.log('Email sent: ' + info.response);
            newemail = info.accepted[0];
            return true;
        }
    });
}

router.get('/verify/:token', async (req, res) => {
    const token = req.params.token;

    if (!token) {
        return res.status(400).send('Token is required');
    }
    try {
        const decoded = jwt.verify(token, 'ourSecretKey');
        console.log('Decoded token:', decoded);

        const { User } = require('../database');
        const email = newemail; // Use the email captured during sending

        console.log("========================================");
        console.log("Email to verify:", email);
        console.log("========================================");

        await User.updateOne({ email: email }, { isVerified: true });
        console.log('User email verified:', email);

        res.status(200).send('Email verified successfully');
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(400).send('Token has expired or is invalid please try again');
    }
});

router.sendVerificationEmail = sendVerificationEmail;
router.token = token;
module.exports = router;