const paypalService = require('../../../src/services/paypal-service');
const googlePayService = require('../../../src/services/googlepay-service');
const { Payment, Users, MenuItems, Order } = require('../../../config/database_queries');

jest.mock('../../../config/database_queries', () => ({
  Payment: jest.fn().mockImplementation(function(data) {
    this.data = data;
    this.save = jest.fn().mockResolvedValue({ _id: 'mockPaymentId', ...data });
  }),
  Users: {
    updateOne: jest.fn().mockResolvedValue(true),
  },
  MenuItems: {
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn().mockResolvedValue(true),
  },
  Order: jest.fn().mockImplementation(function(data) {
    this._id = 'mockOrderId';
    this.items = data.items || [];
    this.totalAmount = data.totalAmount || 0;
    this.status = data.status || 'Pending';
    this.save = jest.fn().mockResolvedValue(this);
  }),
}));

describe('PayPal Service', () => {
  describe('createOrder', () => {
    it('should create an order successfully', async () => {
      const cart = [{ name: 'Pizza', price: 10, quantity: 2 }];
      const result = await paypalService.createOrder(cart, 'USD', '20.00');
      expect(result).toHaveProperty('jsonResponse');
      expect(result).toHaveProperty('httpStatusCode');
    });

    it('should throw an error on API failure', async () => {
      const original = paypalService.createOrder;
      paypalService.createOrder = jest.fn().mockImplementation(() => {
        throw new Error('PayPal API Error');
      });
      await expect(paypalService.createOrder([])).rejects.toThrow('PayPal API Error');
      paypalService.createOrder = original;
    });
  });

  describe('captureOrder', () => {
    it('should capture an order successfully', async () => {
      const orderID = 'mockOrder123';
      const original = paypalService.captureOrder;
      paypalService.captureOrder = jest.fn().mockResolvedValue({ jsonResponse: {}, httpStatusCode: 201 });
      const result = await paypalService.captureOrder(orderID);
      expect(result).toHaveProperty('jsonResponse');
      expect(result).toHaveProperty('httpStatusCode');
      paypalService.captureOrder = original;
    });
  });
});

describe('Google Pay Service', () => {
  describe('createGooglePayOrder', () => {
    it('should create a Google Pay order successfully', async () => {
      MenuItems.findOne.mockResolvedValue({ _id: 'item1', name: 'Burger', price: 5, stock: 10 });
      const cart = [{ name: 'Burger', quantity: 2 }];
      const result = await googlePayService.createGooglePayOrder('user1', cart);
      expect(result).toHaveProperty('orderId');
      expect(result.amount).toBe('10.00');
    });

    it('should throw error if cart has unavailable items', async () => {
      MenuItems.findOne.mockResolvedValue(null);
      await expect(googlePayService.createGooglePayOrder('user1', [{ name: 'NonExistent', quantity: 1 }]))
        .rejects.toThrow('No valid items found in cart');
    });
  });

  describe('completeGooglePayOrder', () => {
    it('should complete a Google Pay order successfully', async () => {
      const mockOrder = new Order({ items: [{ menuItemId: { _id: 'item1' }, quantity: 2 }], totalAmount: 10 });
      Order.findById = jest.fn().mockResolvedValue(mockOrder);
      const result = await googlePayService.completeGooglePayOrder('user1', 'mockOrderId', {}, 'txn123');
      expect(result).toHaveProperty('orderId');
      expect(result).toHaveProperty('paymentId');
      expect(result.message).toBe('Payment completed successfully');
    });

    it('should throw error if order not found', async () => {
      Order.findById = jest.fn().mockResolvedValue(null);
      await expect(googlePayService.completeGooglePayOrder('user1', 'invalidId', {}, 'txn123'))
        .rejects.toThrow('Order not found or already processed');
    });
  });
});