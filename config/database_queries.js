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
    transactionId: { type: String, required: false }, // For external payment refs
    createdAt: { type: Date, default: Date.now } 
});

// Menu Items Schema

const MenuItemsScheme = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    stock: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true },
    category: { type: String, required: true, enum: [ 'Soup', 'Salad', 'MainDish', 'SideDish', 'Snack', 'Dessert', 'Drink', 'Healthy', 'SpecialDiet', 'DailySpecial', 'Other' ], default: 'Other' },
    available: { type: Boolean, default: true },
    QRCode: { type: String, required: false }, // QR code for the menu item
    allergens: { type: [String], default: [] },
    nutritionalInfo: {
        calories: { type: Number, default: 0 },
        protein: { type: Number, default: 0 },
        carbs: { type: Number, default: 0 },
        fat: { type: Number, default: 0 }
    },
    healthScore: { type: Number, default: 0 } // for discounts
});



MenuItemsScheme.pre('save', function(next) {
    if (this.stock <= 0) {
        this.available = false;
    } else {
        this.available = true; 
    }
    next();
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
    totalAmount: { type: Number, required: true },
    pickupTime: { type: Date, required: false },
    notes: { type: String, required: false, default: '' }
});

const UserLoyaltyScheme = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    totalPoints: { type: Number, default: 0 },
    discounts: [{
        type: { type: String, required: true }, // e.g., 'healthy'
        rate: { type: Number, required: true }, // e.g., 0.05
        validUntil: { type: Date, required: false }
    }],
    lastUpdated: { type: Date, default: Date.now }
});

// Review Schema

const ReviewScheme = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItems', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, required: false },
    createdAt: { type: Date, default: Date.now }
});

// Daily Menu Schema

const DailyMenuScheme = new mongoose.Schema({
    date: { type: Date, required: true },
    schoolPeriod: { type: String, required: true, enum: ['morning', 'afternoon'] }, // e.g., 'morning', 'afternoon'
    menuItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItems' }],
    createdAt: { type: Date, default: Date.now }
});

// Parent Child Schema

const ParentChildScheme = new mongoose.Schema({
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});


const Payment = mongoose.model('Payment', PaymentScheme);
const UserLoyalty = mongoose.model('UserLoyalty', UserLoyaltyScheme);
const MenuItems = mongoose.model('MenuItems', MenuItemsScheme);
const Order = mongoose.model('Order', OrderScheme);
const OrderItems = mongoose.model('OrderItems', OrderItemsScheme);
const Review = mongoose.model('Review', ReviewScheme);
const DailyMenu = mongoose.model('DailyMenu', DailyMenuScheme);
const ParentChild = mongoose.model('ParentChild', ParentChildScheme);

module.exports = {
    Payment,
    UserLoyalty,
    MenuItems,
    Order,
    OrderItems,
    Review,
    DailyMenu,
    ParentChild
};
