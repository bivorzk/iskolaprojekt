const request = require('supertest');
const express = require('express');
const session = require('express-session');

const usersMock = [{ username: 'teststudent', balance: 20 }];
let orderCounter = 1;

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

  app.use((req, res, next) => { 
    req.session.user = usersMock[0]; 
    next(); 
  });

  app.get('/dashboard/student/wallet/balance', (req, res) => {
    res.status(200).json({ balance: req.session.user.balance });
  });

  app.post('/api/pay-with-balance', (req, res) => {
    const { items, total } = req.body;
    if (req.session.user.balance >= total) {
      req.session.user.balance -= total;
      res.status(201).json({
        success: true,
        orderId: `order${orderCounter++}`,
        loyaltyPointsAwarded: Math.floor(total)
      });
    } else {
      res.status(400).json({ success: false });
    }
  });

  return app;
};

describe('Student Wallet', () => {
  let app;
  beforeAll(() => { app = createApp(); });

  // Teszt: egyenleg lekérése
  test('GET /dashboard/student/wallet/balance returns balance', async () => {
    const res = await request(app).get('/dashboard/student/wallet/balance');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('balance');
    expect(typeof res.body.balance).toBe('number');
    expect(res.body.balance).toBe(20);  // Ellenőrizzük, hogy a várt értéket kapjuk
  });

  // Teszt: egyenleggel történő fizetés
  test('POST /pay-with-balance processes payment', async () => {
    const res = await request(app)
      .post('/api/pay-with-balance')
      .send({ items: [{ menuItemId: '1', quantity: 1 }], total: 5.0, currency: 'USD' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('orderId');
    expect(res.body).toHaveProperty('loyaltyPointsAwarded');
    expect(res.body.loyaltyPointsAwarded).toBe(5); // Loyalty pontok ellenőrzése (Math.floor(total))
  });

  // Teszt: ha nincs elegendő egyenleg
  test('POST /pay-with-balance returns error when balance is insufficient', async () => {
    const res = await request(app)
      .post('/api/pay-with-balance')
      .send({ items: [{ menuItemId: '1', quantity: 1 }], total: 30.0, currency: 'USD' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
  });
});