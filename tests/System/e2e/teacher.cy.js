describe('Teacher Dashboard', () => {
  beforeEach(() => {
    cy.login('teacher1', 'password123');
  });

  it('Loads teacher data', () => {
    cy.request('/dashboard/teacher/data')
      .its('status')
      .should('eq', 200);
  });

  it('Loads students list', () => {
    cy.request('/dashboard/teacher/students')
      .its('status')
      .should('eq', 200);
  });
});