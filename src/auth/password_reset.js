    const jwt = require('jsonwebtoken');
    const express = require('express');
    const sgMail = require('@sendgrid/mail');
    const router = express.Router();
    const path = require('path');
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });
    const app = express();
    const bcrypt = require('bcrypt');
    const passwordStrength = require('zxcvbn')
    const banned_words_hu = require('../../config/hu.json');
    const banned_words = require('badwords-list').array;
    const password_characters = require('../../data/password_characters.json');
    const banned_passwords = require('../../data/Most_used_passwords.json');

    salt = 10;


    const User = require('../database').User;

    router.use(express.urlencoded({ extended: true }));
    router.use(express.json());

    // Set SendGrid API key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        function sendVerificationEmail(email, userId) {
        const token = jwt.sign({
            userId: userId,
            email: email
        }, process.env.JWT_SECRET, { expiresIn: '15m' });

        // Log token to console for testing purposes
        console.log('=== PASSWORD RESET TOKEN GENERATED ===');
        console.log('Email:', email);
        console.log('Token:', token);
        console.log('Reset URL: ' + process.env.PRODUCTION_HOST + '/password-reset/' + token);
        console.log('======================================');

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
            subject: 'Password Reset - SnapTray',
            text: 'Hi,\n\n' +
            'We received a request to reset your password for your SnapTray account. If you made this request, please click the link below to securely reset your password. This link will expire in 15 minutes for your security.\n\n' +
            'Reset Password: ' + process.env.PRODUCTION_HOST + '/password-reset/' + token + '\n\n' +
            'If you didn\'t request a password reset, please ignore this email. Your password will remain unchanged.\n\n' +
            'For your security, please don\'t share this email or the link with anyone.\n\n' +
            'Thank you,\n' +
            'The SnapTray Team\n'
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
                console.log('You can use the token above for testing');
                return false;
            });
    }

    router.get('/:token', async (req, res) => {
        const token = req.params.token;

        if (!token) {
            return res.status(400).send('Token is required');
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded token:', decoded);
            
            // Verify user still exists in database
            const user = await User.findById(decoded.userId).lean();
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
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
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
            const user = await User.findOne({ email: email }).lean();
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