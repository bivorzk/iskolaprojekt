const keyRegistry = {

  users: (userId) => [
    `user:username:${userId}`,
    `student:userinfo:${userId}`,
    'admin:usercount',
    'admin:userlist',
    'admin:activeusers',
    'admin:signup-stats',
    'admin:stats',
    'editor:usercount',
    'editor:activeusers',
  ],

  menuitems: (itemName) => [
    `menu_item:${itemName}`,
    'admin:menulist',
    'admin:itemcount',
    'admin:stockalerts',
    'admin:soldout',
    'admin:menuitem_export',
    'editor:menulist',
    'editor:itemcount',
  ],

  dailymenus: () => [
    'daily_menu:available',
    'admin:menulist',
    'editor:menulist',
  ],

  orders: (orderId) => [
    `order:${orderId}`,
    'admin:orders',
    'editor:orders',
    'admin:most_bought_items_alltime',
    'admin:most_bought_items_lastweek',
    'admin:average_order_value',
  ],

  orderitems: (userId) => [
    `student:order_history:${userId}`,
    `parent:orders:${userId}`,
  ],

  payments: (userId) => [
    `student:transactions:${userId}`,
    `parent:transactions:${userId}`,
    'admin:paymentstats',
    'admin:revenue_lastmonth',
    'admin:total_revenue',
    'admin:stats',
  ],

  userloyalties: (userId) => [
    `student:loyalty:${userId}`,
    `loyalty:rewards:${userId}`,
    `wallet:user:${userId}`,
    `student:wallet_balance:${userId}`,
    `student:wallet:${userId}`,
    'admin:totalpoints',
    'editor:totalpoints',
    `parent:stats:${userId}`,
  ],

  rewards: () => [
    'admin:rewards_list',
    'admin:reward_stats',
    'editor:rewards_list',
    'editor:reward_stats',
  ],

  redemptions: (userId) => [
    `student:loyalty:${userId}`,
    `loyalty:rewards:${userId}`,
    'admin:reward_stats',
    'editor:reward_stats',
  ],

  parentstudents: (userId) => [
    `parent:studentlist:${userId}`,
    `parent:welcome:${userId}`,
    `parent:link-requests:${userId}`,
    `parent:stats:${userId}`,
  ],

  prekeys: (userId) => [
    `e2ee:pubkey:${userId}`,
  ],

    // ———————————— Does not fit into any collection, but still requires caching —————————————————— //

  verification: (email) => [
    `verification:${email}`,
  ],

  loginAttempts: (ip) => [
    `login_attempts:${ip}`,
  ],

  regAttempts: (ip) => [
    `reg_attempts:${ip}`,
  ],

  rateLimit: (role, identifier) => [
    `ratelimit:${role}:${identifier}`,
  ],

  chatRateLimit: (userId) => [
    `rate_limit:user:${userId}`,
  ],

  system: () => [
    'system:health',
  ],

};

const COLLECTIONS = {
  users:          'users',
  menuitems:      'menuitems',
  dailymenus:     'dailymenus',
  orders:         'orders',
  orderitems:     'orderitems',
  payments:       'payments',
  userloyalties:  'userloyalties',
  rewards:        'rewards',
  redemptions:    'redemptions',
  parentstudents: 'parentstudents',
  prekeys:        'prekeys',
  messages:       'messages',
  securitylogs:   'securitylogs',
};

function getKeysForChange(collectionName, docId) {
  const modelName = COLLECTIONS[collectionName];
  if (!modelName) return [];
  
  const resolver = keyRegistry[modelName];
  if (!resolver) return [];

  return [...new Set(resolver(docId.toString()))];
}

module.exports = { getKeysForChange, keyRegistry, COLLECTIONS };