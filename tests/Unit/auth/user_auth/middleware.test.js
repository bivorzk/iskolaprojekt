const express = require('express');
const request = require('supertest');
const bodyParser = require('body-parser'); 
const { configureAuthMiddleware } = require('../../../../src/auth/middleware');

describe('Auth Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();

    configureAuthMiddleware(app);

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    app.get('/test-ip', (req, res) => {
      res.json({ ip: req.clientIp });
    });

    app.post('/test-body', (req, res) => {
      res.json({ body: req.body });
    });
  });

  it('should set req.clientIp from x-forwarded-for header', async () => {
    const res = await request(app)
      .get('/test-ip')
      .set('x-forwarded-for', '1.2.3.4, 5.6.7.8');

    expect(res.statusCode).toBe(200);
    expect(res.body.ip).toBe('1.2.3.4');
  });

  it('should convert ::ffff:192.168.0.1 to 192.168.0.1', async () => {
    const res = await request(app)
      .get('/test-ip')
      .set('x-forwarded-for', '::ffff:192.168.0.1');

    expect(res.statusCode).toBe(200);
    expect(res.body.ip).toBe('192.168.0.1');
  });

  it('should convert ::1 to 127.0.0.1', async () => {
    const res = await request(app)
      .get('/test-ip')
      .set('x-forwarded-for', '::1');

    expect(res.statusCode).toBe(200);
    expect(res.body.ip).toBe('127.0.0.1');
  });

  it('should parse URL-encoded POST body', async () => {
    const res = await request(app)
      .post('/test-body')
      .send('key=value&num=123')
      .set('Content-Type', 'application/x-www-form-urlencoded');

    expect(res.statusCode).toBe(200);
    expect(res.body.body).toEqual({ key: 'value', num: '123' });
  });

  it('should parse JSON POST body', async () => {
    const res = await request(app)
      .post('/test-body')
      .send({ key: 'jsonValue', flag: true })
      .set('Content-Type', 'application/json');

    expect(res.statusCode).toBe(200);
    expect(res.body.body).toEqual({ key: 'jsonValue', flag: true });
  });
});
