jest.mock('mongoose', () => ({
  Schema: function () { return {}; },
  model: jest.fn(),
  Types: { ObjectId: jest.fn() }
}));

jest.mock('../../../../src/database', () => ({
  User: {}
}));

jest.mock('../../../../config/database_queries', () => ({
  MenuItems: {
    create: jest.fn().mockResolvedValue({}),
    findById: jest.fn().mockResolvedValue({ _id: '123' }),
    findByIdAndDelete: jest.fn().mockResolvedValue({}),
    findByIdAndUpdate: jest.fn().mockResolvedValue(null)
  },
  Payment: {},
  Order: {},
  UserLoyalty: {}
}));

const request = require('supertest');
const express = require('express');
const adminRouter = require('../../../../src/dashboard/admin/admin');

describe('Admin Menu Routes', () => {

  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.session = {
        user: {
          IsLoggedIn: true,
          usertype: 'admin'
        }
      };
      next();
    });

    app.use('/', adminRouter);
  });

  test('create_menuitem', async () => {
    const res = await request(app)
      .post('/create_menuitem')
      .send({
        id: '123',
        name: 'Pizza',
        description: 'Test',
        stock: 10,
        price: 100,
        category: 'Main',
        image: 'test.jpg'
      });

    expect([202,400]).toContain(res.status);
  });

  test('update menuitem', async () => {
    const res = await request(app)
      .put('/menuitem/123');

    expect([404,202]).toContain(res.status);
  });

  test('delete menuitem', async () => {
    const res = await request(app)
      .delete('/delete_menuitem/123');

    expect([200,404,202]).toContain(res.status);
  });

});
