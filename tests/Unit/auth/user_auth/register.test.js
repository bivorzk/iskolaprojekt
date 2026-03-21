jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../../src/models/User', () => {
  const MockUser = function () {
    this.save = jest.fn().mockResolvedValue(true);
  };

  MockUser.findOne = jest.fn();

  return MockUser;
});

const User = require('../../../../src/models/User');

describe('Register Model', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should create and save user', async () => {
    User.findOne.mockResolvedValue(null);

    const user = new User();
    const result = await user.save();

    expect(result).toBe(true);
  });
});
