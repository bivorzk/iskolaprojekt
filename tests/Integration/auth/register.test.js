const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');

jest.mock('../../../src/auth/validation', () => ({
  validateUsername: jest.fn(() => null),
  validatePassword: jest.fn(() => null),
  validateEmail: jest.fn(() => null),
  verifyCaptcha: jest.fn(async () => ({ success: true, score: 1 }))
}));

jest.mock('../../../src/auth/email_verification', () => ({
  sendVerificationEmail: jest.fn(async () => true)
}));

jest.mock('../../../src/auth/security', () => ({
  createSecurityLog: jest.fn(async () => true)
}));

jest.mock('../../../src/models/User', () => {
  const users = [];
  return {
    findOne: jest.fn(async ({ username, email }) => {
      return users.find(u => u.username === username || u.email === email) || null;
    }),
    save: jest.fn(async function () {
      users.push(this);
      return this;
    }),
    __mockUsers: users
  };
});

jest.mock('../../../src/redis', () => ({
  redisClient: {
    get: jest.fn(async () => null),
    setEx: jest.fn(async () => true)
  },
  isRedisAvailable: true
}));

const { router } = require('../../../src/auth/register');
const app = express();
app.use(express.json());
app.use('/auth/register', router);

describe('POST /auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { redisClient } = require('../../../src/redis');
    redisClient.get.mockResolvedValue(null);
  });

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        username: 'newuser',
        password: 'StrongPass123!',
        email: 'newuser@example.com',
        'g-recaptcha-response': 'dummy-token'
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Registration successful/i);
  });

  it('should not register if username or email already exists', async () => {
    const User = require('../../../src/models/User');
    await User.save.call({ username: 'existing', password: 'hashed', email: 'exist@example.com' });

    const res = await request(app)
      .post('/auth/register')
      .send({
        username: 'existing',
        password: 'AnyPass123!',
        email: 'exist@example.com',
        'g-recaptcha-response': 'dummy-token'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Username or email already exists/i);
  });

  it('should fail with missing username or password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ username: '', password: '', email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Username and password are required/i);
  });

  it('should fail with invalid reCAPTCHA', async () => {
    const { verifyCaptcha } = require('../../../src/auth/validation');
    verifyCaptcha.mockResolvedValueOnce({ success: false, error: 'Failed', details: 'Captcha failed' });

    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'user', password: 'pass', email: 'u@e.com', 'g-recaptcha-response': 'bad-token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Failed');
    expect(res.body.details).toBe('Captcha failed');
  });

  it('should return 429 if rate limit exceeded', async () => {
    const { redisClient } = require('../../../src/redis');
    redisClient.get.mockResolvedValueOnce('5');

    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'user', password: 'pass', email: 'u@e.com', 'g-recaptcha-response': 'token' });

    expect(res.status).toBe(429);
    expect(res.text).toMatch(/Too many registration attempts/i);
  });
});