const mongoose = require('mongoose');
require('dotenv').config();

const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

// Import SecurityLogs model
const { SecurityLogs } = require('./config/database_queries');

async function queryAllSecurityLogs() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(dbUrl + dbName);
        console.log('Connected to MongoDB');

        console.log('\n--- Querying all SecurityLogs data ---');

        // Measure time to query all security logs
        const start = process.hrtime.bigint();
        const allLogs = await SecurityLogs.find({}).sort({ Timestamp: -1 });
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1e6;

        console.log(`Found ${allLogs.length} security logs in ${duration.toFixed(3)} ms`);

        if (allLogs.length > 0) {
            console.log('\nFirst 5 logs:');
            allLogs.slice(0, 5).forEach((log, index) => {
                console.log(`${index + 1}. ${log.Timestamp.toISOString()} - ${log.action} - ${log.type} - ${log.details || 'No details'}`);
            });

            if (allLogs.length > 5) {
                console.log(`... and ${allLogs.length - 5} more logs`);
            }
        }

        // Also test count query
        const countStart = process.hrtime.bigint();
        const totalCount = await SecurityLogs.countDocuments({});
        const countEnd = process.hrtime.bigint();
        const countDuration = Number(countEnd - countStart) / 1e6;

        console.log(`\nCount query: ${totalCount} total logs in ${countDuration.toFixed(3)} ms`);

        // Test query by action type
        const actionStart = process.hrtime.bigint();
        const loginLogs = await SecurityLogs.find({ action: 'LOGIN_SUCCESS' });
        const actionEnd = process.hrtime.bigint();
        const actionDuration = Number(actionEnd - actionStart) / 1e6;

        console.log(`LOGIN_SUCCESS logs: ${loginLogs.length} in ${actionDuration.toFixed(3)} ms`);

        // Test query by user
        const userLogs = await SecurityLogs.find({}).limit(1);
        if (userLogs.length > 0 && userLogs[0].userId) {
            const userStart = process.hrtime.bigint();
            const userSpecificLogs = await SecurityLogs.find({ userId: userLogs[0].userId });
            const userEnd = process.hrtime.bigint();
            const userDuration = Number(userEnd - userStart) / 1e6;

            console.log(`Logs for specific user: ${userSpecificLogs.length} in ${userDuration.toFixed(3)} ms`);
        }

    } catch (error) {
        console.error('Error querying security logs:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

queryAllSecurityLogs();