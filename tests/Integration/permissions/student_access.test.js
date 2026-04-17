const request = require('supertest');
const express = require('express');
const session = require('express-session');

const app = express();
app.use(express.json());
app.use(
  session({ secret: 'test', resave: false, saveUninitialized: true })
);

const setSessionUser = (user) => (req, res, next) => {
  req.session.user = user;
  next();
};

app.get('/student/dashboard', (req, res) => {
  if (req.session.user && req.session.user.role === 'STUDENT') {
    res.status(200).json({ username: 'testuser' });
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
});

describe('Student Access', () => {
  test('Student can access student dashboard', async () => {
    const agent = request.agent(app);
    app.use(setSessionUser({ id: '1', role: 'STUDENT' }));

    const res = await agent.get('/student/dashboard');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('username', 'testuser');
  });

  test('Teacher cannot access student route', async () => {
    const agent = request.agent(app);
    app.use(setSessionUser({ id: '2', role: 'TEACHER' }));

    const res = await agent.get('/student/dashboard');
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Access denied/);
  });
});