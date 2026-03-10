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
const { db } = require('../src/models/User');

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

PaymentScheme.index({ userId: 1 });
PaymentScheme.index({ status: 1 });
PaymentScheme.index({ paymentMethod: 1, currency: 1 });
PaymentScheme.index({ userId: 1, createdAt: -1 });

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
    healthScore: { type: Number, default: 0 }, // for discounts
    reviews: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: true, maxlength: 500 },
        date: { type: Date, default: Date.now },
        ipAddress: { type: String, required: false },
        reported: { type: Boolean, default: false },
        moderated: { type: Boolean, default: false },
        moderatorNotes: { type: String, required: false }
    }],
    averageRating: { type: Number, default: 0 }
});



MenuItemsScheme.pre('save', function(next) {
    if (this.stock <= 0) {
        this.available = false;
    } else {
        this.available = true;
    }
    next();
});

MenuItemsScheme.index({ available: 1 });
MenuItemsScheme.index({ stock: 1 });
MenuItemsScheme.index({ category: 1 });
MenuItemsScheme.index({ category: 1, available: 1 }); // compound: covers {category, available} queries
MenuItemsScheme.index({ name: 1, available: 1 });

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
    subtotalAmount: { type: Number, required: true },
    discount: {
        type: { type: String, enum: Object.values(DISCOUNT_TYPES), required: false },
        rate: { type: Number, enum: Object.values(DISCOUNT_RATES), required: false },
        amount: { type: Number, required: false }
    },
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



OrderScheme.index({ userId: 1 });
OrderScheme.index({ status: 1 });
OrderScheme.index({ orderDate: 1 });
OrderScheme.index({ paypalOrderId: 1 });

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
    milestonesAchieved: [{ type: String }], // e.g., 'BRONZE_FIRST', 'SILVER_FIRST'
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastOrderDate: { type: Date },
    healthyItemsThisWeek: { type: Number, default: 0 },
    weekStartDate: { type: Date },
    monthlyPerksIssuedAt: { type: Date }
});

// Add a static method for atomic point updates
UserLoyaltyScheme.statics.updatePointsAtomically = async function(userId, pointsToAdd, reason) {
    const now = new Date();
    const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000;
    const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

    // Use MongoDB transactions for true atomicity
    const session = await mongoose.startSession();
    
    try {
        let result;
        
        await session.withTransaction(async () => {
            // Find and lock the document, or create if it doesn't exist
            let current = await this.findOne({ userId }).session(session);
            
            if (!current) {
                // Create new loyalty record for user
                current = new this({
                    userId: userId,
                    totalPoints: 0,
                    userTier: TIERS.NONE,
                    discounts: [],
                    lastUpdated: now,
                    lastDecay: now,
                    pointHistory: [],
                    milestonesAchieved: []
                });
                await current.save({ session });
                console.log(`Created new loyalty record for user: ${userId}`);
            }

            // Calculate points after potential decay (apply decay to current points, not new total)
            let pointsAfterDecay = current.totalPoints;
            let decayAmount = 0;
            let shouldUpdateDecay = false;

            // Check if decay should be applied
            if (now - current.lastUpdated.getTime() >= NINETY_DAYS && 
                now - current.lastDecay.getTime() > SIX_MONTHS) {
                const decayRate = current.userTier === TIERS.PLATINUM ? 0.3 : 0.5;
                decayAmount = Math.floor(current.totalPoints * decayRate);
                pointsAfterDecay = Math.max(0, current.totalPoints - decayAmount);
                shouldUpdateDecay = true;
            }

            // Calculate final points (decay first, then add new points)
            const finalPoints = pointsAfterDecay + pointsToAdd;

            // Determine new tier based on final points
            let newTier = TIERS.NONE;
            if (finalPoints >= 40000) newTier = TIERS.PLATINUM;
            else if (finalPoints >= 15000) newTier = TIERS.GOLD;
            else if (finalPoints >= 5000) newTier = TIERS.SILVER;
            else if (finalPoints >= 1200) newTier = TIERS.BRONZE;

            // Prepare point history entries
            const historyEntries = [];
            
            // Add decay entry if applicable
            if (shouldUpdateDecay && decayAmount > 0) {
                historyEntries.push({
                    date: now,
                    amount: -decayAmount,
                    reason: 'decay'
                });
            }
            
            // Add the new points entry
            historyEntries.push({
                date: now,
                amount: pointsToAdd,
                reason
            });

            // Prepare update operations
            const updateOps = {
                $set: {
                    totalPoints: finalPoints,
                    userTier: newTier,
                    lastUpdated: now
                },
                $push: {
                    pointHistory: { $each: historyEntries }
                }
            };

            // Update decay timestamp if needed
            if (shouldUpdateDecay) {
                updateOps.$set.lastDecay = now;
            }

            // Handle tier changes and discounts
            if (newTier !== current.userTier) {
                const discounts = [];
                switch (newTier) {
                    case TIERS.BRONZE:
                        discounts.push({ type: DISCOUNT_TYPES.HEALTHY, rate: DISCOUNT_RATES.FIVE });
                        break;
                    case TIERS.SILVER:
                        discounts.push({ type: DISCOUNT_TYPES.HEALTHY, rate: DISCOUNT_RATES.TEN });
                        discounts.push({ 
                            type: DISCOUNT_TYPES.DRINK, 
                            rate: DISCOUNT_RATES.FIVE, 
                            validUntil: new Date(now.getTime() + NINETY_DAYS) 
                        });
                        break;
                    case TIERS.GOLD:
                        discounts.push({ type: DISCOUNT_TYPES.HEALTHY, rate: DISCOUNT_RATES.FIFTEEN });
                        discounts.push({ type: DISCOUNT_TYPES.FULL_MEAL, rate: DISCOUNT_RATES.TEN });
                        break;
                    case TIERS.PLATINUM:
                        discounts.push({ type: DISCOUNT_TYPES.HEALTHY, rate: DISCOUNT_RATES.TWENTY });
                        discounts.push({ type: DISCOUNT_TYPES.GENERAL, rate: DISCOUNT_RATES.FIFTEEN });
                        break;
                }
                
                updateOps.$set.discounts = discounts;

                // Add first-time tier achievement milestone
                const milestoneKey = `${newTier}_FIRST`;
                if (!current.milestonesAchieved.includes(milestoneKey)) {
                    updateOps.$addToSet = { milestonesAchieved: milestoneKey };
                }
            }

            // Perform the atomic update
            result = await this.findOneAndUpdate(
                { userId }, 
                updateOps, 
                { new: true, session }
            );
        });

        return result;
        
    } catch (error) {
        // Handle errors without trying to stringify potentially circular objects
        let errorMsg = 'Unknown error';
        try {
            errorMsg = String(error.message || error);
        } catch (e) {
            errorMsg = 'Error with circular references';
        }
        console.error('Error in updatePointsAtomically:', errorMsg);
        throw new Error('Failed to update points atomically');
    } finally {
        try {
            await session.endSession();
        } catch (sessionError) {
            console.warn('Error ending session:', sessionError.message);
        }
    }
};




// Daily Menu Schema

const DailyMenuScheme = new mongoose.Schema({
    date: { type: Date, required: true },
    schoolPeriod: { type: String, required: true, enum: ['morning', 'afternoon'] }, // e.g., 'morning', 'afternoon'
    menuItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItems' }],
    createdAt: { type: Date, default: Date.now }
});

DailyMenuScheme.index({ date: 1 });

DailyMenuScheme.index({ schoolPeriod: 1 });

DailyMenuScheme.index({ date: 1, schoolPeriod: 1 }); 

// Money Request Schema (for student money requests to parents)
const MoneyRequestScheme = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    reason: { type: String, required: false, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    processedAt: { type: Date, required: false },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }
});

MoneyRequestScheme.index({ studentId: 1 });
MoneyRequestScheme.index({ parentId: 1 });
MoneyRequestScheme.index({ status: 1 });
MoneyRequestScheme.index({ createdAt: -1 });


// Parent Student Schema

const ParentStudentScheme = new mongoose.Schema({
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    deniedAt: { type: Date }
});
ParentStudentScheme.index({ parentId: 1 });
ParentStudentScheme.index({ studentId: 1 });
ParentStudentScheme.index({ parentId: 1, studentId: 1 }); 


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
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false }
});
SecurityLogsScheme.index({ userId: 1 });
SecurityLogsScheme.index({ action: 1 });
SecurityLogsScheme.index({ Timestamp: -1 });
SecurityLogsScheme.index({ userId: 1, Timestamp: -1 }); 


// Reward catalog schema
const RewardSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    category: {
        type: String,
        enum: ['drink', 'fruit', 'dessert', 'meal', 'upgrade', 'mystery', 'token'],
        required: true
    },
    pointCost: { type: Number, required: true },
    marketValue: { type: Number, required: true },
    healthScore: { type: Number, default: 0 },
    availableFrom: { type: Date },
    availableUntil: { type: Date },
    dailyStockLimit: { type: Number, default: null },
    redeemedToday: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    minTier: {
        type: String,
        enum: ['none', 'Bronze', 'Silver', 'Gold', 'Platinum'],
        default: 'none'
    }
}, { timestamps: true });

RewardSchema.index({ isActive: 1, category: 1 });

// Redemption (voucher) schema
const RedemptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rewardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reward', required: true },
    pointsSpent: { type: Number, required: true },
    redemptionType: {
        type: String,
        enum: ['shop', 'cart_discount', 'tier_perk', 'streak_bonus'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'fulfilled', 'expired', 'cancelled'],
        default: 'pending'
    },
    voucherCode: { type: String, unique: true, sparse: true },
    voucherExpiresAt: { type: Date },
    fulfilledAt: { type: Date },
    fulfilledBy: { type: String },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    ipAddress: { type: String }
}, { timestamps: true });

RedemptionSchema.index({ userId: 1, createdAt: -1 }); // voucherCode index created by unique:true on the field

const Payment = mongoose.model('Payment', PaymentScheme);
const UserLoyalty = mongoose.model('UserLoyalty', UserLoyaltyScheme);
const MenuItems = mongoose.model('MenuItems', MenuItemsScheme);
const Order = mongoose.model('Order', OrderScheme);
const OrderItems = mongoose.model('OrderItems', OrderItemsScheme);
const DailyMenu = mongoose.model('DailyMenu', DailyMenuScheme);
const ParentStudent = mongoose.model('ParentStudent', ParentStudentScheme);
const SecurityLogs = mongoose.model('SecurityLogs', SecurityLogsScheme);
const Reward = mongoose.model('Reward', RewardSchema);
const Redemption = mongoose.model('Redemption', RedemptionSchema);




// mongoose.set('debug', function (collectionName, method, query, doc) {
//     console.log(`Mongoose: ${collectionName}.${method}(${JSON.stringify(query)}, ${JSON.stringify(doc)})`);
// });


module.exports = {
    Payment,
    UserLoyalty,
    MenuItems,
    Order,
    OrderItems,
    DailyMenu,
    ParentStudent,
    SecurityLogs,
    Reward,
    Redemption
};
