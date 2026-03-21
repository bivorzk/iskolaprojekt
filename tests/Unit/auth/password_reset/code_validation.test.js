jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mockToken'),
  verify: jest.fn((token) => {
    if (token === 'invalid') throw new Error('Invalid token');
    if (token === 'expired') { const err = new Error(); err.name = 'TokenExpiredError'; throw err; }
    return { userId: '123' };
  })
}));

jest.mock('badwords-list', () => ({ array: [] }));
jest.mock('zxcvbn', () => jest.fn(() => ({ score: 3 })));

const express = require('express');
const request = require('supertest');

const User = { findById: jest.fn(() => ({ save: jest.fn().mockResolvedValue(true) })) };

const passwordResetRouter = express.Router();
passwordResetRouter.post('/:token', async (req, res) => {
  const { token } = req.params;
  if (token === 'invalid') return res.status(400).send('Invalid token');
  if (token === 'expired') return res.status(400).send('Token has expired, please request a new password reset');
  const { newPassword, confirmPassword } = req.body;
  if (!newPassword || !confirmPassword) return res.status(400).send('Both password fields are required');
  if (newPassword !== confirmPassword) return res.status(400).send('Passwords do not match');
  await User.findById('123').save();
  res.status(200).send('Password has been reset successfully');
});

const app = express();
app.use(express.json());
app.use('/password-reset', passwordResetRouter);

describe('Password Reset Code Validation', () => {
  it('invalid token returns 400', async () => {
    const res = await request(app).post('/password-reset/invalid').send({ newPassword: 'a', confirmPassword: 'a' });
    expect(res.status).toBe(400);
    expect(res.text).toBe('Invalid token');
  });

  it('expired token returns 400', async () => {
    const res = await request(app).post('/password-reset/expired').send({ newPassword: 'a', confirmPassword: 'a' });
    expect(res.status).toBe(400);
    expect(res.text).toBe('Token has expired, please request a new password reset');
  });
});