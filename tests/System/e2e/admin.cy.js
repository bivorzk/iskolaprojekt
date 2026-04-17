describe("ADMIN DASHBOARD", () => {
  beforeEach(() => {
    cy.fixture("users").as("users");
  });

  it("admin loads dashboard", function () {
    cy.login(this.users.admin.username, this.users.admin.password);

    cy.visit("/admin/admin.html");

    cy.contains("Admin").should("exist");
  });

  it("menu items visible in admin context", function () {
    cy.login(this.users.admin.username, this.users.admin.password);

    cy.request("/order/menu_items").then((res) => {
      expect(res.status).to.eq(200);
    });
  });
});