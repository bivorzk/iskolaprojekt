describe("SECURITY / ROLE ACCESS", () => {
  beforeEach(() => {
    cy.fixture("users").as("users");
  });

  it("student cannot access admin dashboard", function () {
    cy.login(this.users.student.username, this.users.student.password);

    cy.visit("/admin/admin.html");

    cy.url().should("not.include", "/admin");
  });

  it("admin can access admin dashboard", function () {
    cy.login(this.users.admin.username, this.users.admin.password);

    cy.visit("/admin/admin.html");

    cy.contains("Admin").should("exist");
  });

  it("unauthenticated user redirected/blocked", () => {
    cy.visit("/dashboard/admin");

    cy.request({
      url: "/order/username",
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });
});