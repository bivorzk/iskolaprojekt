const jwt = require('jsonwebtoken');
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
require('dotenv').config();
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
        to: email, // Use the email parameter instead of lastRegisteredEmail
        subject: 'Email verification',
        text: 'Hi, please verify your email by clicking the link below. This link is valid for 15 minutes.\n\n' +
        'http://localhost:3000/api/verify/' + token + '\n\n' +
        'If you did not request this, please ignore this email.\n\n' +
        'Thank you!\n'
    };

    transport.sendMail(mailConfig, function(err, info){
        if(err){
            console.log(err);
            return false;
        } else {
            console.log('Email sent: ' + info.response);
            return true;
        }
    });
}

router.sendVerificationEmail = sendVerificationEmail;
router.token = token;
module.exports = router;