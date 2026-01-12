const { MenuItems, Order, Payment } = require('../../config/database_queries');
const nanoID = require('nanoid');

const createGooglePayOrder = async (userId, cart) => {
    let dbOrderItems = [];
    let totalAmount = 0;
    
    if (Array.isArray(cart) && cart.length > 0) {
        for (const cartItem of cart) {
            const menuItem = await MenuItems.findOne({ name: cartItem.name, available: true });
            if (menuItem) {
                const quantity = cartItem.quantity || 1;
                
                if (menuItem.stock < quantity) {
                    throw new Error(`${menuItem.name} has insufficient stock. Available: ${menuItem.stock}, Requested: ${quantity}`);
                }
                
                dbOrderItems.push({
                    menuItemId: menuItem._id,
                    quantity: quantity
                });
                totalAmount += menuItem.price * quantity;
            }
        }
    }

    if (dbOrderItems.length === 0) {
        throw new Error('No valid items found in cart');
    }

    const publicId = nanoID.nanoid(6);
    
    // Create database order record for Google Pay
    const newOrder = new Order({
        userId: userId,
        items: dbOrderItems,
        orderDate: new Date(),
        status: 'Pending',
        totalAmount: totalAmount,
        paypalOrderId: null, // No PayPal ID for Google Pay orders
        notes: 'Google Pay Order',
        publicID: publicId
    });
    
    await newOrder.save();
    console.log('Database order created for Google Pay:', newOrder._id);
    
    return {
        orderId: newOrder._id.toString(),
        amount: totalAmount.toFixed(2),
        currency: 'USD',
        items: cart
    };
};

const completeGooglePayOrder = async (userId, orderId, paymentMethodData, transactionId) => {
    // Find the order and update it
    const order = await Order.findById(orderId).populate('items.menuItemId');
    
    if (!order) {
        throw new Error('Order not found or already processed');
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
        paymentMethod: 'GooglePay',
        status: 'Completed',
        transactionId: transactionId || 'googlepay_' + Date.now(),
        details: {
            paymentMethodData: paymentMethodData,
            orderId: orderId
        }
    });
    await payment.save();
    
    console.log('Google Pay order completed and payment recorded:', {
        orderId: order._id,
        paymentId: payment._id,
        transactionId: payment.transactionId
    });
    
    return {
        orderId: order._id,
        paymentId: payment._id,
        message: 'Payment completed successfully'
    };
};

module.exports = {
    createGooglePayOrder,
    completeGooglePayOrder
};