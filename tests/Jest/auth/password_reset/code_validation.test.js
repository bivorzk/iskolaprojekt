const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'testsecret123';

jest.mock('../../../../src/models/User', () => ({
  findById: jest.fn()
}));
const User = require('../../../../src/models/User');
const passwordResetRouter = require('../../../../src/auth/password_reset');

const app = express();
app.use(express.json());
app.use('/password-reset', passwordResetRouter);

describe('Code validation error handling', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Invalid token returns 400', async () => {
    const invalidToken = 'this.is.not.a.token';

    const res = await request(app).post(`/password-reset/${invalidToken}`).send({
      newPassword: 'ValidPass1!',
      confirmPassword: 'ValidPass1!'
    });

    expect(res.status).toBe(400);
    expect(res.text).toBe('Invalid token');
  });

  test('Expired token returns 400', async () => {
    const userId = '123456789012345678901234';
    User.findById.mockResolvedValue({ _id: userId, username: 'testuser', save: jest.fn() });

    const expiredToken = jwt.sign(
      { userId, email: 'test@example.com' },
      process.env.JWT_SECRET,
      { expiresIn: '1ms' }
    );

    await new Promise(r => setTimeout(r, 10));

    const res = await request(app).post(`/password-reset/${expiredToken}`).send({
      newPassword: 'ValidPass1!',
      confirmPassword: 'ValidPass1!'
    });

    expect(res.status).toBe(400);
    expect(res.text).toBe('Token has expired, please request a new password reset');
  });
});
