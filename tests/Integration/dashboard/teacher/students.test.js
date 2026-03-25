const request = require('supertest');
const express = require('express');
const session = require('express-session');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'teacher1' && password === 'password123') {
    req.session.user = { username, role: 'TEACHER' };
    return res.status(200).send('Logged in');
  }
  return res.status(401).send('Invalid credentials');
});

app.get('/dashboard/teacher/students', (req, res) => {
  if (!(req.session.user && req.session.user.role === 'TEACHER')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const allStudents = [
    { id: '1', name: 'Student 1', classId: 'class123' },
    { id: '2', name: 'Student 2', classId: 'class123' },
    { id: '3', name: 'Student 3', classId: 'class456' }
  ];

  const { classId } = req.query;
  const filteredStudents = classId
    ? allStudents.filter(s => s.classId === classId)
    : allStudents;

  return res.status(200).json(filteredStudents);
});

describe('Teacher Students Integration', () => {
  let teacherSession = null;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'teacher1', password: 'password123' });
    
    expect(res.statusCode).toBe(200);
    teacherSession = res.headers['set-cookie']; 
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
    expect(res.body).toHaveProperty('error', 'Unauthorized');
  });

  test('GET /dashboard/teacher/students?classId=class123 filters by class', async () => {
    const res = await request(app)
      .get('/dashboard/teacher/students')
      .query({ classId: 'class123' })
      .set('Cookie', teacherSession);

    expect(res.statusCode).toBe(200);
    expect(res.body.every(student => student.classId === 'class123')).toBe(true);
  });
});