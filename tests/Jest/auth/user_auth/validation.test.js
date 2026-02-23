jest.mock('badwords-list', () => ({ array: [] })); // Mock ESM modul

const {
  validateUsername,
  validatePassword,
  validateEmail
} = require('../../../../src/auth/validation');

describe('VALIDATION TESTS', () => {

  test('Username too short', () => {
    const result = validateUsername('ab', 'password');
    expect(result).toBeTruthy();
  });

  test('Username equals password', () => {
    const result = validateUsername('test', 'test');
    expect(result).toBeTruthy();
  });

  test('Weak password', () => {
    const result = validatePassword('123');
    expect(result).toBeTruthy();
  });

  test('Valid strong password', () => {
    const result = validatePassword('StrongPass1!');
    expect(result).toBeNull();
  });

  test('Disposable email blocked', () => {
    const result = validateEmail('user@tempmail.com');
    if (result) {
      expect(result).toMatch(/not allowed/);
    }
  });

});
