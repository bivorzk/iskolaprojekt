jest.mock('mongoose', () => ({
  connection: {
    db: {
      admin: () => ({
        ping: jest.fn().mockResolvedValue({ ok: 1 })
      })
    }
  },
  Schema: function () { return {}; },
  model: jest.fn(),
  Types: { ObjectId: jest.fn() }
}));

jest.mock('../../../../src/database', () => ({
  User: {
    countDocuments: jest.fn().mockResolvedValue(5)
  }
}));

jest.mock('../../../../config/database_queries', () => ({
  MenuItems: {
    countDocuments: jest.fn().mockResolvedValue(10)
  },
  Payment: {},
  Order: {},
  UserLoyalty: {}
}));

const request = require('supertest');
const express = require('express');
const adminRouter = require('../../../../src/dashboard/admin/admin');

describe('Admin Statistics Routes', () => {

  let app;

  beforeEach(() => {
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

  test('usercount', async () => {
    const res = await request(app).get('/usercount');
    expect(res.status).toBe(202);
  });

  test('itemcount', async () => {
    const res = await request(app).get('/itemcount');
    expect(res.status).toBe(202);
  });

  test('health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  test('welcome-message', async () => {
    const res = await request(app).get('/welcome-message');
    expect(res.status).toBe(202);
  });

});
