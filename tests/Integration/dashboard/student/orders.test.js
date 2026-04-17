const request = require('supertest');
const express = require('express');
const session = require('express-session');

const ordersMock = [
  { id: '1', items: [], total: 10, userId: 'teststudent' }
];
const usersMock = [
  { username: 'teststudent', password: 'hashedpassword', usertype: 'student', isVerified: true }
];

const Order = {
  find: jest.fn(async ({ userId }) => ordersMock.filter(o => o.userId === userId)),
  create: jest.fn(async (data) => ({ id: `order_${Date.now()}`, ...data }))
};

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

  app.use((req, res, next) => {
    req.session.user = usersMock[0]; 
    next();
  });

  app.get('/dashboard/student/order_history', async (req, res) => {
    const orderData = await Order.find({ userId: req.session.user.username });
    res.status(200).json({ orderData });
  });

  app.post('/api/orders', async (req, res) => {
    const order = await Order.create({ ...req.body, userId: req.session.user.username });
    res.status(201).json({ id: order.id, userId: order.userId, cart: req.body.cart, amount: req.body.amount });
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
    expect(res.body.orderData.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /api/orders creates a new PayPal order', async () => {
    const orderPayload = { cart: [{ menuItemId: '1', quantity: 1 }], currency: 'USD', amount: 10 };
    const res = await request(app).post('/api/orders').send(orderPayload);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.userId).toBe(usersMock[0].username);
    expect(res.body.cart).toEqual(orderPayload.cart);
    expect(res.body.amount).toBe(orderPayload.amount);
  });
});