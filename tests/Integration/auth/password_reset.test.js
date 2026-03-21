const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// ===== MOCKS ===== //
// Mock zxcvbn
jest.mock('zxcvbn', () => jest.fn(() => ({ score: 4, feedback: { warning: '', suggestions: [] } })));
// Mock badwords-list
jest.mock('badwords-list', () => ({ array: ['badword1', 'badword2'] }));

// Mock MongoDB User model
jest.mock('../../../src/models/User', () => {
  const mockUsers = [];
  return {
    findOne: jest.fn(async ({ email }) => mockUsers.find(u => u.email === email) || null),
    findById: jest.fn(async (id) => mockUsers.find(u => u._id === id) || null),
    save: jest.fn(async function () {
      const idx = mockUsers.findIndex(u => u._id === this._id);
      if (idx >= 0) mockUsers[idx] = this;
      else mockUsers.push(this);
      return this;
    }),
    __mockUsers: mockUsers,
  };
});

// Mock SendGrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202, headers: { 'x-message-id': 'msg123' } }])
}));

// ===== APP SETUP ===== //
const User = require('../../../src/models/User'); // a mockolt verzió
const passwordResetRouter = require('../../../src/auth/password_reset');
const app = express();
app.use(express.json());
app.use('/password-reset', passwordResetRouter);

// JWT secret
process.env.JWT_SECRET = 'testsecret';

describe('Password Reset Integration Tests', () => {
  let testUser;

  beforeAll(async () => {
    // initial password hash
    const hashedPassword = await bcrypt.hash('initial', 10);
    testUser = {
      _id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      save: User.save
    };
    User.__mockUsers.push(testUser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initiate password reset email', async () => {
    const res = await request(app)
      .post('/password-reset')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/password reset link has been sent/i);
  });

  it('should validate token via GET /:token', async () => {
    const token = jwt.sign({ userId: testUser._id, email: testUser.email }, process.env.JWT_SECRET, { expiresIn: '15m' });

    const res = await request(app).get(`/password-reset/${token}`);

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Token is valid/i);
  });

  it('should fail GET with invalid token', async () => {
    const res = await request(app).get('/password-reset/invalidtoken');
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Token has expired or is invalid/i);
  });

  it('should reset password successfully via POST /:token', async () => {
    const token = jwt.sign({ userId: testUser._id, email: testUser.email }, process.env.JWT_SECRET, { expiresIn: '15m' });

    const res = await request(app)
      .post(`/password-reset/${token}`)
      .send({ newPassword: 'StrongPass1!', confirmPassword: 'StrongPass1!' });

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Password has been reset successfully/i);

    // check password was hashed correctly
    const updatedUser = User.__mockUsers.find(u => u._id === testUser._id);
    const match = await bcrypt.compare('StrongPass1!', updatedUser.password);
    expect(match).toBe(true);
  });

  it('should fail POST if passwords do not match', async () => {
    const token = jwt.sign({ userId: testUser._id, email: testUser.email }, process.env.JWT_SECRET, { expiresIn: '15m' });

    const res = await request(app)
      .post(`/password-reset/${token}`)
      .send({ newPassword: 'StrongPass1!', confirmPassword: 'WrongPass2!' });

    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Passwords do not match/i);
  });

  it('should fail POST with invalid token', async () => {
    const res = await request(app)
      .post('/password-reset/invalidtoken')
      .send({ newPassword: 'StrongPass1!', confirmPassword: 'StrongPass1!' });

    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Token has expired or is invalid/i);
  });
});