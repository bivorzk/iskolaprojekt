describe("STUDENT FLOW", () => {
  beforeEach(() => {
    cy.fixture("users").as("users");
  });

  it("student can access menu", function () {
    cy.login(this.users.student.username, this.users.student.password);

    cy.getMenuItems().then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it("student cannot access admin endpoints", function () {
    cy.login(this.users.student.username, this.users.student.password);

    cy.request({
      url: "/admin",
      failOnStatusCode: false
    }).then((res) => {
      expect([401, 403, 404]).to.include(res.status);
    });
  });
});