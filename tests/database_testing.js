const mongodb = require('mongodb');
const mongoose = require('mongoose');
require('dotenv').config();

const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

// Import models from database_queries.js
const {
    Payment,
    UserLoyalty,
    MenuItems,
    Order,
    OrderItems,
    Review,
    DailyMenu,
    ParentStudent,
    SecurityLogs
} = require('../config/database_queries');

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(dbUrl + dbName);
        console.log('Connected to MongoDB for testing');
    } catch (err) {
        console.error('Could not connect to MongoDB for testing', err);
        process.exit(1);
    }
}

// Disconnect from MongoDB
async function disconnectDB() {
    try {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (err) {
        console.error('Error disconnecting from MongoDB', err);
    }
}

// Test MenuItems model
async function testMenuItems() {
    console.log('\n--- Testing MenuItems ---');

    // Create a test menu item
    const testItem = new MenuItems({
        name: 'Test Soup',
        description: 'A delicious test soup',
        stock: 10,
        price: 5.99,
        category: 'Soup',
        available: true,
        allergens: ['nuts'],
        nutritionalInfo: {
            calories: 200,
            protein: 10,
            carbs: 20,
            fat: 5
        },
        healthScore: 8
    });

    try {
        const start = process.hrtime.bigint();
        const savedItem = await testItem.save();
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1e6;
        console.log(`Menu item created in ${duration.toFixed(3)} ms:`, savedItem._id);

        // Query the item
        const start2 = process.hrtime.bigint();
        const foundItem = await MenuItems.findById(savedItem._id);
        const end2 = process.hrtime.bigint();
        const duration2 = Number(end2 - start2) / 1e6;
        console.log(`Menu item found in ${duration2.toFixed(3)} ms:`, foundItem.name);

        // Update the item
        const start3 = process.hrtime.bigint();
        await MenuItems.findByIdAndUpdate(savedItem._id, { stock: 5 });
        const end3 = process.hrtime.bigint();
        const duration3 = Number(end3 - start3) / 1e6;
        console.log(`Menu item updated in ${duration3.toFixed(3)} ms`);

        // Delete the item
        const start4 = process.hrtime.bigint();
        await MenuItems.findByIdAndDelete(savedItem._id);
        const end4 = process.hrtime.bigint();
        const duration4 = Number(end4 - start4) / 1e6;
        console.log(`Menu item deleted in ${duration4.toFixed(3)} ms`);

    } catch (err) {
        console.error('Error testing MenuItems:', err);
    }
}

// Test UserLoyalty model
async function testUserLoyalty() {
    console.log('\n--- Testing UserLoyalty ---');

    const testUserId = new mongoose.Types.ObjectId();

    try {
        // Test atomic point update
        const start = process.hrtime.bigint();
        const result = await UserLoyalty.updatePointsAtomically(testUserId, 100, 'test purchase');
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1e6;
        console.log(`User loyalty updated in ${duration.toFixed(3)} ms:`, result.totalPoints, result.userTier);

        // Query the loyalty record
        const start2 = process.hrtime.bigint();
        const loyalty = await UserLoyalty.findOne({ userId: testUserId });
        const end2 = process.hrtime.bigint();
        const duration2 = Number(end2 - start2) / 1e6;
        console.log(`Loyalty record found in ${duration2.toFixed(3)} ms:`, loyalty.totalPoints);

        // Delete the test record
        const start3 = process.hrtime.bigint();
        await UserLoyalty.findOneAndDelete({ userId: testUserId });
        const end3 = process.hrtime.bigint();
        const duration3 = Number(end3 - start3) / 1e6;
        console.log(`Loyalty record deleted in ${duration3.toFixed(3)} ms`);

    } catch (err) {
        console.error('Error testing UserLoyalty:', err);
    }
}

// Test Order model
async function testOrder() {
    console.log('\n--- Testing Order ---');

    const testUserId = new mongoose.Types.ObjectId();
    const testMenuItemId = new mongoose.Types.ObjectId();

    const testOrder = new Order({
        userId: testUserId,
        items: [{
            menuItemId: testMenuItemId,
            quantity: 2
        }],
        totalAmount: 11.98,
        publicID: 'test-order-123'
    });

    try {
        const start = process.hrtime.bigint();
        const savedOrder = await testOrder.save();
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1e6;
        console.log(`Order created in ${duration.toFixed(3)} ms:`, savedOrder._id);

        // Query the order
        const start2 = process.hrtime.bigint();
        const foundOrder = await Order.findById(savedOrder._id);
        const end2 = process.hrtime.bigint();
        const duration2 = Number(end2 - start2) / 1e6;
        console.log(`Order found in ${duration2.toFixed(3)} ms:`, foundOrder.status);

        // Update order status
        const start3 = process.hrtime.bigint();
        await Order.findByIdAndUpdate(savedOrder._id, { status: 'Completed' });
        const end3 = process.hrtime.bigint();
        const duration3 = Number(end3 - start3) / 1e6;
        console.log(`Order updated in ${duration3.toFixed(3)} ms`);

        // Delete the order
        const start4 = process.hrtime.bigint();
        await Order.findByIdAndDelete(savedOrder._id);
        const end4 = process.hrtime.bigint();
        const duration4 = Number(end4 - start4) / 1e6;
        console.log(`Order deleted in ${duration4.toFixed(3)} ms`);

    } catch (err) {
        console.error('Error testing Order:', err);
    }
}

// Test Payment model
async function testPayment() {
    console.log('\n--- Testing Payment ---');

    const testUserId = new mongoose.Types.ObjectId();

    const testPayment = new Payment({
        userId: testUserId,
        amount: 25.00,
        currency: 'USD',
        paymentMethod: 'paypal',
        status: 'Completed',
        transactionId: 'test-trans-123'
    });

    try {
        const start = process.hrtime.bigint();
        const savedPayment = await testPayment.save();
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1e6;
        console.log(`Payment created in ${duration.toFixed(3)} ms:`, savedPayment._id);

        // Query payments by user
        const start2 = process.hrtime.bigint();
        const payments = await Payment.find({ userId: testUserId });
        const end2 = process.hrtime.bigint();
        const duration2 = Number(end2 - start2) / 1e6;
        console.log(`Payments found in ${duration2.toFixed(3)} ms:`, payments.length);

        // Delete the payment
        const start3 = process.hrtime.bigint();
        await Payment.findByIdAndDelete(savedPayment._id);
        const end3 = process.hrtime.bigint();
        const duration3 = Number(end3 - start3) / 1e6;
        console.log(`Payment deleted in ${duration3.toFixed(3)} ms`);

    } catch (err) {
        console.error('Error testing Payment:', err);
    }
}

// Test Review model
async function testReview() {
    console.log('\n--- Testing Review ---');

    const testUserId = new mongoose.Types.ObjectId();
    const testMenuItemId = new mongoose.Types.ObjectId();

    const testReview = new Review({
        userId: testUserId,
        menuItemId: testMenuItemId,
        rating: 5,
        comment: 'Excellent food!'
    });

    try {
        const start = process.hrtime.bigint();
        const savedReview = await testReview.save();
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1e6;
        console.log(`Review created in ${duration.toFixed(3)} ms:`, savedReview._id);

        // Query reviews for menu item
        const start2 = process.hrtime.bigint();
        const reviews = await Review.find({ menuItemId: testMenuItemId });
        const end2 = process.hrtime.bigint();
        const duration2 = Number(end2 - start2) / 1e6;
        console.log(`Reviews found in ${duration2.toFixed(3)} ms:`, reviews.length);

        // Delete the review
        const start3 = process.hrtime.bigint();
        await Review.findByIdAndDelete(savedReview._id);
        const end3 = process.hrtime.bigint();
        const duration3 = Number(end3 - start3) / 1e6;
        console.log(`Review deleted in ${duration3.toFixed(3)} ms`);

    } catch (err) {
        console.error('Error testing Review:', err);
    }
}

// Test SecurityLogs model
async function testSecurityLogs() {
    console.log('\n--- Testing SecurityLogs ---');

    const testUserId = new mongoose.Types.ObjectId();

    const testSecurityLog = new SecurityLogs({
        userId: testUserId,
        action: 'LOGIN_SUCCESS',
        type: 'INFO',
        ipAddress: '192.168.1.1',
        details: 'User logged in successfully',
        country: 'Hungary',
        CountryCode: 'HU',
        currency: 'HUF',
        Continent: 'Europe',
        IsVPN: false,
        isTor: false,
        isProxy: false
    });

    try {
        const start = process.hrtime.bigint();
        const savedLog = await testSecurityLog.save();
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1e6;
        console.log(`Security log created in ${duration.toFixed(3)} ms:`, savedLog._id);

        // Query security logs by user
        const start2 = process.hrtime.bigint();
        const logs = await SecurityLogs.find({ userId: testUserId });
        const end2 = process.hrtime.bigint();
        const duration2 = Number(end2 - start2) / 1e6;
        console.log(`Security logs found in ${duration2.toFixed(3)} ms:`, logs.length);

        // Query security logs by action
        const start3 = process.hrtime.bigint();
        const actionLogs = await SecurityLogs.find({ action: 'LOGIN_SUCCESS' });
        const end3 = process.hrtime.bigint();
        const duration3 = Number(end3 - start3) / 1e6;
        console.log(`Security logs by action found in ${duration3.toFixed(3)} ms:`, actionLogs.length);

        // Delete the security log
        const start4 = process.hrtime.bigint();
        await SecurityLogs.findByIdAndDelete(savedLog._id);
        const end4 = process.hrtime.bigint();
        const duration4 = Number(end4 - start4) / 1e6;
        console.log(`Security log deleted in ${duration4.toFixed(3)} ms`);

    } catch (err) {
        console.error('Error testing SecurityLogs:', err);
    }
}

// Main test runner
async function runTests() {
    await connectDB();

    try {
        await testMenuItems();
        await testUserLoyalty();
        await testOrder();
        await testPayment();
        await testReview();
        await testSecurityLogs();

        console.log('\n--- All tests completed ---');
    } catch (err) {
        console.error('Test runner error:', err);
    } finally {
        await disconnectDB();
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = {
    runTests,
    testMenuItems,
    testUserLoyalty,
    testOrder,
    testPayment,
    testReview,
    testSecurityLogs
};





