const  mongoose = require('mongoose');
const  mongodb = require('mongodb');

require('dotenv').config();
const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

mongoose.connect(dbUrl + dbName)
    .then(() => console.log('Connected to MongoDB for database queries'))
    .catch(err => console.error('Could not connect to MongoDB for database queries', err));

const User = require('../src/database').User;
const { DISCOUNT_RATES, DISCOUNT_TYPES, TIERS } = require('./DATABASE_CONSTANTS.JS');

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
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
    quantity: { type: Number, required: true, default: 1 },
});

const OrderScheme = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [OrderItemsScheme],
    orderDate: { type: Date, default: Date.now },
    status: { type: String, required: true, enum: ['Pending', 'InProgress', 'Completed', 'Cancelled'], default: 'Pending' },
    totalAmount: { type: Number, required: true },
    pickupTime: { type: Date, required: false },
    notes: { type: String, required: false, default: '' },
    paypalOrderId: { type: String, required: false },
    paymentMethod: { type: String, required: false },
    transactionId: { type: String, required: false },
    publicID: { type: String, required: true, unique: true}
});

OrderScheme.pre('save', function(next) {
    if (this.orderDate.getTime() + 15 * 60000 < Date.now() && this.status === 'Pending') {
        this.status = 'Cancelled';
    }
    next();
});



const UserLoyaltyScheme = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    totalPoints: { type: Number, default: 0 }, // Total accumulated points
    userTier : { type: String, enum: [TIERS.NONE, TIERS.BRONZE, TIERS.SILVER, TIERS.GOLD, TIERS.PLATINUM], default: TIERS.NONE },
    discounts: [{
        type: { type: String, enum: Object.values(DISCOUNT_TYPES), required: true }, // e.g., DISCOUNT_TYPES.HEALTHY
        rate: { type: Number, enum: Object.values(DISCOUNT_RATES), required: true }, // e.g., DISCOUNT_RATES.FIVE
        validUntil: { type: Date, required: false }
    }],
    lastUpdated: { type: Date, default: Date.now },
    lastDecay: { type: Date, default: Date.now },
    pointHistory: [{ date: { type: Date, default: Date.now }, amount: Number, reason: String }], // For logging
    milestonesAchieved: [{ type: String }] // e.g., 'BRONZE_FIRST', 'SILVER_FIRST'
    
});

UserLoyaltyScheme.pre('save', function(next) {
    const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000;
    const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Enhanced decay: Skip if recently active, tier-based rate
    if (now - this.lastUpdated.getTime() < NINETY_DAYS) return next();
    if (now - this.lastDecay.getTime() > SIX_MONTHS) {
        const decayRate = this.userTier === TIERS.PLATINUM ? 0.3 : 0.5;
        this.totalPoints = Math.max(0, Math.floor(this.totalPoints * (1 - decayRate)));
        this.lastDecay = new Date();
        // Log decay in history
        this.pointHistory.push({ amount: -Math.floor(this.totalPoints * decayRate), reason: 'decay' });
    }

    // Tier determination with downgrade support
    const oldTier = this.userTier;
    if (this.totalPoints >= 40000) this.userTier = TIERS.PLATINUM;
    else if (this.totalPoints >= 15000) this.userTier = TIERS.GOLD;
    else if (this.totalPoints >= 5000) this.userTier = TIERS.SILVER;
    else if (this.totalPoints >= 1200) this.userTier = TIERS.BRONZE;
    else this.userTier = TIERS.NONE;

    if (oldTier !== this.userTier) {
        const newDiscounts = [];
        switch (this.userTier) {
            case TIERS.BRONZE:
                newDiscounts.push({ type: DISCOUNT_TYPES.HEALTHY, rate: DISCOUNT_RATES.FIVE });
                break;
            case TIERS.SILVER:
                newDiscounts.push({ type: DISCOUNT_TYPES.HEALTHY, rate: DISCOUNT_RATES.TEN });
                newDiscounts.push({ type: DISCOUNT_TYPES.DRINK, rate: DISCOUNT_RATES.FIVE, validUntil: new Date(now + NINETY_DAYS) });
                break;
            case TIERS.GOLD:
                newDiscounts.push({ type: DISCOUNT_TYPES.HEALTHY, rate: DISCOUNT_RATES.FIFTEEN });
                newDiscounts.push({ type: DISCOUNT_TYPES.FULL_MEAL, rate: DISCOUNT_RATES.TEN });
                break;
            case TIERS.PLATINUM:
                newDiscounts.push({ type: DISCOUNT_TYPES.HEALTHY, rate: DISCOUNT_RATES.TWENTY });
                newDiscounts.push({ type: DISCOUNT_TYPES.GENERAL, rate: DISCOUNT_RATES.FIFTEEN });
                break;
        }
        this.discounts = newDiscounts;
        if (!this.milestonesAchieved.includes(`${this.userTier}_FIRST`)) {
            this.milestonesAchieved.push(`${this.userTier}_FIRST`);
        }
    }

    if (this.isModified('totalPoints')) {
        this.lastUpdated = new Date();
    }

    next();
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

// Parent Student Schema

const ParentStudentScheme = new mongoose.Schema({
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});


// might expand 

const SecurityLogsScheme = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    action: { type: String, required: true }, // e.g., 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'PASSWORD_RESET'
    type: { type: String, required: true }, // e.g., 'INFO', 'WARNING', 'ERROR'
    ipAddress: { type: String, required: false },
    Timestamp: { type: Date, default: Date.now },
    details: { type: String, required: false }, // Additional info if needed
    country: { type: String, required: false },
    CountryCode: { type: String, required: false },
    currency: { type: String, required: false },
    Continent: { type: String, required: false },
    IsVPN: { type: Boolean, required: false },
    isTor: { type: Boolean, required: false },
    isProxy: { type: Boolean, required: false },
});


const Payment = mongoose.model('Payment', PaymentScheme);
const UserLoyalty = mongoose.model('UserLoyalty', UserLoyaltyScheme);
const MenuItems = mongoose.model('MenuItems', MenuItemsScheme);
const Order = mongoose.model('Order', OrderScheme);
const OrderItems = mongoose.model('OrderItems', OrderItemsScheme);
const Review = mongoose.model('Review', ReviewScheme);
const DailyMenu = mongoose.model('DailyMenu', DailyMenuScheme);
const ParentStudent = mongoose.model('ParentStudent', ParentStudentScheme);
const SecurityLogs = mongoose.model('SecurityLogs', SecurityLogsScheme);



module.exports = {
    Payment,
    UserLoyalty,
    MenuItems,
    Order,
    OrderItems,
    Review,
    DailyMenu,
    ParentStudent,
    SecurityLogs
};
