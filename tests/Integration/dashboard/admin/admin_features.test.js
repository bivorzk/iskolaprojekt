const request = require('supertest');
const express = require('express');
const session = require('express-session');

// 🔧 MOCK MONGOOSE, nem valódi DB kell
jest.mock('mongoose', () => ({
  connection: {
    db: {
      admin: () => ({
        ping: jest.fn().mockResolvedValue(true)
      })
    }
  }
}));

// Router (amit tesztelünk)
const adminRouter = require('../../../../src/dashboard/admin/admin');

// 🔧 MOCK DB MODELEK
jest.mock('../../../../src/database', () => ({
  User: {
    countDocuments: jest.fn(),
    find: jest.fn()
  }
}));

jest.mock('../../../../config/database_queries', () => ({
  Payment: { aggregate: jest.fn() },
  MenuItems: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn()
  },
  Order: {
    countDocuments: jest.fn()
  },
  UserLoyalty: {
    aggregate: jest.fn()
  }
}));

const { User } = require('../../../../src/database');
const { MenuItems, Order, UserLoyalty } = require('../../../../config/database_queries');

describe('ADMIN FEATURES - Integration Tests', () => {
  let app;

  const createAppWithSession = (user) => {
    const app = express();
    app.use(express.json());

    app.use(session({
      secret: 'test',
      resave: false,
      saveUninitialized: true
    }));

    app.use((req, res, next) => {
      req.session.user = user;
      next();
    });

    app.use('/admin', adminRouter);

    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================
  // 🔐 AUTH TESTS
  // =========================
  test('❌ should block non-admin user', async () => {
    const app = createAppWithSession({ IsLoggedIn: true, usertype: 'student' });
    const res = await request(app).get('/admin/usercount');
    expect(res.statusCode).toBe(403);
  });

  test('❌ should block unauthenticated user', async () => {
    const app = createAppWithSession(null);
    const res = await request(app).get('/admin/usercount');
    expect(res.statusCode).toBe(403);
  });

  // =========================
  // 👤 USER STATS
  // =========================
  test('✅ should return user count', async () => {
    User.countDocuments.mockResolvedValue(10);
    const app = createAppWithSession({ IsLoggedIn: true, usertype: 'admin' });
    const res = await request(app).get('/admin/usercount');
    expect(res.statusCode).toBe(202);
    expect(res.body.total).toBe(10);
  });

  test('✅ should return user list', async () => {
    User.find.mockResolvedValue([{ username: 'test', email: 'test@test.com', usertype: 'student' }]);
    const app = createAppWithSession({ IsLoggedIn: true, usertype: 'admin' });
    const res = await request(app).get('/admin/userlist');
    expect(res.statusCode).toBe(202);
    expect(res.body.users.length).toBe(1);
  });

  // =========================
  // 📦 ORDERS
  // =========================
  test('✅ should return order count', async () => {
    Order.countDocuments.mockResolvedValue(5);
    const app = createAppWithSession({ IsLoggedIn: true, usertype: 'admin' });
    const res = await request(app).get('/admin/orders');
    expect(res.statusCode).toBe(202);
    expect(res.body.total).toBe(5);
  });

  // =========================
  // 🍔 MENU ITEMS
  // =========================
  test('✅ should create menu item', async () => {
    MenuItems.create.mockResolvedValue({});
    const app = createAppWithSession({ IsLoggedIn: true, usertype: 'admin' });
    const res = await request(app)
      .post('/admin/create_menuitem')
      .send({ id: '1', name: 'Pizza', description: 'Good', stock: 10, price: 5, category: 'food' });
    expect(res.statusCode).toBe(202);
    expect(res.body.message).toBe('Menu item created');
  });

  test('❌ should fail validation when creating menu item', async () => {
    const app = createAppWithSession({ IsLoggedIn: true, usertype: 'admin' });
    const res = await request(app)
      .post('/admin/create_menuitem')
      .send({ name: '' }); // invalid
    expect(res.statusCode).toBe(400);
  });

  test('✅ should update menu item', async () => {
    MenuItems.findByIdAndUpdate.mockResolvedValue({ _id: '1' });
    const app = createAppWithSession({ IsLoggedIn: true, usertype: 'admin' });
    const res = await request(app)
      .put('/admin/menuitem/1')
      .send({ name: 'Updated' });
    expect(res.statusCode).toBe(202);
  });

  test('❌ should return 404 if menu item not found', async () => {
    MenuItems.findByIdAndUpdate.mockResolvedValue(null);
    const app = createAppWithSession({ IsLoggedIn: true, usertype: 'admin' });
    const res = await request(app)
      .put('/admin/menuitem/1')
      .send({ name: 'Updated' });
    expect(res.statusCode).toBe(404);
  });

  // =========================
  // ⭐ LOYALTY
  // =========================
  test('✅ should return total points', async () => {
    UserLoyalty.aggregate.mockResolvedValue([{ totalPoints: 100 }]);
    const app = createAppWithSession({ IsLoggedIn: true, usertype: 'admin' });
    const res = await request(app).get('/admin/totalpoints');
    expect(res.statusCode).toBe(202);
    expect(res.body.totalPoints).toBe(100);
  });

  // =========================
  // ❤️ HEALTH CHECK
  // =========================
  test('✅ should return health status', async () => {
    const app = createAppWithSession({ IsLoggedIn: true, usertype: 'admin' });
    const res = await request(app).get('/admin/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

});

