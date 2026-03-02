jest.mock('../../../config/database_queries', () => ({
  MenuItems: {
    countDocuments: jest.fn()
  },
  Payment: {},
  Order: {
    countDocuments: jest.fn(),
    find: jest.fn()
  },
  UserLoyalty: {},
  User: {
    countDocuments: jest.fn()
  }
}));

jest.mock('mongoose', () => ({
  connection: {
    db: {
      admin: () => ({
        ping: jest.fn().mockResolvedValue({ ok: 1 })
      })
    }
  }
}));

const request = require('supertest');
const express = require('express');

const { MenuItems, Order, User } = require('../../../config/database_queries');
const adminRouter = require('../../../src/dashboard/admin/admin');

describe('Admin Statistics & Utility Routes (Unit)', () => {

  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.session = {
        user: {
          IsLoggedIn: true,
          usertype: 'admin',
          username: 'AdminUser'
        }
      };
      next();
    });

    app.use('/', adminRouter);
  });

  test('usercount should return total users', async () => {
    User.countDocuments.mockResolvedValue(5);

    const response = await request(app).get('/usercount');

    expect(User.countDocuments).toHaveBeenCalled();
    expect(response.body).toEqual({ count: 5 });
  });

  test('itemcount should return total menu items', async () => {
    MenuItems.countDocuments.mockResolvedValue(10);

    const response = await request(app).get('/itemcount');

    expect(MenuItems.countDocuments).toHaveBeenCalled();
    expect(response.body).toEqual({ count: 10 });
  });

  test('health endpoint should return OK', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'OK' });
  });

  test('welcome-message should return username', async () => {
    const response = await request(app).get('/welcome-message');

    expect(response.text).toBe('AdminUser');
  });

});