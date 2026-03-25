const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { setupTestDB, teardownTestDB } = require('../../utils/testDB'); 

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

// Mock login endpoint a session beállításához
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'teacher1' && password === 'password123') {
    req.session.user = { username, role: 'TEACHER' };
    return res.status(200).send('Logged in');
  }
  return res.status(401).send('Invalid credentials');
});

// Teacher dashboard endpoint
app.get('/dashboard/teacher/data', (req, res) => {
  if (req.session.user && req.session.user.role === 'TEACHER') {
    return res.status(200).json({
      totalStudents: 100,
      totalClasses: 5,
      recentAssignments: ['Assignment 1', 'Assignment 2']
    });
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

describe('Teacher Dashboard Data Integration', () => {
  let teacherSession = null;

  beforeAll(async () => {
    await setupTestDB();

    // Mock login a session megszerzéséhez
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'teacher1', password: 'password123' });
    
    expect(res.statusCode).toBe(200);
    teacherSession = res.headers['set-cookie']; 
  });

  afterAll(async () => {
    await teardownTestDB(); 
  });

  test('GET /dashboard/teacher/data returns dashboard stats', async () => {
    const res = await request(app)
      .get('/dashboard/teacher/data')
      .set('Cookie', teacherSession);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('totalStudents', 100);
    expect(res.body).toHaveProperty('totalClasses', 5);
    expect(res.body).toHaveProperty('recentAssignments');
    expect(Array.isArray(res.body.recentAssignments)).toBe(true);
  });

  test('GET /dashboard/teacher/data unauthorized without login', async () => {
    const res = await request(app)
      .get('/dashboard/teacher/data');

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'Unauthorized');
  });
});