const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { setupTestDB, teardownTestDB } = require('../../utils/testDB'); // opcionális helper a tesztadatbázishoz

// Express app setup
const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

// Mock route for the teacher dashboard
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
    await setupTestDB(); // Inicializálja a teszt adatbázist

    // Login mint tanár
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'teacher1', password: 'password123' });
    
    expect(res.statusCode).toBe(200);
    teacherSession = res.headers['set-cookie']; // session cookie
  });

  afterAll(async () => {
    await teardownTestDB(); // Tisztítjuk a teszt adatbázist
  });

  test('GET /dashboard/teacher/data returns dashboard stats', async () => {
    const res = await request(app)
      .get('/dashboard/teacher/data')
      .set('Cookie', teacherSession);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('totalStudents');
    expect(res.body).toHaveProperty('totalClasses');
    expect(res.body).toHaveProperty('recentAssignments');
  });

  test('GET /dashboard/teacher/data unauthorized without login', async () => {
    const res = await request(app)
      .get('/dashboard/teacher/data');

    expect(res.statusCode).toBe(401);
  });
});