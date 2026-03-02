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

const request = require('supertest');
const express = require('express');

const { MenuItems } = require('../../../config/database_queries');
const adminRouter = require('../../../src/dashboard/admin/admin');

describe('Admin Menu Routes (Unit)', () => {

  let app;

  beforeEach(() => {
    jest.clearAllMocks();

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

  test('create_menuitem should return 202 on success', async () => {
    MenuItems.create.mockResolvedValue({});

    const response = await request(app)
      .post('/create_menuitem')  
      .send({
        id: '1',
        name: 'Pizza',
        description: 'Test',
        stock: 10,
        price: 100,
        category: 'Main'
      });

    expect(MenuItems.create).toHaveBeenCalled();
    expect(response.status).toBe(202);
  });

  test('update menuitem should return 404 if not found', async () => {
    MenuItems.findByIdAndUpdate.mockResolvedValue(null);

    const response = await request(app)
      .put('/menuitem/123');  

    expect(response.status).toBe(404);
  });

  test('delete menuitem should return success', async () => {
    MenuItems.findByIdAndDelete.mockResolvedValue({});

    const response = await request(app)
      .delete('/delete_menuitem/123'); 

    expect(MenuItems.findByIdAndDelete).toHaveBeenCalled();
    expect(response.body).toEqual({ message: 'Menu item deleted' });
  });

});