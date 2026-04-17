Cypress.Commands.add("login", (username, password) => {
  cy.request({
    method: "POST",
    url: "/login",
    form: true,
    body: { username, password },
    failOnStatusCode: false
  }).then((res) => {
    expect([200, 302]).to.include(res.status);
  });
});

Cypress.Commands.add("logout", () => {
  cy.request({
    method: "GET",
    url: "/logout",
    failOnStatusCode: false
  });
});

Cypress.Commands.add("getMenuItems", () => {
  return cy.request("/order/menu_items");
});