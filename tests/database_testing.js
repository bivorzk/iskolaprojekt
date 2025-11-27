const mongodb = require('mongodb');
const mongoose = require('mongoose');
require('dotenv').config();

const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

async function testDatabase() {
    try {
        await mongoose.connect(dbUrl + dbName);
        console.log('Connected to MongoDB for TESTING');

      
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in TESTING database:', collections.map(col => col.name));

        const orders = mongoose.connection.collection('orders');
        const menuItems = mongoose.connection.collection('menuitems');

       
        /*
        const deleteResult = await orders.deleteMany({ publicID: { $ne: null } });
        console.log(`Deleted ${deleteResult.deletedCount} documents from the orders collection.`);
        */

        
        /*
        const updateResult = await menuItems.updateMany({price: {$lt: 500}}, { $set: {price: 1000} });
        console.log(`Updated ${updateResult.modifiedCount} documents in the menuitems collection.`);
        */

        const items = await menuItems.find({}).sort({ price: 1 }).toArray();
//        console.log('Menu Items:', items);

        
        const ItemPrice = await menuItems.aggregate([
            {
                $group: {
                    _id: "$price",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            },
            {
                $project: {
                    price: "$_id",
                    count: 1,
                    _id: 0
                }
            }
        ]).toArray();

        console.log('Item Prices:', ItemPrice);


    } catch (err) {
        console.error('Database operation error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}
    

testDatabase();
