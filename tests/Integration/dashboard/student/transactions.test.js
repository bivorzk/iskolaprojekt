const request = require('supertest');
const express = require('express');
const session = require('express-session');

const transactionsMock = [
  { id: 't1', amount: 5, type: 'purchase' }
];
const usersMock = [{ username: 'teststudent' }];

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

  // session mock
  app.use((req, res, next) => { 
    req.session.user = usersMock[0]; 
    next(); 
  });

  // GET transactions
  app.get('/dashboard/student/transactions', (req, res) => {
    res.status(200).json({ transactions: transactionsMock });
  });

  return app;
};

describe('Student Dashboard Transactions', () => {
  let app;
  beforeAll(() => { app = createApp(); });

  test('GET /dashboard/student/transactions returns transactions array with correct content', async () => {
    const res = await request(app).get('/dashboard/student/transactions');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('transactions');
    expect(Array.isArray(res.body.transactions)).toBe(true);

    // Tartalom ellenőrzése
    expect(res.body.transactions[0]).toHaveProperty('id', 't1');
    expect(res.body.transactions[0]).toHaveProperty('amount', 5);
    expect(res.body.transactions[0]).toHaveProperty('type', 'purchase');
  });
});