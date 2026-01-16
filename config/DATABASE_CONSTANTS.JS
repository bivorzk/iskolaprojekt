const DISCOUNT_RATES = {
  FIVE: 0.05,
  TEN: 0.10,
  FIFTEEN: 0.15,
  TWENTY: 0.20,
  TWENTY_FIVE: 0.25,
};

const DISCOUNT_TYPES = {
  HEALTHY: 'healthy',
  VEGETARIAN: 'vegetarian',
  FULL_MEAL: 'full_meal',
  DRINK: 'drink',
  DESSERT: 'dessert',
  GENERAL: 'general',
};

const TIERS = {
  NONE: 'none',
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum'
};

function getEasterSundayUTC(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function getGoodFridayUTC(year) {
  const easterSunday = getEasterSundayUTC(year);
  return new Date(Date.UTC(
    easterSunday.getUTCFullYear(),
    easterSunday.getUTCMonth(),
    easterSunday.getUTCDate() - 2
  ));
}

function getEasterMondayUTC(year) {
  const easterSunday = getEasterSundayUTC(year);
  return new Date(Date.UTC(
    easterSunday.getUTCFullYear(),
    easterSunday.getUTCMonth(),
    easterSunday.getUTCDate() + 1
  ));
}

function getWhitMondayUTC(year) {
  const easterSunday = getEasterSundayUTC(year);
  return new Date(Date.UTC(
    easterSunday.getUTCFullYear(),
    easterSunday.getUTCMonth(),
    easterSunday.getUTCDate() + 50
  ));
}


function getHungarianHolidays(year = new Date().getUTCFullYear()) {
  return {
    // Fixed-date holidays
    NEW_YEAR: new Date(Date.UTC(year, 0, 1)),              // Jan 1
    NATIONAL_DAY_1848: new Date(Date.UTC(year, 2, 15)),    // Mar 15
    LABOR_DAY: new Date(Date.UTC(year, 4, 1)),             // May 1
    STATE_FOUNDATION_DAY: new Date(Date.UTC(year, 7, 20)), // Aug 20
    REVOLUTION_1956: new Date(Date.UTC(year, 9, 23)),      // Oct 23
    ALL_SAINTS_DAY: new Date(Date.UTC(year, 10, 1)),       // Nov 1
    CHRISTMAS_DAY_1: new Date(Date.UTC(year, 11, 25)),     // Dec 25
    CHRISTMAS_DAY_2: new Date(Date.UTC(year, 11, 26)),     // Dec 26

    
    GOOD_FRIDAY: getGoodFridayUTC(year),
    EASTER_MONDAY: getEasterMondayUTC(year),
    WHIT_MONDAY: getWhitMondayUTC(year)
  };
}

function getEuropeanHolidays(year = new Date().getUTCFullYear()) {
  return {
    EUROPE_DAY: new Date(Date.UTC(year, 4, 9)),        // May 9
    INTERNATIONAL_WOMENS_DAY: new Date(Date.UTC(year, 2, 8)), // Mar 8
    VALENTINES_DAY: new Date(Date.UTC(year, 1, 14)),   // Feb 14
    HALLOWEEN: new Date(Date.UTC(year, 9, 31)),        // Oct 31
    NEW_YEARS_EVE: new Date(Date.UTC(year, 11, 31))    // Dec 31
  };
}


module.exports = {
  DISCOUNT_RATES,
  DISCOUNT_TYPES,
  TIERS,
  getHungarianHolidays,
  getEuropeanHolidays
};