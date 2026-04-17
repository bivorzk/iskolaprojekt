const request = require('supertest');
const express = require('express');
const session = require('express-session');

const app = express();
app.use(express.json());
app.use(session({ secret: 'testsecret', resave: false, saveUninitialized: true }));

const requireParentAuth = (req, res, next) => {
  if (req.session.user && (req.session.user.usertype === 'parent' || req.session.user.usertype === 'admin')) {
    return next();
  }
  return res.status(403).json({ error: 'Access denied' });
};

app.get('/parent-area', requireParentAuth, (req, res) => {
  res.status(200).json({ message: 'Access granted to parent' });
});

const setSessionUser = (user) => (req, res, next) => {
  req.session.user = user;
  next();
};

describe('Parent Access Middleware', () => {
  it('should deny access if not logged in', async () => {
    const res = await request(app).get('/parent-area');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Access denied' });
  });

  it('should deny access if logged in as student', async () => {
    app.use(setSessionUser({ IsLoggedIn: true, usertype: 'student' }));
    const res = await request(app).get('/parent-area');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Access denied' });
  });

  it('should deny access if logged in as teacher', async () => {
    app.use(setSessionUser({ IsLoggedIn: true, usertype: 'teacher' }));
    const res = await request(app).get('/parent-area');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Access denied' });
  });

  it('should grant access if logged in as parent', async () => {
    app.use(setSessionUser({ IsLoggedIn: true, usertype: 'parent' }));
    const res = await request(app).get('/parent-area');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Access granted to parent' });
  });

  it('should grant access if logged in as admin', async () => {
    app.use(setSessionUser({ IsLoggedIn: true, usertype: 'admin' }));
    const res = await request(app).get('/parent-area');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Access granted to parent' });
  });
});