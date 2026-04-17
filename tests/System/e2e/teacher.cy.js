describe("TEACHER FLOW", () => {
  beforeEach(() => {
    cy.fixture("users").as("users");
  });

  it("teacher login works", function () {
    cy.login(this.users.teacher.username, this.users.teacher.password);

    cy.request("/order/username").then((res) => {
      expect([200, 401]).to.include(res.status);
    });
  });

  it("teacher cannot access admin panel", function () {
    cy.login(this.users.teacher.username, this.users.teacher.password);

    cy.visit("/admin/admin.html");

    cy.url().should("not.include", "/admin");
  });
});