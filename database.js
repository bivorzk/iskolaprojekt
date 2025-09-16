const mongoose = require('mongoose');
const uri = 'mongodb://localhost:27017/yourDatabaseName'; // replace with your MongoDB connection string

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

const db = mongoose.connection;
// Define collections and schemas
// Users
db.createCollection("users")
/*
Example document:
{
  _id: ObjectId(),
  user_name: "JohnDoe",
  school_name: "MIT",
  email: "john@example.com",
  role: "student",
  egyenleg: 0,
  password_hash: "hashedPass"
}
*/

// Categories
db.createCollection("categories")
/*
Example:
{
  _id: ObjectId(),
  name: "Electronics"
}
*/

// Products
db.createCollection("products")
/*
Example:
{
  _id: ObjectId(),
  product_name: "Laptop",
  price: 1200,
  stock: 10,
  category_id: ObjectId("...") // reference to categories._id
}
*/

// Orders
db.createCollection("orders")
/*
Example:
{
  _id: ObjectId(),
  user_id: ObjectId("..."), // reference to users._id
  date: new Date(),
  price: 2400,
  status: "pending"
}
*/

// Order_Items
db.createCollection("order_items")
/*
Example:
{
  _id: ObjectId(),
  order_id: ObjectId("..."),   // reference to orders._id
  product_id: ObjectId("..."), // reference to products._id
  amount: 2,
  unit_price: 1200
}
*/
