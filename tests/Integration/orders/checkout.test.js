const request = require('supertest');
const express = require('express');
const session = require('express-session');
const ordersRouter = require('../../../routes/orders');
const { MenuItems, Order, Payment, UserLoyalty } = require('../../../config/database_queries');

// Mock database and Redis
jest.mock('../../../config/database_queries', () => ({
  MenuItems: {
    findById: jest.fn(),
    find: jest.fn()
  },
  Order: jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({
      _id: 'order123',
      items: [],
      totalAmount: 20,
      status: 'Pending',
      save: jest.fn().mockResolvedValue(true)
    })
  })),
  Payment: jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(true)
  })),
  UserLoyalty: {
    findOne: jest.fn().mockResolvedValue({ userTier: 'SILVER' }),
    updatePointsAtomically: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../../../services/redis-lua-service', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, currentCount: 0 }),
  getWalletBalance: jest.fn().mockResolvedValue(100),
  processOrder: jest.fn().mockResolvedValue({ newBalance: 50, newStock: 10 })
}));

// Mock security
jest.mock('../../../auth/security', () => ({
  createSecurityLog: jest.fn().mockResolvedValue(true) // Mockoljunk egy sikeres választ
}));

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
app.use('/orders', ordersRouter);

describe('Checkout API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /orders/order validates cart input', async () => {
    const res = await request(app).post('/orders/order').send({ cart: [] });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Cart is required/);
  });

  test('POST /orders/order/wallet processes successful wallet order', async () => {
    // Mock menu item
    MenuItems.findById.mockResolvedValue({ _id: '1', name: 'Burger', price: 20, available: true, stock: 10 });

    const res = await request(app)
      .post('/orders/order/wallet')
      .send({ cart: [{ menuItemId: '1', quantity: 1 }] })
      .set('Cookie', ['connect.sid=123']); // simulate logged-in user

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.newBalance).toBe(50);
    expect(res.body.newStock).toBe(10);
  });

  test('POST /orders/order/wallet fails insufficient balance', async () => {
    MenuItems.findById.mockResolvedValue({ _id: '1', name: 'Expensive', price: 200, available: true, stock: 10 });
    const res = await request(app)
      .post('/orders/order/wallet')
      .send({ cart: [{ menuItemId: '1', quantity: 1 }] })
      .set('Cookie', ['connect.sid=123']);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Insufficient wallet balance/);
  });
});