const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Security middleware configuration
const securityMiddleware = express();

// 1. Set security headers
securityMiddleware.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// 2. Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60 // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth attempts per windowMs
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 payment attempts per hour
    message: {
        error: 'Too many payment attempts, please try again later.',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 3. CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:3000',
            // Add your production domains here
        ];

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

// 4. Body parser with size limits
securityMiddleware.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        // Store raw body for webhook verification if needed
        req.rawBody = buf;
    }
}));

securityMiddleware.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

// 5. Data sanitization against NoSQL injection
securityMiddleware.use(mongoSanitize({
    replaceWith: '_'
}));

// 6. Data sanitization against XSS
securityMiddleware.use(xss());

// 7. Prevent parameter pollution
securityMiddleware.use(hpp({
    whitelist: ['currency', 'amount', 'total'] // Allow certain parameters to be duplicated
}));

// 8. Security headers for API
securityMiddleware.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Remove server information
    res.removeHeader('X-Powered-By');

    next();
});

// 9. Request logging (without sensitive data)
securityMiddleware.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const method = req.method;
    const url = req.url;

    // Log basic request info without sensitive data
    console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);

    next();
});

// 10. Input validation middleware
const validateOrderInput = (req, res, next) => {
    const { cart, currency, amount } = req.body;

    // Validate cart
    if (!Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({
            error: 'Invalid Cart',
            message: 'Cart must be a non-empty array'
        });
    }

    // Validate cart items
    for (const item of cart) {
        if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
            return res.status(400).json({
                error: 'Invalid Cart Item',
                message: 'Each cart item must have a valid name'
            });
        }

        if (!item.price || isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0) {
            return res.status(400).json({
                error: 'Invalid Cart Item',
                message: 'Each cart item must have a valid positive price'
            });
        }

        if (item.quantity && (isNaN(parseInt(item.quantity)) || parseInt(item.quantity) < 1)) {
            return res.status(400).json({
                error: 'Invalid Cart Item',
                message: 'Quantity must be a positive integer'
            });
        }
    }

    // Validate currency
    const allowedCurrencies = ['USD', 'EUR', 'HUF'];
    if (currency && !allowedCurrencies.includes(currency.toUpperCase())) {
        return res.status(400).json({
            error: 'Invalid Currency',
            message: 'Currency must be USD, EUR, or HUF'
        });
    }

    // Validate amount
    if (amount && (isNaN(parseFloat(amount)) || parseFloat(amount) < 0)) {
        return res.status(400).json({
            error: 'Invalid Amount',
            message: 'Amount must be a positive number'
        });
    }

    next();
};

const validatePaymentInput = (req, res, next) => {
    const { items, total, currency, paymentMethod, transactionId } = req.body;

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            error: 'Invalid Items',
            message: 'Items must be a non-empty array'
        });
    }

    // Validate total
    if (!total || isNaN(parseFloat(total)) || parseFloat(total) < 0) {
        return res.status(400).json({
            error: 'Invalid Total',
            message: 'Total must be a positive number'
        });
    }

    // Validate currency
    const allowedCurrencies = ['USD', 'EUR', 'HUF'];
    if (!allowedCurrencies.includes(currency?.toUpperCase())) {
        return res.status(400).json({
            error: 'Invalid Currency',
            message: 'Currency must be USD, EUR, or HUF'
        });
    }

    // Validate payment method
    const allowedMethods = ['PayPal', 'GooglePay', 'Balance'];
    if (paymentMethod && !allowedMethods.includes(paymentMethod)) {
        return res.status(400).json({
            error: 'Invalid Payment Method',
            message: 'Payment method must be PayPal, GooglePay, or Balance'
        });
    }

    next();
};

module.exports = {
    securityMiddleware,
    limiter,
    authLimiter,
    paymentLimiter,
    corsOptions,
    validateOrderInput,
    validatePaymentInput
};