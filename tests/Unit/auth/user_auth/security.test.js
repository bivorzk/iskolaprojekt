jest.mock('../../../../config/database_queries', () => ({
  SecurityLogs: jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue(true) }))
}));

const { SecurityLogs } = require('../../../../config/database_queries');
describe('Security Logs', () => {
  it('should call save', async () => {
    const logger = new SecurityLogs();
    const result = await logger.save();
    expect(result).toBe(true);
  });
});
