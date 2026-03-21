const request = require('supertest');
const express = require('express');
const session = require('express-session');
const ordersRouter = require('../../../routes/orders'); // Az orders.js route
const { MenuItems } = require('../../../config/database_queries'); // Mockolt adatbázis

// Mock adatbázis és Redis
jest.mock('../../../config/database_queries', () => ({
  MenuItems: {
    find: jest.fn(),
    findById: jest.fn(),
  },
  Order: jest.fn(),
  Payment: jest.fn(),
  UserLoyalty: jest.fn()
}));

jest.mock('../../../services/redis-lua-service', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, currentCount: 0 }),
  getWalletBalance: jest.fn().mockResolvedValue(100),
  processOrder: jest.fn().mockResolvedValue({ newBalance: 50, newStock: 10 }),
  getInventoryStock: jest.fn().mockResolvedValue(100),
  updateWalletBalance: jest.fn().mockResolvedValue(true)
}));

// Mock security
jest.mock('../../../auth/security', () => ({
  createSecurityLog: jest.fn().mockResolvedValue(true) // Mockoljunk egy sikeres választ
}));

// Express app setup
const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
app.use('/orders', ordersRouter);

describe('Cart API', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Minden teszt előtt töröljük a mockokat
  });

  test('GET /orders/menu_items returns available menu items', async () => {
    const fakeItems = [
      { _id: '1', name: 'Burger', price: 5, available: true, reviews: [] },
      { _id: '2', name: 'Pizza', price: 8, available: true, reviews: [] }
    ];
    MenuItems.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(fakeItems)
    });

    const res = await request(app).get('/orders/menu_items');

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].name).toBe('Burger');
    expect(MenuItems.find).toHaveBeenCalledWith({ available: true });
  });

  test('POST /orders/item_information/:itemName/Review rejects invalid rating', async () => {
    const res = await request(app)
      .post('/orders/item_information/Burger/Review')
      .send({ rating: 6, comment: 'Great' }) // rating > 5
      .set('Cookie', ['connect.sid=123']); // simulate logged-in user

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].msg).toMatch(/Rating must be an integer/);
  });

  test('POST /orders/item_information/:itemName/Review rejects profanity', async () => {
    // Mock menu item
    MenuItems.findOne = jest.fn().mockResolvedValue({ name: 'Burger', reviews: [], save: jest.fn().mockResolvedValue(true) });

    const res = await request(app)
      .post('/orders/item_information/Burger/Review')
      .send({ rating: 5, comment: 'shit' })
      .set('Cookie', ['connect.sid=123']); // simulate logged-in user

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/inappropriate language/);
  });
});