const express = require('express');
// Import User model and other database models
const { User } = require('../database');
const { Payment, UserLoyalty, MenuItems, Order, OrderItems } = require('../../config/database_queries');
const { ConvertPoints, getHealthLevel } = require('../LoyaltySystem/loyalty-service');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Client, Environment, OrdersController, PaymentsController, LogLevel, ApiError } = require('@paypal/paypal-server-sdk');
const path = require('path');

// Import cache service for invalidation
let invalidateCache = null;
try {
  const { invalidateCache: invalidate } = require('../dashboard/services/cache-service');
  invalidateCache = invalidate;
} catch (error) {
  console.log('Cache service not available in orders:', error.message);
}

// Import Redis Lua service for atomic operations
const redisLuaService = require('../services/redis-lua-service');

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


router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/Order/index.html'));
});

router.get('/item_information/:itemName', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/information/index.html'));
});


router.get('/menu_items', async (req, res) => {
    try {
        const menuItems = await MenuItems.find({ available: true });
        res.json(menuItems);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});


router.post('/Order', async (req, res) => {
    // Extract order details from request body
    const { cart } = req.body;
    
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ error: 'Cart is required and must contain items' });
    }

    try {
        // Calculate total amount from cart items
        let totalAmount = 0;
        const orderItems = [];
        
        for (const item of cart) {
            const menuItem = await MenuItems.findById(item.menuItemId);
            if (!menuItem) {
                return res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
            }
            if (!menuItem.available || menuItem.stock < item.quantity) {
                return res.status(400).json({ error: `Menu item ${menuItem.name} is not available or insufficient stock` });
            }
            
            const itemTotal = menuItem.price * item.quantity;
            totalAmount += itemTotal;
            
            orderItems.push({
                menuItemId: item.menuItemId,
                quantity: item.quantity
            });
        }

        // Create order in database
        const newOrder = new Order({
            userId: req.session.user ? req.session.user.id : null,
            items: orderItems,
            orderDate: new Date(),
            status: 'Pending',
            totalAmount: totalAmount,
            notes: req.body.notes || ''
        });

        const savedOrder = await newOrder.save();

        // Create PayPal order
        const paypalOrder = await createPayPalOrder(cart, totalAmount);
        
        // Update the order with PayPal order ID
        savedOrder.paypalOrderId = paypalOrder.jsonResponse.id;
        await savedOrder.save();

        // Don't update stock yet - wait for payment completion
        // Stock will be updated when payment is captured

        res.status(201).json({
            success: true,
            orderId: savedOrder._id,
            totalAmount: savedOrder.totalAmount,
            status: savedOrder.status,
            paypalOrderId: paypalOrder.jsonResponse.id,
            paypalApprovalUrl: paypalOrder.jsonResponse.links?.find(link => link.rel === 'approve')?.href,
            message: 'Order created successfully'
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Process order with wallet payment (atomic operation)
router.post('/Order/wallet', async (req, res) => {
    const { cart } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ error: 'Cart is required and must contain items' });
    }

    // Check if user is logged in
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).json({ error: 'User must be logged in to use wallet payment' });
    }

    const userId = req.session.user.id;

    try {
        // Calculate total amount and validate items
        let totalAmount = 0;
        const orderItems = [];
        const inventoryChecks = [];

        for (const item of cart) {
            const menuItem = await MenuItems.findById(item.menuItemId);
            if (!menuItem) {
                return res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
            }
            if (!menuItem.available) {
                return res.status(400).json({ error: `Menu item ${menuItem.name} is not available` });
            }

            const itemTotal = menuItem.price * item.quantity;
            totalAmount += itemTotal;

            orderItems.push({
                menuItemId: item.menuItemId,
                quantity: item.quantity
            });

            inventoryChecks.push({
                inventoryKey: `inventory:item:${item.menuItemId}`,
                quantity: item.quantity,
                price: menuItem.price,
                name: menuItem.name
            });
        }

        // Check wallet balance first
        const walletKey = `wallet:user:${userId}`;
        let currentBalance;

        try {
            currentBalance = await redisLuaService.getWalletBalance(walletKey);
        } catch (redisError) {
            // Fallback to database
            const user = await User.findById(userId).select('balance');
            currentBalance = user ? user.balance || 0 : 0;
        }

        if (currentBalance < totalAmount) {
            return res.status(400).json({
                error: 'Insufficient wallet balance',
                required: totalAmount,
                available: currentBalance
            });
        }

        // Create order record first
        const orderKey = `order:${Date.now()}:${userId}`;
        const newOrder = new Order({
            userId: userId,
            items: orderItems,
            orderDate: new Date(),
            status: 'Pending',
            totalAmount: totalAmount,
            notes: req.body.notes || '',
            publicID: orderKey
        });

        const savedOrder = await newOrder.save();

        // Process payment and inventory atomically using Redis Lua
        try {
            // Prepare arguments for the order processing script
            const inventoryKey = inventoryChecks[0].inventoryKey; // For simplicity, handle first item
            const quantity = inventoryChecks[0].quantity;
            const price = inventoryChecks[0].price;

            const result = await redisLuaService.processOrder(
                inventoryKey,
                walletKey,
                orderKey,
                quantity,
                price,
                userId
            );

            // Update order status to completed
            savedOrder.status = 'Completed';
            savedOrder.pickupTime = new Date();
            await savedOrder.save();

            // Create payment record
            const payment = new Payment({
                userId: userId,
                amount: totalAmount,
                currency: 'USD',
                paymentMethod: 'Wallet',
                status: 'Completed',
                transactionId: `wallet_${Date.now()}`
            });
            await payment.save();

            // Award loyalty points
            try {
                const userLoyalty = await UserLoyalty.findOne({ userId });
                let currentTier = 'NONE';
                if (userLoyalty) {
                    currentTier = userLoyalty.userTier;
                }

                let totalPoints = 0;
                for (const item of order.items) {
                    const menuItem = await MenuItems.findById(item.menuItemId);
                    const healthLevel = getHealthLevel(menuItem.healthScore);
                    const itemTotal = menuItem.price * item.quantity; // Calculate dollar amount for this item
                    const points = ConvertPoints(itemTotal, currentTier, healthLevel, new Date());
                    totalPoints += points;
                }

                await UserLoyalty.updatePointsAtomically(userId, totalPoints, 'wallet_order_completion');

                // Invalidate caches
                if (invalidateCache) {
                    invalidateCache([
                        `student:wallet_balance:${userId}`,
                        `student:transactions:${userId}`,
                        `student:loyalty:${userId}`,
                        `student:order_history:${userId}`
                    ]);
                }
            } catch (loyaltyError) {
                console.error('Error awarding loyalty points:', loyaltyError);
            }

            res.status(201).json({
                success: true,
                orderId: savedOrder._id,
                totalAmount: savedOrder.totalAmount,
                status: savedOrder.status,
                newBalance: result.newBalance,
                newStock: result.newStock,
                message: 'Order processed successfully with wallet payment'
            });

        } catch (luaError) {
            console.error('Lua script execution failed:', luaError);

            // Rollback: Cancel the order
            savedOrder.status = 'Cancelled';
            await savedOrder.save();

            return res.status(500).json({
                error: 'Order processing failed',
                details: luaError.message
            });
        }

    } catch (error) {
        console.error('Error processing wallet order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/:orderID/status', async (req, res) => {
    const { orderID } = req.params;
    const { status, paymentDetails } = req.body;
    
    try {
        // Validate status
        const validStatuses = ['Pending', 'InProgress', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Update order status
        const updatedOrder = await Order.findByIdAndUpdate(
            orderID,
            { 
                status: status,
                ...(status === 'Completed' && { pickupTime: new Date() })
            },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // If payment is completed, save payment record
        if (status === 'Completed' && paymentDetails) {
            const payment = new Payment({
                userId: updatedOrder.userId,
                amount: updatedOrder.totalAmount,
                currency: paymentDetails.currency || 'USD',
                paymentMethod: paymentDetails.method || 'PayPal',
                status: 'Completed',
                transactionId: paymentDetails.transactionId
            });
            await payment.save();
        }

        res.json({
            success: true,
            order: updatedOrder,
            message: `Order status updated to ${status}`
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get order by ID
// Capture PayPal payment and update order
router.post('/:orderID/capture', async (req, res) => {
    const { orderID } = req.params;
    
    try {
        // Find the order in our database by PayPal order ID
        const order = await Order.findOne({ paypalOrderId: orderID }).populate('items.menuItemId');
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Capture the PayPal payment
        const paypalCapture = await capturePayPalOrder(orderID);
        
        if (paypalCapture.httpStatusCode === 201) {
            // Payment successful, update order status
            order.status = 'Completed';
            order.pickupTime = new Date();
            await order.save();

            // Update stock for each menu item now that payment is confirmed
            // Use Redis Lua service for atomic inventory updates
            const inventoryUpdates = [];
            for (const item of order.items) {
              const inventoryKey = `inventory:item:${item.menuItemId._id}`;
              const quantity = item.quantity;

              try {
                // Check if we have enough stock in Redis first
                const currentStock = await redisLuaService.getInventoryStock(inventoryKey);
                if (currentStock < quantity) {
                  throw new Error(`Insufficient stock for ${item.menuItemId.name}`);
                }

                // Atomically decrement stock
                const newStock = currentStock - quantity;

                // Update Redis inventory
                await redisLuaService.updateWalletBalance(inventoryKey, -quantity); // Negative to decrement

                // Update database inventory to match
                await MenuItems.findByIdAndUpdate(
                  item.menuItemId._id,
                  { stock: newStock }
                );

                inventoryUpdates.push({
                  itemId: item.menuItemId._id,
                  name: item.menuItemId.name,
                  oldStock: currentStock,
                  newStock: newStock
                });

              } catch (redisError) {
                console.log(`Redis inventory update failed for ${item.menuItemId.name}, falling back to database:`, redisError.message);

                // Fallback to database update
                await MenuItems.findByIdAndUpdate(
                  item.menuItemId._id,
                  { $inc: { stock: -item.quantity } }
                );

                // Try to sync to Redis
                try {
                  const updatedItem = await MenuItems.findById(item.menuItemId._id);
                  // Note: This is a simplified sync - in production you'd want to set the exact value
                } catch (syncError) {
                  console.log('Failed to sync inventory to Redis:', syncError.message);
                }
              }
            }

            console.log('Inventory updates completed:', inventoryUpdates);

            // Create payment record
            const payment = new Payment({
                userId: order.userId,
                amount: order.totalAmount,
                currency: 'USD',
                paymentMethod: 'PayPal',
                status: 'Completed',
                transactionId: paypalCapture.jsonResponse.id
            });
            await payment.save();

            // Award loyalty points if user is logged in
            if (order.userId) {
                const userLoyalty = await UserLoyalty.findOne({ userId: order.userId });
                let currentTier = 'NONE';
                if (userLoyalty) {
                    currentTier = userLoyalty.userTier;
                }
                
                let totalPoints = 0;
                for (const item of order.items) {
                    const menuItem = item.menuItemId;
                    const healthLevel = getHealthLevel(menuItem.healthScore);
                    const itemTotal = menuItem.price * item.quantity; // Calculate dollar amount for this item
                    const points = ConvertPoints(itemTotal, currentTier, healthLevel, new Date());
                    totalPoints += points;
                }
                
                await UserLoyalty.updatePointsAtomically(order.userId, totalPoints, 'order_completion');
                
                // Invalidate loyalty cache
                if (invalidateCache) {
                    invalidateCache([`student:loyalty:${order.userId}`]);
                }
            }

            // Return the PayPal capture response (frontend expects this format)
            res.json(paypalCapture.jsonResponse);
        } else {
            res.status(paypalCapture.httpStatusCode).json({
                success: false,
                error: 'Payment capture failed',
                details: paypalCapture.jsonResponse
            });
        }

    } catch (error) {
        console.error('Error capturing payment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/:orderID', async (req, res) => {
    const { orderID } = req.params;
    
    try {
        const order = await Order.findById(orderID)
            .populate('userId', 'username email')
            .populate('items.menuItemId', 'name price description');
            
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}); 

router.get('/DailyMenu', async (req, res) => {
    try {
        const menuItems = await MenuItems.find({ available: true });
        res.json(menuItems);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});




module.exports = router;

