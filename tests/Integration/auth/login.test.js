const request = require('supertest');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');

const User = {
  findOne: jest.fn(),
};

const createSecurityLog = jest.fn().mockResolvedValue(true);

const loginRouter = express.Router();
loginRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).send('Invalid credentials');
    }

    const match = await bcrypt.compare(password, user.password || '');
    if (!match) {
      return res.status(401).send('Invalid credentials');
    }

    req.session.user = { id: user._id, username: user.username };

    res.status(200).send(`Welcome, ${user.username}`);
  } catch (err) {
    await createSecurityLog({ userId: null, action: 'LOGIN_ERROR', details: err.message });
    res.status(500).send('Server error');
  }
});

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
app.use('/auth', loginRouter);

describe('POST /auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if username or password is missing', async () => {
    const res = await request(app).post('/auth/login').send({ username: '' });
    expect(res.statusCode).toBe(400);
    expect(res.text).toBe('Username and password are required');
  });

  it('should return 401 if user does not exist', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app).post('/auth/login').send({ username: 'nouser', password: 'pass' });
    expect(res.statusCode).toBe(401);
    expect(res.text).toBe('Invalid credentials');
  });

  it('should return 401 if password is incorrect', async () => {
    User.findOne.mockResolvedValue({
      _id: '123',
      username: 'testuser',
      password: 'hashedpass',
    });
    const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    const res = await request(app).post('/auth/login').send({ username: 'testuser', password: 'wrongpass' });
    expect(res.statusCode).toBe(401);
    expect(res.text).toBe('Invalid credentials');

    compareSpy.mockRestore();
  });

  it('should return 200 on successful login', async () => {
    User.findOne.mockResolvedValue({
      _id: '123',
      username: 'testuser',
      password: 'hashedpass',
    });
    const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    const res = await request(app).post('/auth/login').send({ username: 'testuser', password: 'hashedpass' });
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Welcome, testuser');

    compareSpy.mockRestore();
  });

  it('should handle server errors gracefully', async () => {
    User.findOne.mockImplementation(() => { throw new Error('DB error'); });
    const res = await request(app).post('/auth/login').send({ username: 'any', password: 'any' });
    expect(res.statusCode).toBe(500);
    expect(res.text).toBe('Server error');
  });
});