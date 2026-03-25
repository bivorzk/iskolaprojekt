describe('Student Dashboard', () => {
  beforeEach(() => {
    cy.login('student1', 'password123');
  });

  it('Loads student dashboard', () => {
    cy.visit('/dashboard/student/student.html');
    cy.contains('Orders');
  });

  it('Loads wallet', () => {
    cy.request('/dashboard/student/wallet/balance')
      .its('status')
      .should('eq', 200);
  });
});