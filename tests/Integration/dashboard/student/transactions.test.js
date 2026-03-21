const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Mock adatok
const transactionsMock = [
  { id: 't1', amount: 5, type: 'purchase' }
];
const usersMock = [{ username: 'teststudent' }];

// Mini Express app
const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

  app.use((req, res, next) => { req.session.user = usersMock[0]; next(); });

  app.get('/dashboard/student/transactions', (req, res) => {
    res.status(200).json({ transactions: transactionsMock });
  });

  return app;
};

describe('Student Dashboard Transactions', () => {
  let app;
  beforeAll(() => { app = createApp(); });

  test('GET /dashboard/student/transactions returns transactions array', async () => {
    const res = await request(app).get('/dashboard/student/transactions');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('transactions');
    expect(Array.isArray(res.body.transactions)).toBe(true);
  });
});