Cypress.Commands.add('login', (username, password) => {
  cy.request({
    method: 'POST',
    url: '/auth/login',
    body: { username, password }
  }).then((res) => {
    expect(res.status).to.eq(200);
  });
});