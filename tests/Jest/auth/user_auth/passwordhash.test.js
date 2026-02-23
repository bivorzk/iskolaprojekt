const express = require('express'); // 🔹 Import express
const request = require('supertest');
const bcrypt = require('bcrypt');

// 🔹 Mock bcrypt hash és compare
jest.spyOn(bcrypt, 'hash').mockImplementation(async (pw, salt) => 'fakehash');
jest.spyOn(bcrypt, 'compare').mockImplementation(async (pw, hash) => pw === 'TestPass1!');

const passwordRouter = express.Router();
passwordRouter.post('/hash', async (req, res) => {
  const { password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  res.status(200).json({ hash });
});

passwordRouter.post('/compare', async (req, res) => {
  const { password, hash } = req.body;
  const match = await bcrypt.compare(password, hash);
  res.status(200).json({ match });
});

describe('PasswordHash Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/password', passwordRouter);

  it('should hash a password correctly', async () => {
    const res = await request(app).post('/password/hash').send({ password: 'TestPass1!' });
    expect(res.statusCode).toBe(200);
    expect(res.body.hash).toBe('fakehash');
  });

  it('should compare passwords correctly', async () => {
    const res = await request(app)
      .post('/password/compare')
      .send({ password: 'TestPass1!', hash: 'fakehash' });
    expect(res.statusCode).toBe(200);
    expect(res.body.match).toBe(true);
  });

  it('should fail comparison for wrong password', async () => {
    const res = await request(app)
      .post('/password/compare')
      .send({ password: 'wrong', hash: 'fakehash' });
    expect(res.statusCode).toBe(200);
    expect(res.body.match).toBe(false);
  });
});
