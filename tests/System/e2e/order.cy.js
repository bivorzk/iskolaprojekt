describe('Ordering Flow', () => {
  beforeEach(() => {
    cy.login('student1', 'password123');
  });

  it('Loads menu items', () => {
    cy.request('/orders/menu_items')
      .its('status')
      .should('eq', 200);
  });

  it('Creates order', () => {
    cy.request('POST', '/orders/order/wallet', {
      cart: [{ menuItemId: '1', quantity: 1 }]
    }).its('status').should('eq', 201);
  });
});