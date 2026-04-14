const { User } = require('../database');
const { MenuItems, Order, Payment, UserLoyalty } = require('../../config/database_queries');
const { ConvertPoints, getHealthLevel } = require('../LoyaltySystem/loyalty-service');
const redisLuaService = require('./redis-lua-service');
const { redisClient } = require('../redis');
const nanoID = require('nanoid');

const validateOrderStock = async (cart) => {
    for (const cartItem of cart) {
        const menuItem = await MenuItems.findOne({ name: cartItem.name, available: true }).lean();
        if (menuItem) {
            const quantity = cartItem.quantity || 1;
            if (menuItem.stock < quantity) {
                throw new Error(`${menuItem.name} has insufficient stock. Available: ${menuItem.stock}, Requested: ${quantity}`);
            }
        }
    }
};

const convertCartToDbFormat = async (cart) => {
    let dbOrderItems = [];
    let totalAmount = 0;
    
    if (Array.isArray(cart) && cart.length > 0) {
        for (const cartItem of cart) {
            const menuItem = await MenuItems.findOne({ name: cartItem.name, available: true }).lean();
            if (menuItem) {
                const quantity = cartItem.quantity || 1;
                
                dbOrderItems.push({
                    menuItemId: menuItem._id,
                    quantity: quantity
                });
                totalAmount += menuItem.price * quantity;
            }
        }
    }
    
    return { dbOrderItems, totalAmount };
};

const convertItemsToDbFormat = async (items, session = null) => {
    let dbOrderItems = [];
    let totalAmount = 0;
    
    if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
            const menuItem = await MenuItems.findById(item._id).session(session);
            if (menuItem) {
                const quantity = item.quantity || 1;
                
                dbOrderItems.push({
                    menuItemId: menuItem._id,
                    quantity: quantity
                });
                totalAmount += menuItem.price * quantity;
                
                // Reduce stock
                menuItem.stock = Math.max(0, menuItem.stock - quantity);
                await menuItem.save({ session });
            }
        }
    }
    
    return { dbOrderItems, totalAmount };
};

const createOrderRecord = async (userId, dbOrderItems, subtotalAmount, discount, totalAmount, paypalOrderId = null, status = 'Pending', paymentMethod = null, transactionId = null, notes = '', session = null) => {
    const publicId = nanoID.nanoid(6);

    const newOrder = new Order({
        userId: userId,
        items: dbOrderItems,
        orderDate: new Date(),
        status: status,
        subtotalAmount: subtotalAmount,
        discount: discount,
        totalAmount: totalAmount,
        paypalOrderId: paypalOrderId,
        paymentMethod: paymentMethod,
        transactionId: transactionId,
        notes: notes,
        publicID: publicId
    });

    await newOrder.save({ session });
    return newOrder;
};

const saveCompletedOrder = async (userId, items, subtotal, discount, total, currency, paymentMethod, transactionId) => {
    const { dbOrderItems, totalAmount } = await convertItemsToDbFormat(items);

    if (dbOrderItems.length === 0) {
        throw new Error('No valid items found in the order');
    }

    const newOrder = await createOrderRecord(
        userId,
        dbOrderItems,
        subtotal,
        discount,
        total,
        null,
        'Completed',
        paymentMethod,
        transactionId
    );

    // Deduct wallet balance for external payment methods
    if (userId && ['GooglePay', 'PayPal'].includes(paymentMethod)) {
        try {
            const totalInUSD = currency === 'HUF' ? total * 0.0027
                             : currency === 'EUR' ? total * 1.1
                             : total;
            const totalInUSDRounded = Math.round(totalInUSD * 100) / 100;

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $inc: { balance: -totalInUSDRounded } },
                { new: true }
            ).lean();

            if (updatedUser) {
                const walletKey = `wallet:user:${userId}`;
                try {
                    await redisLuaService.setWalletBalance(walletKey, updatedUser.balance || 0);
                } catch (syncErr) {
                    console.log('Failed to sync wallet to Redis after order:', syncErr.message);
                }
                if (redisClient?.isOpen) {
                    await redisClient.del(`student:wallet_balance:${userId}`);
                    await redisClient.del(`student:transactions:${userId}`);
                }
            }
        } catch (balanceError) {
            // Payment already captured externally — log but don't fail the order
            console.error(`Failed to deduct wallet balance for ${paymentMethod} order:`, balanceError.message);
        }
    }

    // Calculate and award loyalty points
    let totalPoints = 0;
    try {
        if (userId) {
            const userLoyalty = await UserLoyalty.findOne({ userId }).lean();
            let currentTier = 'NONE';
            if (userLoyalty) {
                currentTier = userLoyalty.userTier;
            }
            
            for (const item of dbOrderItems) {
                const menuItem = await MenuItems.findById(item.menuItemId).lean();
                if (menuItem) {
                    const healthLevel = getHealthLevel(menuItem.healthScore);
                    const itemTotal = menuItem.price * item.quantity; // Calculate dollar amount for this item
                    const points = ConvertPoints(itemTotal, currentTier, healthLevel, new Date());
                    totalPoints += points;
                }
            }
            
            if (totalPoints > 0) {
                await UserLoyalty.updatePointsAtomically(userId, totalPoints, `${paymentMethod}_order_completion`);
            }
        }
    } catch (loyaltyError) {
        console.error('Error calculating/awarding loyalty points:', loyaltyError);
        // Don't fail the order if loyalty points fail
    }
    
    return {
        orderId: newOrder.publicID,
        loyaltyPointsAwarded: totalPoints,
        orderDetails: {
            id: newOrder.publicID,
            total: totalAmount,
            currency: currency,
            paymentMethod: paymentMethod,
            items: dbOrderItems,
            pointsEarned: totalPoints
        }
    };
};

const processBalancePayment = async (payerUserId, orderUserId, items, subtotal, discount, total, currency) => {
    // Round to avoid floating-point drift
    const totalInUSD = Math.round(convertCurrencyToUSD(total, currency) * 100) / 100;

    const session = await User.startSession();
    session.startTransaction();

    try {
        // Get payer user within transaction
        const payer = await User.findById(payerUserId).session(session);
        if (!payer) {
            throw new Error('Payer not found');
        }

        // Check balance (handle both number and string types)
        const currentBalance = parseFloat(payer.balance) || 0;
        if (currentBalance < totalInUSD) {
            throw new Error('Your account balance is insufficient to place this order');
        }

        // Deduct balance from payer account
        payer.balance = currentBalance - totalInUSD;
        await payer.save({ session });
        const updatedBalance = payer.balance;

        // Process items and create order within transaction for the child/student user
        const { dbOrderItems, totalAmount } = await convertItemsToDbFormat(items, session);

        if (dbOrderItems.length === 0) {
            throw new Error('No valid items found in the order');
        }

        // Verify calculated subtotal matches requested subtotal
        if (Math.abs(totalAmount - subtotal) > 0.01) {
            throw new Error('Order subtotal does not match calculated amount');
        }

        const newOrder = await createOrderRecord(
            orderUserId,
            dbOrderItems,
            subtotal,
            discount,
            total,
            null,
            'Completed',
            'Balance',
            'balance_' + Date.now(),
            '',  // notes
            session
        );

        // Commit the transaction
        await session.commitTransaction();

        try {
            await redisLuaService.setWalletBalance(`wallet:user:${userId}`, updatedBalance);
        } catch (syncError) {
            console.log('Failed to sync wallet balance to Redis after balance payment:', syncError.message);
        }

        // Calculate and award loyalty points to the order beneficiary (child/student)
        let totalPoints = 0;
        try {
            if (orderUserId) {
                const userLoyalty = await UserLoyalty.findOne({ userId: orderUserId }).lean();
                let currentTier = 'NONE';
                if (userLoyalty) {
                    currentTier = userLoyalty.userTier;
                }
                
                for (const item of dbOrderItems) {
                    const menuItem = await MenuItems.findById(item.menuItemId).lean();
                    if (menuItem) {
                        const healthLevel = getHealthLevel(menuItem.healthScore);
                        const itemTotal = menuItem.price * item.quantity;
                        const points = ConvertPoints(itemTotal, currentTier, healthLevel, new Date());
                        totalPoints += points;
                    }
                }
                
                if (totalPoints > 0) {
                    await UserLoyalty.updatePointsAtomically(orderUserId, totalPoints, 'balance_order_completion');
                }
            }
        } catch (loyaltyError) {
            console.error('Error calculating/awarding loyalty points for balance payment:', loyaltyError);
            // Don't fail the order if loyalty points fail
        }
        
        return {
            orderId: newOrder.publicID,
            loyaltyPointsAwarded: totalPoints,
            orderDetails: {
                id: newOrder.publicID,
                total: totalAmount,
                currency: currency,
                paymentMethod: 'Balance',
                items: dbOrderItems,
                pointsEarned: totalPoints
            }
        };
    } catch (error) {
        // Abort transaction on any error
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const convertCurrencyToUSD = (amount, currency) => {
    if (currency === 'HUF') {
        return amount * 0.0027; // Approximate HUF to USD rate
    } else if (currency === 'EUR') {
        return amount * 1.1; // Approximate EUR to USD rate
    } else if (currency === 'USD') {
        return amount; // Already in USD
    } else {
        throw new Error('Currency not supported for balance payment');
    }
};

const completePaypalOrder = async (userId, paypalOrderId, paypalResponse) => {
    const order = await Order.findOne({ paypalOrderId: paypalOrderId }).populate('items.menuItemId');
    
    if (!order) {
        console.warn('Order not found for PayPal order ID:', paypalOrderId);
        return;
    }
    
    // Update order status
    order.status = 'Completed';
    order.pickupTime = new Date();
    await order.save();
    
    // Update stock for each menu item
    for (const item of order.items) {
        await MenuItems.findByIdAndUpdate(
            item.menuItemId._id,
            { $inc: { stock: -item.quantity } }
        );
    }
    
    // Create payment record
    const payment = new Payment({
        userId: userId,
        amount: order.totalAmount,
        currency: 'USD',
        paymentMethod: 'PayPal',
        status: 'Completed',
        transactionId: paypalResponse.id
    });
    await payment.save();
    
    console.log('Order completed and payment recorded:', {
        orderId: order._id,
        paymentId: payment._id,
        transactionId: paypalResponse.id
    });
};

module.exports = {
    validateOrderStock,
    convertCartToDbFormat,
    convertItemsToDbFormat,
    createOrderRecord,
    saveCompletedOrder,
    processBalancePayment,
    completePaypalOrder
};