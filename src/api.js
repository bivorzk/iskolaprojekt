const express = require('express');
// Import User model and other database models
const { User } = require('./database');
const { Payment, LoyaltyProgram, MenuItems, Order, OrderItems } = require('../config/database_queries');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Client, Environment, OrdersController, PaymentsController, LogLevel, ApiError } = require('@paypal/paypal-server-sdk');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// Paypal configuration
const client = new Client({
    clientCredentialsAuthCredentials: {
        oAuthClientId: PAYPAL_CLIENT_ID,
        oAuthClientSecret: PAYPAL_CLIENT_SECRET,
    },
    timeout: 0,
    environment: Environment.Sandbox,
    logging: {
        logLevel: LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logHeaders: true },
    },
});

const ordersController = new OrdersController(client);
const paymentsController = new PaymentsController(client);

// Helper function to check if error is retryable
const isRetryableError = (error) => {
    if (!error.statusCode) return false;
    // Retry on server errors (5xx) and rate limiting (429)
    return error.statusCode >= 500 || error.statusCode === 429;
};

// Helper function to wait with exponential backoff
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const createOrder = async (cart, currency = "USD", amount = "0.00", maxRetries = 3) => {
    // PayPal sandbox works best with USD
    const paypalCurrency = "USD";
    
    // Calculate total and map items
    let total = 0;
    let items = [];
    if (Array.isArray(cart) && cart.length > 0) {
        items = cart.map((item, index) => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity) || 1;
            total += price * quantity;
            return {
                name: item.name || `Item ${index + 1}`,
                unitAmount: {
                    currencyCode: paypalCurrency,
                    value: price.toFixed(2),
                },
                quantity: quantity.toString(),
                description: item.description || "",
                sku: item.sku || `sku${index + 1}`,
            };
        });
    }
    // Use calculated total from items to ensure consistency
    const orderAmount = total > 0 ? total : parseFloat(amount);
    
    // Ensure item total exactly matches sum of individual items
    const itemTotalCalculated = items.reduce((sum, item) => {
        return sum + (parseFloat(item.unitAmount.value) * parseInt(item.quantity));
    }, 0);
    
    const finalAmount = itemTotalCalculated > 0 ? itemTotalCalculated : orderAmount;
    
    const collect = {
        body: {
            intent: "CAPTURE",
            purchaseUnits: [
                {
                    amount: {
                        currencyCode: paypalCurrency,
                        value: finalAmount.toFixed(2),
                        breakdown: {
                            itemTotal: {
                                currencyCode: paypalCurrency,
                                value: finalAmount.toFixed(2),
                            },
                        },
                    },
                    items: items.length > 0 ? items : [{
                        name: "Order Total",
                        unitAmount: {
                            currencyCode: paypalCurrency,
                            value: finalAmount.toFixed(2),
                        },
                        quantity: "1",
                        description: "Total order amount",
                        sku: "total01",
                    }],
                },
            ],
        },
        prefer: "return=minimal",
    };

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const { body, ...httpResponse } = await ordersController.createOrder(
                collect
            );
            return {
                jsonResponse: JSON.parse(body),
                httpStatusCode: httpResponse.statusCode,
            };
        } catch (error) {
            lastError = error;
            console.error(`PayPal createOrder attempt ${attempt + 1} failed:`, {
                statusCode: error.statusCode,
                message: error.message,
                debugId: error.headers?.['paypal-debug-id'] || 'N/A'
            });
            
            // If this is the last attempt or error is not retryable, don't retry
            if (attempt === maxRetries || !isRetryableError(error)) {
                break;
            }
            
            // Calculate delay with exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Retrying PayPal createOrder in ${delay}ms...`);
            await wait(delay);
        }
    }

    // All retries failed, throw the last error
    console.error('PayPal createOrder failed after all retries:', lastError);
    if (lastError instanceof ApiError) {
        const errorMessage = lastError.statusCode === 503 
            ? 'PayPal service is temporarily unavailable. Please try again in a few minutes.'
            : `PayPal API Error: ${lastError.message}`;
        throw new Error(errorMessage);
    }
    throw new Error(`Unknown PayPal error: ${lastError.message || lastError}`);
};

const captureOrder = async (orderID, maxRetries = 3) => {
    const collect = {
        id: orderID,
        prefer: "return=minimal",
    };

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const { body, ...httpResponse } = await ordersController.captureOrder(
                collect
            );
            return {
                jsonResponse: JSON.parse(body),
                httpStatusCode: httpResponse.statusCode,
            };
        } catch (error) {
            lastError = error;
            console.error(`PayPal captureOrder attempt ${attempt + 1} failed:`, {
                statusCode: error.statusCode,
                message: error.message,
                debugId: error.headers?.['paypal-debug-id'] || 'N/A'
            });
            
            // If this is the last attempt or error is not retryable, don't retry
            if (attempt === maxRetries || !isRetryableError(error)) {
                break;
            }
            
            // Calculate delay with exponential backoff
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Retrying PayPal captureOrder in ${delay}ms...`);
            await wait(delay);
        }
    }

    // All retries failed
    if (lastError instanceof ApiError) {
        const errorMessage = lastError.statusCode === 503 
            ? 'PayPal service is temporarily unavailable. Please try again in a few minutes.'
            : `PayPal API Error: ${lastError.message}`;
        throw new Error(errorMessage);
    }
    throw new Error(`Unknown PayPal error: ${lastError.message || lastError}`);
};

// api/orders
router.get('/test', (req, res) => {
  res.send('Test route working!');
});

// Route to get current logged-in user
router.get('/current_user', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ loggedIn: true });
    } else {
        res.json({ loggedIn: false });
    }
});

router.post('/orders', async (req, res) => {
    // Extract order details from request body
    const { cart, currency, amount } = req.body;
    console.log('Creating PayPal order with:', { cart, currency, amount });
    try {
        const { jsonResponse, httpStatusCode } = await createOrder(cart, currency, amount);
        console.log('PayPal order created:', jsonResponse);
        res.status(httpStatusCode).json(jsonResponse);
    }
    catch (error) {
        console.error('Error creating order:', error);
        
        // Provide appropriate HTTP status codes based on error type
        let statusCode = 500;
        let errorResponse = {
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while processing your payment',
            timestamp: new Date().toISOString()
        };
        
        if (error.message.includes('temporarily unavailable')) {
            statusCode = 503;
            errorResponse = {
                error: 'Service Unavailable',
                message: 'PayPal service is temporarily unavailable. Please try again in a few minutes.',
                retryAfter: 60, // seconds
                timestamp: new Date().toISOString()
            };
            res.set('Retry-After', '60');
        } else if (error.message.includes('PayPal API Error')) {
            statusCode = 502;
            errorResponse = {
                error: 'Bad Gateway',
                message: 'There was an issue communicating with PayPal. Please try again.',
                timestamp: new Date().toISOString()
            };
        }
        
        res.status(statusCode).json(errorResponse);
    }
});

router.post('/orders/:orderID/capture', async (req, res) => {
    const { orderID } = req.params;
    try {
        const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
        res.status(httpStatusCode).json(jsonResponse);
    }
    catch (error) {
        console.error('Error capturing order:', error);
        
        let statusCode = 500;
        let errorResponse = {
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while capturing your payment',
            timestamp: new Date().toISOString()
        };
        
        if (error.message.includes('temporarily unavailable')) {
            statusCode = 503;
            errorResponse = {
                error: 'Service Unavailable',
                message: 'PayPal service is temporarily unavailable. Please try again in a few minutes.',
                retryAfter: 60,
                timestamp: new Date().toISOString()
            };
            res.set('Retry-After', '60');
        } else if (error.message.includes('PayPal API Error')) {
            statusCode = 502;
            errorResponse = {
                error: 'Bad Gateway',
                message: 'There was an issue communicating with PayPal. Please try again.',
                timestamp: new Date().toISOString()
            };
        }
        
        res.status(statusCode).json(errorResponse);
    }
}); 

module.exports = router;