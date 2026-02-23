const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../../../../src/models/User', () => ({
  findById: jest.fn()
}));
const User = require('../../../../src/models/User');
const passwordResetRouter = require('../../../../src/auth/password_reset');

const app = express();
app.use(express.json());
app.use('/password-reset', passwordResetRouter);

describe('Token endpoint tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET /password-reset/:token - valid token', async () => {
    const userId = '123456789012345678901234';
    const token = jwt.sign({ userId, email: 'test@example.com' }, process.env.JWT_SECRET, { expiresIn: '15m' });

    User.findById.mockResolvedValue({ _id: userId, username: 'testuser' });

    const res = await request(app).get(`/password-reset/${token}`);

    expect(res.status).toBe(200);
    expect(res.text).toBe('Token is valid. You may now reset your password.');
    expect(User.findById).toHaveBeenCalledWith(userId);
  });

  test('GET /password-reset/:token - invalid token', async () => {
    const invalidToken = 'invalid.token.here';

    const res = await request(app).get(`/password-reset/${invalidToken}`);

    expect(res.status).toBe(400);
    expect(res.text).toBe('Token has expired or is invalid, please try again');
  });

  test('GET /password-reset/:token - user not found', async () => {
    const userId = '123456789012345678901234';
    const token = jwt.sign({ userId, email: 'test@example.com' }, process.env.JWT_SECRET, { expiresIn: '15m' });

    User.findById.mockResolvedValue(null);

    const res = await request(app).get(`/password-reset/${token}`);

    expect(res.status).toBe(400);
    expect(res.text).toBe('User not found');
  });
});