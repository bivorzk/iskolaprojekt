const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Mock adatok
const ordersMock = [
  { id: '1', items: [], total: 10, userId: 'teststudent' }
];
const usersMock = [
  { username: 'teststudent', password: 'hashedpassword', usertype: 'student', isVerified: true }
];

// Mock model
const Order = {
  find: jest.fn(async ({ userId }) => ordersMock.filter(o => o.userId === userId)),
  create: jest.fn(async (data) => ({ id: 'paypal123', ...data }))
};

// Mini Express app
const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

  app.use((req, res, next) => {
    req.session.user = usersMock[0]; // bejelentkezett student
    next();
  });

  app.get('/dashboard/student/order_history', async (req, res) => {
    const orderData = await Order.find({ userId: req.session.user.username });
    res.status(200).json({ orderData });
  });

  app.post('/api/orders', async (req, res) => {
    const order = await Order.create({ ...req.body, userId: req.session.user.username });
    res.status(201).json({ id: order.id });
  });

  return app;
};

describe('Student Dashboard Orders', () => {
  let app;
  beforeAll(() => { app = createApp(); });

  test('GET /dashboard/student/order_history returns orders array', async () => {
    const res = await request(app).get('/dashboard/student/order_history');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('orderData');
    expect(Array.isArray(res.body.orderData)).toBe(true);
  });

  test('POST /orders creates a new PayPal order', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ cart: [{ menuItemId: '1', quantity: 1 }], currency: 'USD', amount: 10 });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
  });
});