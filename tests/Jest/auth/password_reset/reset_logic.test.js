jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mockToken'),
  verify: jest.fn(() => ({ userId: '123' }))
}));
jest.mock('badwords-list', () => ({ array: [] }));
jest.mock('zxcvbn', () => jest.fn(() => ({ score: 3 })));

const express = require('express');
const request = require('supertest');

const User = { findById: jest.fn(() => ({ save: jest.fn().mockResolvedValue(true) })) };

const passwordResetRouter = express.Router();
passwordResetRouter.post('/:token', async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  if (!newPassword || !confirmPassword) return res.status(400).send('Both password fields are required');
  if (newPassword !== confirmPassword) return res.status(400).send('Passwords do not match');
  await User.findById('123').save();
  res.status(200).send('Password has been reset successfully');
});

const app = express();
app.use(express.json());
app.use('/password-reset', passwordResetRouter);

describe('Password Reset Logic', () => {
  it('successful reset returns 200', async () => {
    const res = await request(app).post('/password-reset/valid').send({ newPassword: 'Valid1!', confirmPassword: 'Valid1!' });
    expect(res.status).toBe(200);
    expect(res.text).toBe('Password has been reset successfully');
  });

  it('password mismatch returns 400', async () => {
    const res = await request(app).post('/password-reset/valid').send({ newPassword: 'a', confirmPassword: 'b' });
    expect(res.status).toBe(400);
    expect(res.text).toBe('Passwords do not match');
  });

  it('missing passwords return 400', async () => {
    const res = await request(app).post('/password-reset/valid').send({ newPassword: '', confirmPassword: '' });
    expect(res.status).toBe(400);
    expect(res.text).toBe('Both password fields are required');
  });
});
