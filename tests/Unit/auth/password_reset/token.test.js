jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mockToken'),
  verify: jest.fn((token) => {
    if (token === 'invalid') throw new Error('Invalid token');
    return { userId: '123' };
  })
}));
jest.mock('badwords-list', () => ({ array: [] }));
jest.mock('zxcvbn', () => jest.fn(() => ({ score: 3 })));

const express = require('express');
const request = require('supertest');

const User = { findById: jest.fn((id) => id === '123' ? { _id: id, username: 'testuser' } : null) };

const passwordResetRouter = express.Router();
passwordResetRouter.get('/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const payload = require('jsonwebtoken').verify(token, 'testsecret123');
    const user = User.findById(payload.userId);
    if (!user) return res.status(400).send('User not found');
    res.status(200).send('Token is valid. You may now reset your password.');
  } catch (err) {
    res.status(400).send('Token has expired or is invalid, please try again');
  }
});

const app = express();
app.use(express.json());
app.use('/password-reset', passwordResetRouter);

describe('Password Reset Token', () => {
  it('valid token returns 200', async () => {
    const res = await request(app).get('/password-reset/valid');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Token is valid. You may now reset your password.');
  });

  it('invalid token returns 400', async () => {
    const res = await request(app).get('/password-reset/invalid');
    expect(res.status).toBe(400);
    expect(res.text).toBe('Token has expired or is invalid, please try again');
  });

  it('user not found returns 400', async () => {
    User.findById = jest.fn(() => null);
    const res = await request(app).get('/password-reset/valid');
    expect(res.status).toBe(400);
    expect(res.text).toBe('User not found');
  });
});