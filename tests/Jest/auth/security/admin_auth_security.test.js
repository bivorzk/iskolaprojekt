const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { rateLimit } = require('../src/dashboard/admin/admin'); // rateLimit middleware importálása
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

    // Rate limit endpoint - a helyes útvonal: /dashboard/admin/ratelimit
    app.get('/dashboard/admin/ratelimit', rateLimit, (req, res) => res.status(200).send('OK'));

    // Admin create menu item endpoint (egyszerűsített teszt)
    app.post(
      '/dashboard/admin/menuitem',
      body('name').trim().escape().isLength({ min: 1 }),
      body('description').trim().escape().isLength({ max: 500 }),
      (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        res.status(200).json({ name: req.body.name, description: req.body.description });
      }
    );

    // Auth login endpoint (egyszerűsített)
    app.post('/auth/login', (req, res) => {
      const { username } = req.body;
      if (typeof username !== 'string') return res.status(400).send('Invalid username');
      res.status(200).json({ success: true });
    });
  });

  // ------------------------
  // RATE LIMIT TESZTEK
  // ------------------------
  it('blokkolja az admin kéréseket limit túllépésekor', async () => {
    redisLuaService.checkRateLimit.mockResolvedValue({ allowed: false, currentCount: 35 });
    const res = await request(app).get('/dashboard/admin/ratelimit');
    expect(res.statusCode).toBe(429);
  });

  it('engedélyezi az admin kéréseket limit alatt', async () => {
    redisLuaService.checkRateLimit.mockResolvedValue({ allowed: true, currentCount: 10 });
    const res = await request(app).get('/dashboard/admin/ratelimit');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('OK');
  });

  // ------------------------
  // XSS / Input sanitization
  // ------------------------
  it('escape-eli a script tageket menüelem létrehozásakor', async () => {
    const res = await request(app)
      .post('/dashboard/admin/menuitem')
      .send({ name: '<script>alert(1)</script>', description: '<img src=x>' });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toContain('&lt;script&gt;');
    expect(res.body.description).toContain('&lt;img');
  });

  it('elutasítja az üres nevet menüelem létrehozásakor', async () => {
    const res = await request(app)
      .post('/dashboard/admin/menuitem')
      .send({ name: '', description: 'Valid description' });
    expect(res.statusCode).toBe(400);
  });

  // ------------------------
  // NoSQL Injection megelőzés
  // ------------------------
  it('elutasítja az objektum injekciót login során', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: { $gt: '' } });
    expect(res.statusCode).toBe(400);
    expect(res.text).toBe('Invalid username');
  });

  it('elfogadja az érvényes string típusú felhasználónevet', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'validUser' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});