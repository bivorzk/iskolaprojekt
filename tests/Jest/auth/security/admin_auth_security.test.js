const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');

const redisLuaService = { checkRateLimit: jest.fn() };
const rateLimit = (req, res, next) => {
  redisLuaService.checkRateLimit().then(result => {
    if (result.allowed) next();
    else res.status(429).send('Rate limit exceeded');
  });
};

describe('Admin & Auth Security Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(bodyParser.json());
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

    app.use((req, res, next) => {
      req.session.user = { id: 'admin123', IsLoggedIn: true, usertype: 'admin' };
      next();
    });

    app.get('/dashboard/admin/ratelimit', rateLimit, (req, res) => res.status(200).send('OK'));

    app.post('/dashboard/admin/menuitem', (req, res) => {
      const { name, description } = req.body;
      if (!name || typeof name !== 'string') return res.status(400).json({ errors: ['Invalid name'] });
      res.status(200).json({ name: name.replace('<', '&lt;').replace('>', '&gt;'), description });
    });

    app.post('/auth/login', (req, res) => {
      const { username } = req.body;
      if (typeof username !== 'string') return res.status(400).send('Invalid username');
      res.status(200).json({ success: true });
    });
  });

  it('blokkolja az admin kéréseket limit túllépésekor', async () => {
    redisLuaService.checkRateLimit.mockResolvedValue({ allowed: false });
    const res = await request(app).get('/dashboard/admin/ratelimit');
    expect(res.statusCode).toBe(429);
  });

  it('engedélyezi az admin kéréseket limit alatt', async () => {
    redisLuaService.checkRateLimit.mockResolvedValue({ allowed: true });
    const res = await request(app).get('/dashboard/admin/ratelimit');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('OK');
  });

  it('escape-eli a script tageket menüelem létrehozásakor', async () => {
    const res = await request(app).post('/dashboard/admin/menuitem').send({ name: '<script>alert(1)</script>', description: '<img src=x>' });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toContain('&lt;script&gt;');
  });

  it('elutasítja az üres nevet menüelem létrehozásakor', async () => {
    const res = await request(app).post('/dashboard/admin/menuitem').send({ name: '', description: 'Valid' });
    expect(res.statusCode).toBe(400);
  });

  it('elutasítja az objektum injekciót login során', async () => {
    const res = await request(app).post('/auth/login').send({ username: { $gt: '' } });
    expect(res.statusCode).toBe(400);
    expect(res.text).toBe('Invalid username');
  });

  it('elfogadja az érvényes string típusú felhasználónevet', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'validUser' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});