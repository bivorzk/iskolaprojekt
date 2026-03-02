const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const rateLimitMiddleware = require('../src/dashboard/admin/admin').rateLimit;
const { body, validationResult } = require('express-validator');
const redisLuaService = require('../src/services/redis-lua-service');

jest.mock('../src/services/redis-lua-service', () => ({
  checkRateLimit: jest.fn()
}));

describe('Admin & Auth Security Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(bodyParser.json());
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

    // Mock admin session
    app.use((req, res, next) => {
      req.session.user = { id: 'admin123', IsLoggedIn: true, usertype: 'admin' };
      next();
    });

    // Rate limit endpoint
    app.get('/admin/ratelimit', rateLimitMiddleware, (req, res) => res.status(200).send('OK'));

    // Admin create menu item endpoint (simplified)
    app.post(
      '/admin/menuitem',
      body('name').trim().escape().isLength({ min: 1 }),
      body('description').trim().escape().isLength({ max: 500 }),
      (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        res.status(200).json({ name: req.body.name, description: req.body.description });
      }
    );

    // Auth login endpoint (simplified)
    app.post('/auth/login', (req, res) => {
      const { username } = req.body;
      if (typeof username !== 'string') return res.status(400).send('Invalid username');
      res.status(200).json({ success: true });
    });
  });

  // ------------------------
  // RATE LIMIT TESTS
  // ------------------------
  it('blocks admin requests when over limit', async () => {
    redisLuaService.checkRateLimit.mockResolvedValue({ allowed: false, currentCount: 35 });
    const res = await request(app).get('/admin/ratelimit');
    expect(res.statusCode).toBe(429);
  });

  it('allows admin requests under limit', async () => {
    redisLuaService.checkRateLimit.mockResolvedValue({ allowed: true, currentCount: 10 });
    const res = await request(app).get('/admin/ratelimit');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('OK');
  });

  // ------------------------
  // XSS / Input Sanitization
  // ------------------------
  it('escapes script tags in menu item creation', async () => {
    const res = await request(app)
      .post('/admin/menuitem')
      .send({ name: '<script>alert(1)</script>', description: '<img src=x>' });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toContain('&lt;script&gt;');
    expect(res.body.description).toContain('&lt;img');
  });

  it('rejects empty name in menu item', async () => {
    const res = await request(app)
      .post('/admin/menuitem')
      .send({ name: '', description: 'Valid desc' });
    expect(res.statusCode).toBe(400);
  });

  // ------------------------
  // NoSQL Injection Prevention
  // ------------------------
  it('rejects object injection for login', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: { $gt: '' } });
    expect(res.statusCode).toBe(400);
    expect(res.text).toBe('Invalid username');
  });

  it('accepts valid string username', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'validUser' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

});