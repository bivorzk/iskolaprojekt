const { sendVerificationEmail } = require('../../../src/auth/email_verification');
const sgMail = require('@sendgrid/mail');
const jwt = require('jsonwebtoken');

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202, headers: { 'x-message-id': 'msg123' } }])
}));

describe('Email Verification Integration Tests', () => {
  beforeAll(() => {
    process.env.EMAIL_USER = 'test@example.com';
    process.env.JWT_EMAIL_SECRET = 'emailsecret';

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a JWT token and send verification email', async () => {
    const email = 'user@test.com';
    const verificationCode = 'ABC123';

    const response = await sendVerificationEmail(email, verificationCode);

    expect(sgMail.send).toHaveBeenCalledTimes(1);
    const sentMail = sgMail.send.mock.calls[0][0];
    expect(sentMail.to).toBe(email);
    expect(sentMail.from.email).toBe(process.env.EMAIL_USER);
    expect(sentMail.subject).toMatch(/Email Verification/i);
    expect(sentMail.html).toContain(verificationCode);

    expect(response[0].statusCode).toBe(202);

    const token = sentMail.html.match(/token=([\w-]+)/)?.[1];
    expect(token).toBeDefined();
    const decoded = jwt.verify(token, process.env.JWT_EMAIL_SECRET);
    expect(decoded.email).toBe(email);
  });

  it('should throw error if SendGrid fails', async () => {
    sgMail.send.mockRejectedValueOnce(new Error('SendGrid failed'));

    await expect(sendVerificationEmail('fail@test.com', 'CODE123'))
      .rejects
      .toThrow('Email sending failed');
  });
});