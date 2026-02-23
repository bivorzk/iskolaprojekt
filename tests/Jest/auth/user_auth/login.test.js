const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');

const router = require('../../../../src/auth/passwordhash');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
app.use('/', router);

describe('LOGIN ROUTE (/login)', () => {
  beforeEach(() => {
    jest.spyOn(bcrypt, 'hash').mockImplementation((pw, salt, cb) => cb(null, 'fakehash'));
    jest.spyOn(bcrypt, 'compare').mockImplementation((pw, h, cb) => cb(null, true));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Successful login', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'user', password: 'TestPass1!' });

    expect(res.statusCode).toBe(200);
  });

  test('Failed login', async () => {
    // Override compare to fail
    jest.spyOn(bcrypt, 'compare').mockImplementation((pw, h, cb) => cb(null, false));

    const res = await request(app)
      .post('/login')
      .send({ username: 'user', password: 'wrong' });

    expect(res.statusCode).toBe(401);
  });
});
