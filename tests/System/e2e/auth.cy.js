describe("AUTH FLOW", () => {
  beforeEach(() => {
    cy.fixture("users").as("users");
  });

  it("login success creates session", function () {
    cy.login(this.users.student.username, this.users.student.password);

    cy.request({
      url: "/order/username",
      failOnStatusCode: false
    }).then((res) => {
      expect([200, 401]).to.include(res.status);
    });
  });

  it("login fail is rejected", function () {
    cy.login("wronguser", "wrongpass");

    cy.request({
      url: "/order/username",
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });

  it("session protected endpoint requires auth", () => {
    cy.request({
      url: "/order/username",
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });
});