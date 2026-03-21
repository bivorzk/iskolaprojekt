const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Ha az auth-middleware nem található, helyettesíthetjük egy mock middleware-el
const app = express();
app.use(express.json());
app.use(session({ secret: 'testsecret', resave: false, saveUninitialized: true }));

// Mock middleware
const requireParentAuth = (req, res, next) => {
  if (req.session.user && (req.session.user.usertype === 'parent' || req.session.user.usertype === 'admin')) {
    return next();
  }
  return res.status(403).json({ error: 'Access denied' });
};

// Mock route protected by parent auth
app.get('/parent-area', requireParentAuth, (req, res) => {
  res.status(200).json({ message: 'Access granted to parent' });
});

describe('Parent Access Middleware', () => {
  it('should deny access if not logged in', async () => {
    const res = await request(app).get('/parent-area');
    expect(res.status).toBe(200);
    expect(res.text).toContain('no_perm');
  });

  it('should deny access if logged in as student', async () => {
    const agent = request.agent(app);
    app.use((req, res, next) => {
      req.session.user = { IsLoggedIn: true, usertype: 'student' };
      next();
    });

    const res = await agent.get('/parent-area');
    expect(res.status).toBe(200);
    expect(res.text).toContain('no_perm');
  });

  it('should deny access if logged in as teacher', async () => {
    const agent = request.agent(app);
    app.use((req, res, next) => {
      req.session.user = { IsLoggedIn: true, usertype: 'teacher' };
      next();
    });

    const res = await agent.get('/parent-area');
    expect(res.status).toBe(200);
    expect(res.text).toContain('no_perm');
  });

  it('should grant access if logged in as parent', async () => {
    const agent = request.agent(app);
    app.use((req, res, next) => {
      req.session.user = { IsLoggedIn: true, usertype: 'parent' };
      next();
    });

    const res = await agent.get('/parent-area');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Access granted to parent' });
  });

  it('should grant access if logged in as admin', async () => {
    const agent = request.agent(app);
    app.use((req, res, next) => {
      req.session.user = { IsLoggedIn: true, usertype: 'admin' };
      next();
    });

    const res = await agent.get('/parent-area');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Access granted to parent' });
  });
});