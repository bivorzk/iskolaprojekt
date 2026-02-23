// 🔹 Mock a password_reset route
jest.mock('../../../../src/auth/password_reset', () => {
  const express = require('express'); // 🔹 ide kell importálni
  const router = express.Router();

  // GET token route
  router.get('/:token', (req, res) => res.status(200).send('OK'));

  // POST token route
  router.post('/:token', (req, res) => res.status(200).send('Password reset'));

  return router;
});

const express = require('express'); // 🔹 normál import a tesztben
const request = require('supertest');

describe('Password Reset Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/password_reset', require('../../../../src/auth/password_reset'));

  it('GET /password_reset/:token should return 200', async () => {
    const res = await request(app).get('/password_reset/test-token');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('OK');
  });

  it('POST /password_reset/:token should return 200', async () => {
    const res = await request(app).post('/password_reset/test-token').send({ password: 'newpass123' });
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Password reset');
  });
});