const sgMail = require('@sendgrid/mail');
const jwt = require('jsonwebtoken');

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendVerificationEmail(email, verificationCode) {
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

  try {
    // Send email using SendGrid API and return the response (Promise)
    const response = await sgMail.send(mailConfig);
    console.log('Email sent successfully via SendGrid');
    console.log('SendGrid Response Status:', response[0].statusCode);
    console.log('SendGrid Message ID:', response[0].headers['x-message-id']);
    return response; // Return response for further use
  } catch (error) {
    console.error('Email sending failed:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    throw new Error('Email sending failed'); // Throw error if email couldn't be sent
  }
}

module.exports = { sendVerificationEmail };
