describe('Security Tests', () => {
  it('Blocks unauthorized student route', () => {
    cy.request({
      url: '/dashboard/student/student.html',
      failOnStatusCode: false
    }).its('status').should('not.eq', 200);
  });

  it('Blocks admin without login', () => {
    cy.request({
      url: '/admin/usercount',
      failOnStatusCode: false
    }).its('status').should('eq', 403);
  });
});