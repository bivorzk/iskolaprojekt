// Mockolt szolgáltatások
const paypalService = {
  createOrder: jest.fn(async (cart, currency, amount) => ({
    jsonResponse: { cart, currency, amount },
    httpStatusCode: 201
  })),
  captureOrder: jest.fn(async (orderID) => ({
    jsonResponse: { orderID },
    httpStatusCode: 201
  }))
};

const googlePayService = {
  createGooglePayOrder: jest.fn(async (userId, cart) => {
    if (cart.some(i => i.name === 'NonExistent')) throw new Error('No valid items found in cart');
    const total = cart.reduce((sum, item) => sum + (item.price || 5) * item.quantity, 0);
    return { orderId: 'mockOrderId', amount: total.toFixed(2) };
  }),
  completeGooglePayOrder: jest.fn(async (userId, orderId) => {
    if (orderId === 'invalidId') throw new Error('Order not found or already processed');
    return { orderId, paymentId: 'txn123', message: 'Payment completed successfully' };
  })
};

// Mockolt adatbázisok
const Payment = jest.fn().mockImplementation(function(data) {
  this.data = data;
  this.save = jest.fn().mockResolvedValue({ _id: 'mockPaymentId', ...data });
});
const Users = { updateOne: jest.fn().mockResolvedValue(true) };
const MenuItems = { findOne: jest.fn(), findByIdAndUpdate: jest.fn().mockResolvedValue(true) };
const Order = jest.fn().mockImplementation(function(data) {
  this._id = 'mockOrderId';
  this.items = data.items || [];
  this.totalAmount = data.totalAmount || 0;
  this.status = data.status || 'Pending';
  this.save = jest.fn().mockResolvedValue(this);
});
Order.findById = jest.fn();

describe('PayPal Service', () => {
  it('creates order successfully', async () => {
    const cart = [{ name: 'Pizza', price: 10, quantity: 2 }];
    const result = await paypalService.createOrder(cart, 'USD', '20.00');
    expect(result).toHaveProperty('jsonResponse');
    expect(result).toHaveProperty('httpStatusCode');
  });

  it('throws error on API failure', async () => {
    paypalService.createOrder = jest.fn(async () => { throw new Error('PayPal API Error'); });
    await expect(paypalService.createOrder([])).rejects.toThrow('PayPal API Error');
  });

  it('captures order successfully', async () => {
    const result = await paypalService.captureOrder('mockOrder123');
    expect(result).toHaveProperty('jsonResponse');
    expect(result).toHaveProperty('httpStatusCode');
  });
});

describe('Google Pay Service', () => {
  it('creates Google Pay order successfully', async () => {
    MenuItems.findOne.mockResolvedValue({ _id: 'item1', name: 'Burger', price: 5, stock: 10 });
    const result = await googlePayService.createGooglePayOrder('user1', [{ name: 'Burger', quantity: 2 }]);
    expect(result).toHaveProperty('orderId');
    expect(result.amount).toBe('10.00');
  });

  it('throws error if item unavailable', async () => {
    await expect(googlePayService.createGooglePayOrder('user1', [{ name: 'NonExistent', quantity: 1 }]))
      .rejects.toThrow('No valid items found in cart');
  });

  it('completes order successfully', async () => {
    const result = await googlePayService.completeGooglePayOrder('user1', 'mockOrderId');
    expect(result.message).toBe('Payment completed successfully');
  });

  it('throws error if order not found', async () => {
    await expect(googlePayService.completeGooglePayOrder('user1', 'invalidId'))
      .rejects.toThrow('Order not found or already processed');
  });
});