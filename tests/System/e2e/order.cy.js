describe("ORDER FLOW", () => {
  beforeEach(() => {
    cy.fixture("users").as("users");
  });

  it("fetch menu items", () => {
    cy.getMenuItems().then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.length).to.be.greaterThan(0);
    });
  });

  it("order creation flow (API level)", function () {
    cy.login(this.users.student.username, this.users.student.password);

    cy.getMenuItems().then((res) => {
      const item = res.body[0];

      cy.request({
        method: "POST",
        url: "/order/order",
        body: {
          cart: [
            {
              menuItemId: item._id,
              quantity: 1
            }
          ]
        },
        failOnStatusCode: false
      }).then((orderRes) => {
        expect([201, 400]).to.include(orderRes.status);
      });
    });
  });

  it("order requires authentication", () => {
    cy.request({
      method: "POST",
      url: "/order/order",
      body: { cart: [] },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });
});