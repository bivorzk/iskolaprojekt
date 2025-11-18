const  mongoose = require('mongoose');
const  mongodb = require('mongodb');

require('dotenv').config();
const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

mongoose.connect(dbUrl + dbName)
    .then(() => console.log('Connected to MongoDB for database queries'))
    .catch(err => console.error('Could not connect to MongoDB for database queries', err));

const db = mongoose.connection;

const User = require('../src/database').User;

// Payment Schema

const PaymentScheme = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    amount: { type: Number, required: true }, // How much was paid
    currency: { type: String, required: true }, // e.g., 'USD', 'HUF'
    paymentMethod: { type: String, required: true }, 
    status: { type: String, required: true, enum: ['Completed', 'Pending', 'Failed'] }, // e.g., 'Completed', 'Pending', 'Failed'
    createdAt: { type: Date, default: Date.now } 
});

// Might expand later depends on features 
// Menu Items Schema

const MenuItemsScheme = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true, enum: [ 'Soup', 'Salad', 'MainDish', 'SideDish', 'Snack', 'Dessert', 'Drink', 'Healthy', 'SpecialDiet', 'DailySpecial', 'Other' ], default: 'Other' },
    available: { type: Boolean, default: true },
    QRCode: { type: String, required: false } // QR code for the menu item

});

// Order Item Schema

const OrderItemsScheme = new mongoose.Schema({
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItems', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    quantity: { type: Number, required: true, default: 1 },
    

});

const OrderScheme = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [OrderItemsScheme],
    orderDate: { type: Date, default: Date.now },
    status: { type: String, required: true, enum: ['Pending', 'InProgress', 'Completed', 'Cancelled'], default: 'Pending' },
    totalAmount: { type: Number, required: true }

});

const LoyaltyProgramScheme = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    points: { type: Number, default: 0 }, // Loyalty points accumulated
    type: { type: String}, // Type of the discount
    discountRate: { type: Number, default: 0 }, // e.g., 0.05 for 5% discount
    validUntil: { type: Date, default: null }, // Expiration date for the loyalty program
    lastUpdated: { type: Date, default: Date.now }
});



const Payment = mongoose.model('Payment', PaymentScheme);
const LoyaltyProgram = mongoose.model('LoyaltyProgram', LoyaltyProgramScheme);
const MenuItems = mongoose.model('MenuItems', MenuItemsScheme);
const Order = mongoose.model('Order', OrderScheme);
const OrderItems = mongoose.model('OrderItems', OrderItemsScheme);

module.exports = {
    Payment,
    LoyaltyProgram,
    MenuItems,
    Order,
    OrderItems
};
