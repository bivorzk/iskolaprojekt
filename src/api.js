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

const createOrder = async (cart, currency = "USD", amount = "0.00") => {
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
    try {
        const { body, ...httpResponse } = await ordersController.createOrder(
            collect
        );
        return {
            jsonResponse: JSON.parse(body),
            httpStatusCode: httpResponse.statusCode,
        };
    } catch (error) {
        console.error('PayPal createOrder backend error:', error);
        if (error instanceof ApiError) {
            throw new Error(`PayPal API Error: ${error.message}`);
        }
        throw new Error(`Unknown PayPal error: ${error.message || error}`);
    }
};

const captureOrder = async (orderID) => {
    const collect = {
        id: orderID,
        prefer: "return=minimal",
    };

    try {
        const { body, ...httpResponse } = await ordersController.captureOrder(
            collect
        );
        return {
            jsonResponse: JSON.parse(body),
            httpStatusCode: httpResponse.statusCode,
        };
    } catch (error) {
        if (error instanceof ApiError) {
            throw new Error(error.message);
        }
    }
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
        res.status(500).json({ 
            error: 'Internal Server Error',
            message: error.message,
            details: error.toString()
        });
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
        res.status(500).json({ error: 'Internal Server Error' });
    }
}); 

module.exports = router;