const request = require('supertest');
const express = require('express');
const session = require('express-session');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

app.get('/teacher/dashboard', (req, res) => {
  if (req.session.user && req.session.user.role === 'TEACHER') {
    res.status(200).json({ username: 'teacheruser' });
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
});

describe('Teacher Access', () => {
  test('Teacher can access teacher dashboard', async () => {
    const agent = request.agent(app);
    agent.app.request.session = { user: { id: '1', role: 'TEACHER' } };

    const res = await agent.get('/teacher/dashboard');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('username');
  });

  test('Student cannot access teacher route', async () => {
    const agent = request.agent(app);
    agent.app.request.session = { user: { id: '2', role: 'STUDENT' } };

    const res = await agent.get('/teacher/dashboard');
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Access denied/);
  });
});