const request = require('supertest');
const express = require('express');
const session = require('express-session');
const adminRouter = require('../../../routes/admin'); // Admin router importálása
const { createSecurityLog } = require('../../../auth/security'); // Biztosítsuk, hogy a mock működjön

// Mockolt createSecurityLog függvény
jest.mock('../../../auth/security', () => ({
  createSecurityLog: jest.fn().mockResolvedValue(true), // Mockoljunk egy sikeres választ
}));

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true })); // Session kezelése
app.use('/admin', adminRouter); // Admin router hozzáadása

describe('Admin Access', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Minden teszt előtt töröljük a mockokat
  });

  test('Admin user can access protected route', async () => {
    const agent = request.agent(app);

    // Mock session beállítása admin jogokkal
    agent.app.request.session = { user: { id: '1', role: 'ADMIN' } };

    const res = await agent.get('/admin/dashboard'); // Admin dashboard lekérése
    expect(res.statusCode).toBe(200); // Ellenőrizzük, hogy a válasz státusza 200
    expect(res.body).toHaveProperty('success', true); // Ellenőrizzük, hogy van 'success' mező
  });

  test('Non-admin user cannot access admin route', async () => {
    const agent = request.agent(app);

    // Mock session beállítása nem admin felhasználóval
    agent.app.request.session = { user: { id: '2', role: 'STUDENT' } };

    const res = await agent.get('/admin/dashboard'); // Admin dashboard lekérése nem admin felhasználóval
    expect(res.statusCode).toBe(403); // Ellenőrizzük, hogy a válasz státusza 403 (hozzáférés megtagadva)
    expect(res.body.error).toMatch(/Access denied/); // Ellenőrizzük, hogy van 'Access denied' hibaüzenet
  });
});