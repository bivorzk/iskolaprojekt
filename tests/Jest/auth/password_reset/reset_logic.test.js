const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

jest.mock('../../../../src/models/User', () => {
  return jest.fn().mockImplementation(() => {
    return {
      save: jest.fn().mockResolvedValue(true)
    };
  });
});
const User = require('../../../../src/models/User');
const passwordResetRouter = require('../../../../src/auth/password_reset');

const app = express();
app.use(express.json());
app.use('/password-reset', passwordResetRouter);

describe('Password reset POST /password-reset/:token', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const userId = '123456789012345678901234';
  const token = jwt.sign({ userId, email: 'test@example.com' }, process.env.JWT_SECRET, { expiresIn: '15m' });

  test('Successful password reset', async () => {

    const userMock = new User();
    userMock.username = 'testuser';
    userMock.save = jest.fn().mockResolvedValue(true);

    User.findById = jest.fn().mockResolvedValue(userMock);

    const newPassword = 'ValidPass1!';

    const res = await request(app)
      .post(`/password-reset/${token}`)
      .send({ newPassword, confirmPassword: newPassword });

    expect(res.status).toBe(200);
    expect(res.text).toBe('Password has been reset successfully');
    expect(userMock.save).toHaveBeenCalled();
  });

  test('Password mismatch returns 400', async () => {
    User.findById = jest.fn().mockResolvedValue(new User());

    const res = await request(app)
      .post(`/password-reset/${token}`)
      .send({ newPassword: 'Password1!', confirmPassword: 'Different1!' });

    expect(res.status).toBe(400);
    expect(res.text).toBe('Passwords do not match');
  });

  test('Missing passwords return 400', async () => {
    User.findById = jest.fn().mockResolvedValue(new User());

    const res = await request(app)
      .post(`/password-reset/${token}`)
      .send({ newPassword: '', confirmPassword: '' });

    expect(res.status).toBe(400);
    expect(res.text).toBe('Both password fields are required');
  });
});
