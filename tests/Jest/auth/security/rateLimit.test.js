const request = require('supertest');
const express = require('express');
const rateLimitMiddleware = require('../src/dashboard/admin/admin').rateLimit;
const redisLuaService = require('../src/services/redis-lua-service');

jest.mock('../src/services/redis-lua-service', () => ({
  checkRateLimit: jest.fn()
}));

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
    redisLuaService.checkRateLimit.mockResolvedValue({ allowed: true, currentCount: 5 });
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('OK');
  });

  it('blocks requests over the limit', async () => {
    redisLuaService.checkRateLimit.mockResolvedValue({ allowed: false, currentCount: 31 });
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(429);
  });
});