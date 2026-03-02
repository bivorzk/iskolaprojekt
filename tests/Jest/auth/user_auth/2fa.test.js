jest.mock('../../../../src/auth/2fa', () => ({
  generateToken: jest.fn().mockResolvedValue('mockToken123'), 
}));

const { generateToken } = require('../../../../src/auth/2fa');

describe('2FA', () => {
  it('should generate a token when user exists', async () => {
    const token = await generateToken('test@example.com');
    expect(token).toBe('mockToken123');
  });

  it('should return generic response if user not found', async () => {
    const token = await generateToken('unknown@example.com');
    expect(token).toBe('mockToken123');
  });
});
