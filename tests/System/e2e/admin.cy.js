describe('Admin Dashboard', () => {
  beforeEach(() => {
    cy.login('admin1', 'password123');
  });

  it('Gets user count', () => {
    cy.request('/admin/usercount')
      .its('status')
      .should('eq', 202);
  });

  it('Gets system health', () => {
    cy.request('/admin/health')
      .its('status')
      .should('eq', 200);
  });
});