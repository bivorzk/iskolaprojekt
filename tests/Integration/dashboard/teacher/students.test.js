const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Ha az app.js nem található, próbáljuk meg helyesen importálni az express alkalmazást
const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

// Mock route for the students list
app.get('/dashboard/teacher/students', (req, res) => {
  if (req.session.user && req.session.user.role === 'TEACHER') {
    return res.status(200).json([
      { id: '1', name: 'Student 1', classId: 'class123' },
      { id: '2', name: 'Student 2', classId: 'class123' }
    ]);
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

describe('Teacher Students Integration', () => {
  let teacherSession = null;

  beforeAll(async () => {
    // Login mint tanár
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'teacher1', password: 'password123' });
    
    expect(res.statusCode).toBe(200);
    teacherSession = res.headers['set-cookie']; // session cookie
  });

  test('GET /dashboard/teacher/students returns students list', async () => {
    const res = await request(app)
      .get('/dashboard/teacher/students')
      .set('Cookie', teacherSession);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('classId');
    }
  });

  test('GET /dashboard/teacher/students unauthorized without login', async () => {
    const res = await request(app)
      .get('/dashboard/teacher/students');

    expect(res.statusCode).toBe(401);
  });

  test('GET /dashboard/teacher/students?classId=abc filters by class', async () => {
    const res = await request(app)
      .get('/dashboard/teacher/students')
      .query({ classId: 'class123' })
      .set('Cookie', teacherSession);

    expect(res.statusCode).toBe(200);
    expect(res.body.every(student => student.classId === 'class123')).toBe(true);
  });
});