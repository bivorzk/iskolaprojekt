jest.mock('../../../config/database_queries', () => ({
  MenuItems: {
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn()
  },
  Payment: {},
  Order: {},
  UserLoyalty: {}
}));

const { MenuItems } = require('../../../config/database_queries');
const adminRouter = require('../../../src/dashboard/admin/admin');

describe('Admin Menu Routes (Unit)', () => {

  let req;
  let res;

  beforeEach(() => {
    req = {
      session: {
        user: {
          IsLoggedIn: true,
          usertype: 'admin'
        }
      },
      body: {},
      params: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      sendFile: jest.fn()
    };

    jest.clearAllMocks();
  });

  test('create_menuitem should return 202 on success', async () => {
    MenuItems.create.mockResolvedValue({});

    req.body = {
      id: '1',
      name: 'Pizza',
      description: 'Test',
      stock: 10,
      price: 100,
      category: 'Main'
    };

    const layer = adminRouter.stack.find(
      layer => layer.route && layer.route.path === '/create_menuitem'
    );

    await layer.route.stack[1].handle(req, res);

    expect(MenuItems.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(202);
  });

  test('update menuitem should return 404 if not found', async () => {
    MenuItems.findByIdAndUpdate.mockResolvedValue(null);

    req.params.id = '123';

    const layer = adminRouter.stack.find(
      layer => layer.route && layer.route.path === '/menuitem/:id'
    );

    await layer.route.stack[0].handle(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('delete menuitem should return success', async () => {
    MenuItems.findByIdAndDelete.mockResolvedValue({});

    req.params.id = '123';

    const layer = adminRouter.stack.find(
      layer => layer.route && layer.route.path === '/delete_menuitem/:id'
    );

    await layer.route.stack[0].handle(req, res);

    expect(MenuItems.findByIdAndDelete).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Menu item deleted' });
  });

});