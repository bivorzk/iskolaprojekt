const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(bodyParser.json());

app.post(
  '/menuitem',
  body('name').trim().escape().isLength({ min: 1 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    res.status(200).json({ sanitizedName: req.body.name });
  }
);

describe('XSS / Input Sanitization', () => {
  it('sanitizes HTML tags', async () => {
    const res = await request(app)
      .post('/menuitem')
      .send({ name: '<script>alert("xss")</script>' });

    expect(res.statusCode).toBe(200);
    // escape() most már a / karaktert &#x2F; formára cseréli
    expect(res.body.sanitizedName).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  });

  it('rejects empty names', async () => {
    const res = await request(app).post('/menuitem').send({ name: '' });
    expect(res.statusCode).toBe(400);
  });
});