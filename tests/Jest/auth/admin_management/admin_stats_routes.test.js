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

const { MenuItems, Order, User } = require('../../../config/database_queries');
const adminRouter = require('../../../src/dashboard/admin/admin');

describe('Admin Statistics & Utility Routes (Unit)', () => {

  let req;
  let res;

  beforeEach(() => {
    req = {
      session: {
        user: {
          IsLoggedIn: true,
          usertype: 'admin',
          username: 'AdminUser'
        }
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };

    jest.clearAllMocks();
  });

  test('usercount should return total users', async () => {
    User.countDocuments.mockResolvedValue(5);

    const layer = adminRouter.stack.find(
      layer => layer.route && layer.route.path === '/usercount'
    );

    await layer.route.stack[0].handle(req, res);

    expect(User.countDocuments).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ count: 5 });
  });

  test('itemcount should return total menu items', async () => {
    MenuItems.countDocuments.mockResolvedValue(10);

    const layer = adminRouter.stack.find(
      layer => layer.route && layer.route.path === '/itemcount'
    );

    await layer.route.stack[0].handle(req, res);

    expect(MenuItems.countDocuments).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ count: 10 });
  });

  test('health endpoint should return OK', async () => {
    const layer = adminRouter.stack.find(
      layer => layer.route && layer.route.path === '/health'
    );

    await layer.route.stack[0].handle(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'OK' });
  });

  test('welcome-message should return username', async () => {
    const layer = adminRouter.stack.find(
      layer => layer.route && layer.route.path === '/welcome-message'
    );

    await layer.route.stack[0].handle(req, res);

    expect(res.send).toHaveBeenCalledWith('AdminUser');
  });

});