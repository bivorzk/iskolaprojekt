    const mongoose = require('mongoose');
    require('dotenv').config();

    const dbUrl = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME;
    const { User } = require('../src/database');

    // Connect to MongoDB
    async function connectDB() {
        try {
            await mongoose.connect(dbUrl + dbName);
            console.log('Connected to MongoDB');
        } catch (err) {
            console.error('Could not connect to MongoDB', err);
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

    // Update all users to include the lastActive field
    async function updateUsersWithLastActive() {
        console.log('\n--- Updating Users with lastActive field ---');
        try {
            // Set lastActive to null for all users (change to Date.now() if you want current timestamp)
            const result = await User.updateMany({}, { $set: { lastActive: null } });
            console.log(`Updated ${result.modifiedCount} users with lastActive field set to null`);
        } catch (err) {
            console.error('Error updating users with lastActive field:', err);
        }
    }

    // Run update if this file is executed directly
    if (require.main === module) {
        (async () => {
            await connectDB();
            await updateUsersWithLastActive();
            await disconnectDB();
        })();
    }

    module.exports = {
        updateUsersWithLastActive
    };





