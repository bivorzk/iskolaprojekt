const {DISCOUNT_RATES, DISCOUNT_TYPES, TIERS, getHungarianHolidays, getEuropeanHolidays} = require('../../config/DATABASE_CONSTANTS.JS');
const {Payment, Order, UserLoyalty, MenuItems} = require('../../config/database_queries.js');
// const {User} = require ('../models/User'); // Unused import 

const HEALTH_LEVELS = {
    NONE: 0,
    LOW: 1,
    HIGH: 2
};

const HOLIDAY_SEASON = {
    START_MONTH: 11, // December
    START_DAY: 25,
    END_MONTH: 0, // January
    END_DAY: 1
};

function getHealthLevel(healthScore) {
    if (healthScore >= 75) return HEALTH_LEVELS.HIGH;
    if (healthScore >= 50) return HEALTH_LEVELS.LOW;
    return HEALTH_LEVELS.NONE;
}


const TIER = {
    NONE: 'NONE',
    BRONZE: 'FIVE',
    SILVER: 'TEN',
    GOLD: 'FIFTEEN',
    PLATINUM: 'TWENTY',
};

function monthlyFreeDrinkPoints(tier) {
    switch (tier) {
        case TIER.BRONZE:
            return 0;
        case TIER.SILVER:
            return 1;
        case TIER.GOLD:
            return 2;
        case TIER.PLATINUM:
            return 4;
        default:
            return 0;
    }
}

// if returns true holiday bonus applies 
function isHoliday(date) {
    const year = date.getUTCFullYear();
    const holidays = [
        ...Object.values(getHungarianHolidays(year)),
        ...Object.values(getEuropeanHolidays(year))
    ].map(d => d.toDateString());
    return holidays.includes(date.toDateString());
}

function isHolidaySeason(date) {
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    if (month === HOLIDAY_SEASON.START_MONTH && day >= HOLIDAY_SEASON.START_DAY) return true; // Dec 25-31
    if (month === HOLIDAY_SEASON.END_MONTH && day === HOLIDAY_SEASON.END_DAY) return true; // Jan 1
    return false;
}

function ConvertPoints(dollarAmount, tier, healthLevel, date) {
    let total = 0;

    // Calculate base points (4-9 points per dollar)
    for (let i = 0; i < Math.floor(dollarAmount); i++) {
        total += Math.floor(Math.random() * 6) + 4; // 4-9 points per dollar
    }
    
    // Handle fractional dollars (e.g., $1.50 gets 50% chance of extra points)
    const fractionalPart = dollarAmount - Math.floor(dollarAmount);
    if (fractionalPart > 0 && Math.random() < fractionalPart) {
        total += Math.floor(Math.random() * 6) + 4;
    }
    
    if (isHoliday(date)) total *= 1.5;
    else if (isHolidaySeason(date)) total *= 1.2; // 20% increase during holiday season
    total *= 1 + (healthLevel * 0.2); // 0%, 20%, 40% bonus

    const tierBonus = DISCOUNT_RATES[tier] || 0;
    total *= 1 + tierBonus;

    return Math.floor(total);
}





// Testing

function getRandomDateIn2026() {
    const start = new Date(Date.UTC(2026, 0, 1));
    const end = new Date(Date.UTC(2026, 11, 31));
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}


async function runLoyaltyTest() {
    const menuItems = await MenuItems.find({}).limit(35).lean(); 

    for (let tier of Object.values(TIER)) {
        const tierDisplay = Object.keys(TIER).find(key => TIER[key] === tier);
        console.log(`\nTier: ${TIERS[tierDisplay]}`);
        
        for (let item of menuItems) {
            const healthLevel = getHealthLevel(item.healthScore);
            const points = ConvertPoints(item.price, tier, healthLevel, getRandomDateIn2026());
            console.log(`${item.name} ($${item.price}, Health: ${item.healthScore}, Level: ${healthLevel}): ${points} points`);
        }
    }
}

// runLoyaltyTest().catch(console.error);


module.exports = {
    ConvertPoints,
    getHealthLevel,
    monthlyFreeDrinkPoints,
    isHoliday,
    isHolidaySeason
}