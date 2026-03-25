const request = require('supertest');
const express = require('express');
const session = require('express-session');
const adminRouter = require('../../../routes/admin');
const { createSecurityLog } = require('../../../auth/security');

jest.mock('../../../auth/security', () => ({
  createSecurityLog: jest.fn().mockResolvedValue(true),
}));

// Middleware, ami lehetővé teszi a session beállítást minden tesztnél
const mockSessionMiddleware = (user) => (req, res, next) => {
  req.session.user = user;
  next();
};

describe('Admin Access', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
  });

  test('Admin user can access protected route', async () => {
    app.use(mockSessionMiddleware({ id: '1', role: 'ADMIN' }));
    app.use('/admin', adminRouter);

    const res = await request(app).get('/admin/dashboard');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(createSecurityLog).toHaveBeenCalled(); // Ellenőrizzük a log hívást
  });

  test('Non-admin user cannot access admin route', async () => {
    app.use(mockSessionMiddleware({ id: '2', role: 'STUDENT' }));
    app.use('/admin', adminRouter);

    const res = await request(app).get('/admin/dashboard');

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Access denied/);
  });

  test('Unauthenticated user cannot access admin route', async () => {
    app.use(mockSessionMiddleware(null));
    app.use('/admin', adminRouter);

    const res = await request(app).get('/admin/dashboard');

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Access denied/);
  });
});