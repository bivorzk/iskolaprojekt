const redisLuaService = require('./services/redis-lua-service');

/**
 * Example usage of Redis Lua scripting functionality
 * This file demonstrates how to use the Lua scripts for common operations
 */

/**
 * Example usage of Redis Lua scripting functionality
 * This file demonstrates how to use the Lua scripts for common operations
 * including dashboard integrations
 */

async function demonstrateLuaScripting() {
  try {
    // Wait for service initialization
    await redisLuaService.initialize();

    console.log('=== Redis Lua Scripting Demo ===\n');

    // Example 1: Wallet balance operations (as used in student dashboard)
    console.log('1. Wallet Balance Operations (Student Dashboard):');
    const walletKey = 'wallet:user:123';

    // Get initial balance
    let balance = await redisLuaService.getWalletBalance(walletKey);
    console.log(`Initial balance: $${balance}`);

    // Add money to wallet (like /dashboard/student/wallet/add endpoint)
    balance = await redisLuaService.updateWalletBalance(walletKey, 100);
    console.log(`After adding $100: $${balance}`);

    // Try to deduct more than available (should fail)
    try {
      await redisLuaService.updateWalletBalance(walletKey, -150);
    } catch (error) {
      console.log(`Expected error: ${error.message}`);
    }

    // Deduct valid amount
    balance = await redisLuaService.updateWalletBalance(walletKey, -50);
    console.log(`After deducting $50: $${balance}\n`);

    // Example 2: Order processing with inventory (as used in Order routes)
    console.log('2. Order Processing with Inventory (Order Routes):');
    const inventoryKey = 'inventory:item:456';
    const orderKey = 'order:789';

    // Set initial inventory (normally done elsewhere)
    const redisLua = require('./redis-lua');
    await redisLua.client.set(inventoryKey, '10'); // 10 items in stock

    // Get initial stock
    let stock = await redisLuaService.getInventoryStock(inventoryKey);
    console.log(`Initial stock: ${stock} items`);

    // Process an order (like /Order/wallet endpoint)
    const orderResult = await redisLuaService.processOrder(
      inventoryKey,
      walletKey,
      orderKey,
      2, // quantity
      15, // price per item
      'user123' // user ID
    );

    console.log(`Order processed successfully:`);
    console.log(`- New stock: ${orderResult.newStock} items`);
    console.log(`- New balance: $${orderResult.newBalance}`);
    console.log(`- Order ID: ${orderResult.orderId}\n`);

    // Example 3: Rate limiting (as used in dashboard routes)
    console.log('3. Rate Limiting (Dashboard Routes):');

    // Simulate admin dashboard rate limiting (30 requests per minute)
    console.log('Admin Dashboard Rate Limiting (30 req/min):');
    const adminRateLimitKey = 'ratelimit:admin:user123';
    for (let i = 1; i <= 32; i++) {
      const rateLimitResult = await redisLuaService.checkRateLimit(adminRateLimitKey, 60, 30);
      console.log(`Admin request ${i}: ${rateLimitResult.allowed ? 'ALLOWED' : 'BLOCKED'} (count: ${rateLimitResult.currentCount})`);

      if (!rateLimitResult.allowed) break;
    }

    console.log('\nStudent Dashboard Rate Limiting (60 req/min):');
    // Simulate student dashboard rate limiting (60 requests per minute)
    const studentRateLimitKey = 'ratelimit:student:user456';
    for (let i = 1; i <= 62; i++) {
      const rateLimitResult = await redisLuaService.checkRateLimit(studentRateLimitKey, 60, 60);
      console.log(`Student request ${i}: ${rateLimitResult.allowed ? 'ALLOWED' : 'BLOCKED'} (count: ${rateLimitResult.currentCount})`);

      if (!rateLimitResult.allowed) break;
    }

    // Example 4: Complex scenario - Multiple wallet operations
    console.log('\n4. Complex Scenario - Multiple Wallet Operations:');
    const userWallets = ['wallet:user:100', 'wallet:user:101', 'wallet:user:102'];

    // Initialize wallets
    for (const wallet of userWallets) {
      await redisLuaService.updateWalletBalance(wallet, 0); // Set to 0
      await redisLuaService.updateWalletBalance(wallet, 50); // Add 50
    }

    console.log('Initialized 3 user wallets with $50 each');

    // Simulate concurrent operations (in real app, these would be separate requests)
    const operations = [
      { wallet: userWallets[0], amount: 25, description: 'Purchase item A' },
      { wallet: userWallets[1], amount: -10, description: 'Refund' },
      { wallet: userWallets[2], amount: 75, description: 'Top up' },
    ];

    for (const op of operations) {
      try {
        const newBalance = await redisLuaService.updateWalletBalance(op.wallet, op.amount);
        console.log(`${op.description}: ${op.amount > 0 ? '+' : ''}$${op.amount} = $${newBalance}`);
      } catch (error) {
        console.log(`${op.description}: FAILED - ${error.message}`);
      }
    }

    console.log('\n=== Dashboard Integration Summary ===');
    console.log('✅ Student Dashboard:');
    console.log('   - /wallet/balance: Redis-backed balance retrieval');
    console.log('   - /wallet/add: Atomic balance updates with Lua');
    console.log('   - Rate limiting: 60 requests per minute');
    console.log('✅ Admin Dashboard:');
    console.log('   - Rate limiting: 30 requests per minute');
    console.log('✅ Order Routes:');
    console.log('   - /Order/wallet: Atomic order processing with inventory');
    console.log('   - Payment capture: Redis inventory management');

    console.log('\n=== Demo completed successfully ===');

  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Export for use in other files
module.exports = {
  demonstrateLuaScripting
};

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateLuaScripting().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}