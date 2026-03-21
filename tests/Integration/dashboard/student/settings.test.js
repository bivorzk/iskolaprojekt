const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Mock adatok
const usersMock = [
  { username: 'teststudent', email: 'student@example.com', usertype: 'student', isVerified: true, parentEmail: 'parent@example.com', linked: true }
];

// Mini Express app
const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

  app.use((req, res, next) => {
    req.session.user = usersMock[0];
    next();
  });

  app.get('/dashboard/student/userinfo', (req, res) => {
    res.status(200).json({ username: req.session.user.username, email: req.session.user.email });
  });

  app.get('/dashboard/student/parent', (req, res) => {
    res.status(200).json({ linked: req.session.user.linked, parentEmail: req.session.user.parentEmail });
  });

  return app;
};

describe('Student Dashboard Settings', () => {
  let app;
  beforeAll(() => { app = createApp(); });

  test('GET /dashboard/student/userinfo returns user data', async () => {
    const res = await request(app).get('/dashboard/student/userinfo');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('username', 'teststudent');
  });

  test('Parent link status is returned correctly', async () => {
    const res = await request(app).get('/dashboard/student/parent');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('linked');
    expect(res.body).toHaveProperty('parentEmail');
  });
});