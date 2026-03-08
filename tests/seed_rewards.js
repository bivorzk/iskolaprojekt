/**
 * Reward Shop Seed Script
 * Run: node tests/seed_rewards.js
 *
 * Seeds the Reward collection with cafeteria items.
 * Safe to re-run — skips rewards that already exist by name.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const { Reward } = require('../config/database_queries');

const dbUrl = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

const REWARDS = [
    // --- Drinks ---
    {
        name: 'Water Bottle',
        description: 'Still or sparkling, 500ml',
        category: 'drink',
        pointCost: 300,
        marketValue: 0.60,
        healthScore: 100,        // 20% discount applied → 240 pts effective
        dailyStockLimit: null,
        minTier: 'none',
        isActive: true
    },
    {
        name: 'Fruit Juice',
        description: 'Fresh-pressed apple or orange, 250ml',
        category: 'drink',
        pointCost: 450,
        marketValue: 0.90,
        healthScore: 80,         // 20% discount → 360 pts effective
        dailyStockLimit: null,
        minTier: 'none',
        isActive: true
    },
    {
        name: 'Soft Drink',
        description: 'Cola, lemonade, or sparkling water, 330ml',
        category: 'drink',
        pointCost: 750,
        marketValue: 1.50,
        healthScore: 10,
        dailyStockLimit: null,
        minTier: 'none',
        isActive: true
    },
    {
        name: 'Hot Chocolate',
        description: 'Warm cocoa with milk',
        category: 'drink',
        pointCost: 600,
        marketValue: 1.20,
        healthScore: 30,
        dailyStockLimit: 20,
        minTier: 'none',
        isActive: true
    },
    // --- Fruit ---
    {
        name: 'Banana',
        description: 'Fresh banana',
        category: 'fruit',
        pointCost: 250,
        marketValue: 0.50,
        healthScore: 90,         // 20% discount → 200 pts effective
        dailyStockLimit: null,
        minTier: 'none',
        isActive: true
    },
    {
        name: 'Apple',
        description: 'Fresh seasonal apple',
        category: 'fruit',
        pointCost: 250,
        marketValue: 0.50,
        healthScore: 95,         // 20% discount → 200 pts effective
        dailyStockLimit: null,
        minTier: 'none',
        isActive: true
    },
    {
        name: 'Fruit Cup',
        description: 'Mixed seasonal fruit, 200g',
        category: 'fruit',
        pointCost: 500,
        marketValue: 1.00,
        healthScore: 92,         // 20% discount → 400 pts effective
        dailyStockLimit: null,
        minTier: 'none',
        isActive: true
    },
    // --- Desserts ---
    {
        name: 'Cookie',
        description: 'Homemade chocolate chip or oat cookie',
        category: 'dessert',
        pointCost: 400,
        marketValue: 0.80,
        healthScore: 20,
        dailyStockLimit: 30,
        minTier: 'none',
        isActive: true
    },
    {
        name: 'Cake Slice',
        description: 'Chef\'s choice of the day',
        category: 'dessert',
        pointCost: 900,
        marketValue: 1.80,
        healthScore: 15,
        dailyStockLimit: 15,
        minTier: 'Bronze',
        isActive: true
    },
    {
        name: 'Yoghurt Parfait',
        description: 'Greek yoghurt with granola and berries',
        category: 'dessert',
        pointCost: 700,
        marketValue: 1.40,
        healthScore: 78,         // 20% discount → 560 pts effective
        dailyStockLimit: 20,
        minTier: 'none',
        isActive: true
    },
    // --- Meals / Sides ---
    {
        name: 'Side Salad',
        description: 'Garden salad with choice of dressing',
        category: 'meal',
        pointCost: 1250,
        marketValue: 2.50,
        healthScore: 90,         // 20% discount → 1000 pts effective
        dailyStockLimit: null,
        minTier: 'Silver',
        isActive: true
    },
    {
        name: 'Soup of the Day',
        description: 'Bowl of the cafeteria\'s daily soup',
        category: 'meal',
        pointCost: 1000,
        marketValue: 2.00,
        healthScore: 72,
        dailyStockLimit: 25,
        minTier: 'Bronze',
        isActive: true
    },
    // --- Upgrades ---
    {
        name: 'Drink Upgrade',
        description: 'Upgrade any order drink to a large size',
        category: 'upgrade',
        pointCost: 200,
        marketValue: 0.40,
        healthScore: 0,
        dailyStockLimit: null,
        minTier: 'none',
        isActive: true
    },
    {
        name: 'Meal + Drink Bundle',
        description: 'Free side salad and soft drink with any main',
        category: 'upgrade',
        pointCost: 1750,
        marketValue: 3.50,
        healthScore: 0,
        dailyStockLimit: 10,
        minTier: 'Gold',
        isActive: true
    },
    // --- Mystery ---
    {
        name: 'Mystery Reward Box',
        description: 'A surprise reward — could be a drink, snack, or dessert!',
        category: 'mystery',
        pointCost: 800,
        marketValue: 2.00,
        healthScore: 0,
        dailyStockLimit: 5,
        minTier: 'Silver',
        isActive: true
    },
    // --- Token ---
    {
        name: 'Double Points Token',
        description: 'Earn 2× points on your next order',
        category: 'token',
        pointCost: 500,
        marketValue: 0,          // Goodwill item — no direct cash value
        healthScore: 0,
        dailyStockLimit: 3,
        minTier: 'none',
        isActive: true
    }
];

async function seed() {
    try {
        await mongoose.connect(dbUrl + dbName);
        console.log('Connected to MongoDB');

        let created = 0;
        let skipped = 0;

        for (const rewardData of REWARDS) {
            const existing = await Reward.findOne({ name: rewardData.name });
            if (existing) {
                console.log(`  SKIP  ${rewardData.name} (already exists)`);
                skipped++;
            } else {
                await Reward.create(rewardData);
                console.log(`  CREATE ${rewardData.name}`);
                created++;
            }
        }

        console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

seed();
