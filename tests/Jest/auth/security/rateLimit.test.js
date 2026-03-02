const request = require('supertest');
const express = require('express');

const redisLuaService = { checkRateLimit: jest.fn() };
const rateLimitMiddleware = (req, res, next) => {
  redisLuaService.checkRateLimit().then(result => {
    if (result.allowed) next();
    else res.status(429).send('Rate limit exceeded');
  });
};

describe('Rate Limiting Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use((req, res, next) => {
      req.session = { user: { id: 'user123' } };
      next();
    });
    app.get('/', rateLimitMiddleware, (req, res) => res.status(200).send('OK'));
  });

  it('allows requests under the limit', async () => {
    redisLuaService.checkRateLimit.mockResolvedValue({ allowed: true });
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('OK');
  });

  it('blocks requests over the limit', async () => {
    redisLuaService.checkRateLimit.mockResolvedValue({ allowed: false });
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(429);
  });
});