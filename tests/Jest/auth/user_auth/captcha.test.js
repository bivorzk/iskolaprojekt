const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Mock a src/auth/validation modult
jest.mock('../../../../src/auth/validation', () => ({
  verifyCaptcha: jest.fn()
}));

const { verifyCaptcha } = require('../../../../src/auth/validation');

describe('CAPTCHA Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(bodyParser.json());

    app.post('/register', async (req, res) => {
      const captchaResponse = req.body['g-recaptcha-response'];
      const result = await verifyCaptcha(captchaResponse, 'dummySecret');
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.status(200).json({ message: 'CAPTCHA passed' });
    });
  });

  it('fails registration with invalid CAPTCHA', async () => {
    verifyCaptcha.mockResolvedValue({ success: false, error: 'Invalid token' });
    const res = await request(app)
      .post('/register')
      .send({ 'g-recaptcha-response': 'badtoken' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid token');
  });

  it('passes registration with valid CAPTCHA', async () => {
    verifyCaptcha.mockResolvedValue({ success: true, score: 0.9 });
    const res = await request(app)
      .post('/register')
      .send({ 'g-recaptcha-response': 'goodtoken' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('CAPTCHA passed');
  });

  it('fails registration when token is missing', async () => {
    verifyCaptcha.mockResolvedValue({ success: false, error: 'Token missing' });
    const res = await request(app)
      .post('/register')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Token missing');
  });
});