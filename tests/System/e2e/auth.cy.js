describe('Auth System', () => {
  it('Login works', () => {
    cy.request('POST', '/auth/login', {
      username: 'student1',
      password: 'password123'
    }).its('status').should('eq', 200);
  });

  it('Register works', () => {
    cy.request('POST', '/auth/register', {
      username: 'newuser123',
      password: 'StrongPass123!',
      email: 'test@test.com',
      'g-recaptcha-response': 'test'
    }).its('status').should('eq', 200);
  });
});