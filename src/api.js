const express = require('express');
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

const createOrder = async (cart) => {
   const collect = {
        body: {
            intent: "CAPTURE",
            purchaseUnits: [
                {
                    amount: {
                        currencyCode: "USD",
                        value: "100",
                        breakdown: {
                            itemTotal: {
                                currencyCode: "USD",
                                value: "100",
                            },
                        },
                    },
                    // lookup item details in `cart` from database
                    items: [
                        {
                            name: "T-Shirt",
                            unitAmount: {
                                currencyCode: "USD",
                                value: "100",
                            },
                            quantity: "1",
                            description: "Super Fresh Shirt",
                            sku: "sku01",
                        },
                    ],
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
        if (error instanceof ApiError) {
            throw new Error(error.message);
        }
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

router.post('/orders', async (req, res) => {
    // Extract order details from request body
    const { cart } = req.body;
    try {
        const { jsonResponse, httpStatusCode } = await createOrder(cart);
        res.status(httpStatusCode).json(jsonResponse);
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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