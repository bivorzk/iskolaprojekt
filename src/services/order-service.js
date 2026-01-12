const { User } = require('../database');
const { MenuItems, Order, Payment } = require('../../config/database_queries');
const nanoID = require('nanoid');

const validateOrderStock = async (cart) => {
    for (const cartItem of cart) {
        const menuItem = await MenuItems.findOne({ name: cartItem.name, available: true });
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
            const menuItem = await MenuItems.findOne({ name: cartItem.name, available: true });
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

const convertItemsToDbFormat = async (items) => {
    let dbOrderItems = [];
    let totalAmount = 0;
    
    if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
            const menuItem = await MenuItems.findById(item._id);
            if (menuItem) {
                const quantity = item.quantity || 1;
                
                dbOrderItems.push({
                    menuItemId: menuItem._id,
                    quantity: quantity
                });
                totalAmount += menuItem.price * quantity;
                
                // Reduce stock
                menuItem.stock = Math.max(0, menuItem.stock - quantity);
                await menuItem.save();
            }
        }
    }
    
    return { dbOrderItems, totalAmount };
};

const createOrderRecord = async (userId, dbOrderItems, totalAmount, paypalOrderId = null, status = 'Pending', paymentMethod = null, transactionId = null, notes = '') => {
    const publicId = nanoID.nanoid(6);
    
    const newOrder = new Order({
        userId: userId,
        items: dbOrderItems,
        orderDate: new Date(),
        status: status,
        totalAmount: totalAmount,
        paypalOrderId: paypalOrderId,
        paymentMethod: paymentMethod,
        transactionId: transactionId,
        notes: notes,
        publicID: publicId
    });
    
    await newOrder.save();
    return newOrder;
};

const saveCompletedOrder = async (userId, items, total, currency, paymentMethod, transactionId) => {
    const { dbOrderItems, totalAmount } = await convertItemsToDbFormat(items);
    
    if (dbOrderItems.length === 0) {
        throw new Error('No valid items found in the order');
    }
    
    const newOrder = await createOrderRecord(
        userId, 
        dbOrderItems, 
        totalAmount, 
        null, 
        'Completed', 
        paymentMethod, 
        transactionId
    );
    
    return {
        orderId: newOrder.publicID,
        orderDetails: {
            id: newOrder.publicID,
            total: totalAmount,
            currency: currency,
            paymentMethod: paymentMethod,
            items: dbOrderItems
        }
    };
};

const processBalancePayment = async (userId, items, total, currency) => {
    // Get user and check balance
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    
    // Convert total to USD for balance check
    let totalInUSD = convertCurrencyToUSD(total, currency);
    
    if (user.balance < totalInUSD) {
        throw new Error('Your account balance is insufficient to place this order');
    }
    
    const { dbOrderItems, totalAmount } = await convertItemsToDbFormat(items);
    
    if (dbOrderItems.length === 0) {
        throw new Error('No valid items found in the order');
    }
    
    // Verify calculated total matches requested total
    if (Math.abs(totalAmount - total) > 0.01) {
        throw new Error('Order total does not match calculated amount');
    }
    
    const newOrder = await createOrderRecord(
        userId,
        dbOrderItems,
        totalAmount,
        null,
        'Completed',
        'Balance',
        'balance_' + Date.now()
    );
    
    // Deduct balance (in USD)
    user.balance -= totalInUSD;
    await user.save();
    
    return {
        orderId: newOrder.publicID,
        orderDetails: {
            id: newOrder.publicID,
            total: totalAmount,
            currency: currency,
            paymentMethod: 'Balance',
            items: dbOrderItems
        }
    };
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