const jwt = require('jsonwebtoken');
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

require('dotenv').config();

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


const mailConfig = {

    from : process.env.EMAIL_USER,
    to : 'kugli.balazs.tech2021a@bolyaimovar.com',

    subject : 'Email verification',

    text: 'Hi, please verify your email by clicking the link below. This link is valid for 15 minutes.\n\n' +
    'http://localhost:3000/email-verification/verify/' + token + '\n\n' +
    'If you did not request this, please ignore this email.\n\n' +
    'Thank you!\n'
};

/*
transport.sendMail(mailConfig, function(err, info){
    if(err){
        console.log(err);
    }   else {
        console.log('Email sent: ' + info.response);
    }
});

*/

module.exports = router;