// Mockoljuk a SendGrid mail modult
jest.mock('@sendgrid/mail', () => {
  return {
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue([
      {
        statusCode: 202,
        headers: {
          'x-message-id': 'test-message-id-123'
        }
      }
    ])
  };
});

require('dotenv').config();

const sgMail = require('@sendgrid/mail');
const { sendVerificationEmail } = require('../../../../src/auth/email_verification');

describe('Email Verification', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send a verification email', async () => {
    const email = 'test@example.com';
    const token = 'fake-verification-token';

    const response = await sendVerificationEmail(email, token);

    // Ellenőrizzük, hogy a SendGrid send meghívódott
    expect(sgMail.send).toHaveBeenCalledTimes(1);

    // Ellenőrizzük a visszatérési struktúrát
    expect(response[0].statusCode).toBe(202);
    expect(response[0].headers['x-message-id']).toBe('test-message-id-123');
  });

});
