    const jwt = require('jsonwebtoken');
    const express = require('express');
    const nodemailer = require('nodemailer');
    const router = express.Router();
    require('dotenv').config();
    const app = express();
    const bcrypt = require('bcrypt');
    const passwordStrength = require('zxcvbn')
    const banned_words_hu = require('./hu.json');
    const banned_words = require('badwords-list').array;
    const password_characters = require('./password_characters.json');
    const banned_passwords = require('./Most_used_passwords.json');
    const mongoose = require('mongoose');

    salt = 10;


    const dbUrl = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME;

    mongoose.connect(dbUrl + dbName)
    .then(() => console.log('Connected to MongoDB for password reset'))
    .catch(err => console.error('Could not connect to MongoDB', err));


    const User = require('./database').User;

    router.use(express.urlencoded({ extended: true }));
    router.use(express.json());

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

        function sendVerificationEmail(email, userId) {
        const token = jwt.sign({
            userId: userId,
            email: email
        }, 'ourSecretKey', { expiresIn: '15m' });

        // Log token to console for testing purposes
        console.log('=== PASSWORD RESET TOKEN GENERATED ===');
        console.log('Email:', email);
        console.log('Token:', token);
        console.log('Reset URL: http://localhost:3000/password-reset/' + token);
        console.log('======================================');

        const mailConfig = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset',
            text: 'Hi, please reset your password by clicking the link below. This link is valid for 15 minutes.\n\n' +
            'http://localhost:3000/password-reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email.\n\n' +
            'Thank you!\n'
        };

        transport.sendMail(mailConfig, function(err, info){
            if(err){
                console.log('Email sending failed:', err.message);
                console.log('You can use the token above for testing');
                return false;
            } else {
                console.log('Email sent successfully: ' + info.response);
                return true;
            }
        });
    }

    router.get('/:token', async (req, res) => {
        const token = req.params.token;

        if (!token) {
            return res.status(400).send('Token is required');
        }
        try {
            const decoded = jwt.verify(token, 'ourSecretKey');
            console.log('Decoded token:', decoded);
            
            // Verify user still exists in database
            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.status(400).send('User not found');
            }
            
            res.status(200).send('Token is valid. You may now reset your password.');
        } catch (error) {
            console.error('Error verifying token:', error);
            res.status(400).send('Token has expired or is invalid, please try again');
        }
    });

    // Password reset logic should be in a POST route
    router.post('/:token', async (req, res) => {
        const token = req.params.token;
        const { newPassword, confirmPassword } = req.body;

        if (!token) {
            return res.status(400).send('Token is required');
        }
        try {
            const decoded = jwt.verify(token, 'ourSecretKey');
            
            // Find the user based on the JWT token information
            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.status(400).send('User not found');
            }
            
            // Validate passwords
            if (!newPassword || !confirmPassword) {
                return res.status(400).send('Both password fields are required');
            }
            if (newPassword !== confirmPassword) {
                return res.status(400).send('Passwords do not match');
            }
            if (newPassword.length < 8 || newPassword.length > 50) {
                return res.status(400).send('Password must be between 8 and 50 characters');
            }
            if (user.username && user.username === newPassword) {
                return res.status(400).send('Username and password cannot be the same');
            }
            for (const word of Object.values(banned_words_hu)) {
                if (newPassword.toLowerCase().includes(word)) {
                    return res.status(400).send('Password contains banned words');
                }
            }
            for (const word of banned_words) {
                if (newPassword.toLowerCase().includes(word)) {
                    return res.status(400).send('Password contains banned words');
                }
            }
            for (const bannedPassword of banned_passwords) {
                if (newPassword.toLowerCase() === bannedPassword) {
                    return res.status(400).send('Password is too common, choose a stronger one');
                }
            }
            // Check for at least one uppercase (including Hungarian), one digit, and one special character
            const hasUppercase = [...password_characters.uppercase, ...password_characters.hungarian_uppercase]
                .find(char => newPassword.includes(char));
            const hasDigit = Array.from(password_characters.digits)
                .find(char => newPassword.includes(char));
            const hasSpecial = Array.from(password_characters.special)
                .find(char => newPassword.includes(char));

            if (!hasUppercase || !hasDigit || !hasSpecial) {
                return res.status(400).send('Password must contain at least one uppercase letter, one digit, and one special character');
            }

            if (passwordStrength(newPassword).score <= 3) {
                return res.status(400).send(
                    'Password is too weak, choose a stronger one. ' +
                    passwordStrength(newPassword).feedback.warning + ' ' +
                    passwordStrength(newPassword).guesses
                );
            }

            // Hash and save the new password
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            console.log('New hashed password created for user:', user.username);

            // Update the user's password in the database
            user.password = hashedPassword;
            await user.save();

            console.log('Password successfully updated for user:', user.username);
            res.status(200).send('Password has been reset successfully');
        } catch (error) {
            console.error('Error resetting password:', error);
            if (error.name === 'JsonWebTokenError') {
                res.status(400).send('Invalid token');
            } else if (error.name === 'TokenExpiredError') {
                res.status(400).send('Token has expired, please request a new password reset');
            } else {
                res.status(500).send('Error resetting password');
            }
        }
    });

    // Route to initiate password reset
    router.post('/', async (req, res) => {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).send('Email is required');
        }
        
        try {
            // Find user by email
            const user = await User.findOne({ email: email });
            if (!user) {
                // Don't reveal whether user exists or not for security
                return res.status(200).send('If an account with that email exists, a password reset link has been sent');
            }
            
            // Send password reset email
            sendVerificationEmail(email, user._id);
            res.status(200).send('If an account with that email exists, a password reset link has been sent');
        } catch (error) {
            console.error('Error initiating password reset:', error);
            res.status(500).send('Error processing password reset request');
        }
    });

    router.sendVerificationEmail = sendVerificationEmail;
    module.exports = router;