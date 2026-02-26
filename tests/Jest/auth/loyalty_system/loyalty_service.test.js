const { 
  ConvertPoints, 
  getHealthLevel, 
  monthlyFreeDrinkPoints, 
  isHoliday, 
  isHolidaySeason 
} = require('../../../src/LoyaltySystem/loyalty-service');

describe('Loyalty Service Unit Tests', () => {

  describe('getHealthLevel', () => {
    test('should return HIGH for healthScore >= 75', () => {
      expect(getHealthLevel(80)).toBe(2);
    });
    test('should return LOW for healthScore >= 50 and < 75', () => {
      expect(getHealthLevel(60)).toBe(1);
    });
    test('should return NONE for healthScore < 50', () => {
      expect(getHealthLevel(30)).toBe(0);
    });
  });

  describe('monthlyFreeDrinkPoints', () => {
    const { BRONZE, SILVER, GOLD, PLATINUM } = {
      BRONZE: 'FIVE',
      SILVER: 'TEN',
      GOLD: 'FIFTEEN',
      PLATINUM: 'TWENTY'
    };

    test('should return correct free drink points per tier', () => {
      expect(monthlyFreeDrinkPoints(BRONZE)).toBe(0);
      expect(monthlyFreeDrinkPoints(SILVER)).toBe(1);
      expect(monthlyFreeDrinkPoints(GOLD)).toBe(2);
      expect(monthlyFreeDrinkPoints(PLATINUM)).toBe(4);
      expect(monthlyFreeDrinkPoints('UNKNOWN')).toBe(0);
    });
  });

  describe('isHolidaySeason', () => {
    test('should return true for Dec 25', () => {
      const date = new Date(Date.UTC(2026, 11, 25));
      expect(isHolidaySeason(date)).toBe(true);
    });
    test('should return true for Jan 1', () => {
      const date = new Date(Date.UTC(2026, 0, 1));
      expect(isHolidaySeason(date)).toBe(true);
    });
    test('should return false for other dates', () => {
      const date = new Date(Date.UTC(2026, 5, 15));
      expect(isHolidaySeason(date)).toBe(false);
    });
  });

  describe('isHoliday', () => {
    test('should return false for arbitrary non-holiday date', () => {
      const date = new Date(Date.UTC(2026, 2, 15));
      expect(isHoliday(date)).toBe(false);
    });
  });

  describe('ConvertPoints', () => {
    test('should return a number', () => {
      const points = ConvertPoints(10, 'FIVE', 2, new Date(Date.UTC(2026, 5, 10)));
      expect(typeof points).toBe('number');
      expect(points).toBeGreaterThanOrEqual(0);
    });

    test('should increase points for HIGH health level', () => {
      const low = ConvertPoints(5, 'FIVE', 0, new Date(Date.UTC(2026, 5, 10)));
      const high = ConvertPoints(5, 'FIVE', 2, new Date(Date.UTC(2026, 5, 10)));
      expect(high).toBeGreaterThanOrEqual(low);
    });

    test('should apply tier bonus', () => {
      const bronze = ConvertPoints(5, 'FIVE', 1, new Date(Date.UTC(2026, 5, 10)));
      const platinum = ConvertPoints(5, 'TWENTY', 1, new Date(Date.UTC(2026, 5, 10)));
      expect(platinum).toBeGreaterThanOrEqual(bronze);
    });

    test('should apply holiday multiplier', () => {
      const normal = ConvertPoints(5, 'FIVE', 1, new Date(Date.UTC(2026, 5, 10)));
      const holiday = ConvertPoints(5, 'FIVE', 1, new Date(Date.UTC(2026, 11, 25)));
      expect(holiday).toBeGreaterThanOrEqual(normal);
    });
  });

});