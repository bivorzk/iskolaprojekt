# Cafeteria Ordering System (Final exam Thesis)

## Project Description

This is a web-based application for school cafeterias, allowing students to order food online and administrators to manage menus, users, and orders. It features secure authentication, payment integration (PayPal and Google Pay), and dashboards for both roles.

## Key Features

- User registration and login with email verification and 2FA
- Student dashboard for placing orders, viewing transactions, and managing wallet
- Admin dashboard for managing menu items, users, statistics, and orders
- Payment processing via PayPal and Google Pay
- Security features: rate limiting, XSS protection, password strength checking
- Real-time order status updates
- Loyalty system integration

## Architecture Overview

- **Frontend**: React components with Tailwind CSS for styling
- **Backend**: Node.js with Express.js server
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis for session management and rate limiting, with Lua scripts for atomic operations (e.g., wallet updates, order processing)
- **Payments**: PayPal SDK and Google Pay API
- **Authentication**: JWT tokens, bcrypt for hashing
- **Security**: Helmet, CORS, express-validator, etc.

## Prerequisites

- Node.js (version 16 or higher)
- MongoDB (local or cloud instance)
- Redis (for caching; can be run via Docker)
- npm or yarn

## Installation

1. Clone the repository: `git clone <repo-url>`
2. Navigate to the directory: `cd iskolaprojekt`
3. Install dependencies: `npm install`
4. Set up environment variables (see below)
5. Start Redis
6. Run the app: `npm start`

## Environment Configuration
```
1. Create a `.env` file in the root directory
2. Go to Discord #general channel 
3. Go to Pinned Messages
4. Find the messages that has the .env variables
5. Copy and paste it into .env
```

## Security

This application implements comprehensive security best practices, including:

- **Input Validation and Sanitization**: Uses express-validator for request validation, express-mongo-sanitize to prevent NoSQL injection, and xss-clean for XSS protection.
- **Rate Limiting**: Implements express-rate-limit with Redis to prevent abuse and DDoS attacks.
- **Authentication and Authorization**: JWT-based auth with bcrypt password hashing, 2FA support, and session management via Redis.
- **Security Headers**: Helmet.js for setting secure HTTP headers (CSP, HSTS, etc.).
- **Password Security**: Enforces strong passwords using zxcvbn, checks against common passwords, and supports secure password resets.
- **Email Verification**: Disposable email detection and verification to prevent spam accounts.
- **Payment Security**: Secure integration with PayPal and Google Pay APIs, with proper handling of sensitive data.
- **Additional Protections**: HPP (HTTP Parameter Pollution) prevention, CORS configuration, and reCAPTCHA for bot protection.
- **Monitoring and Logging**: Security checks and logging for suspicious activities.




