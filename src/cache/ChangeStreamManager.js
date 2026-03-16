const mongoose = require('mongoose');
const { keyRegistry, COLLECTIONS } = require('./KeyRegistry');

// Lazy-required to avoid circular dependency with cache-service
function getCacheService() {
  return require('../dashboard/services/cache-service');
}



const idExtractors = {
  users:          (doc) => [doc._id],
  menuitems:      (doc) => [doc?.name ?? doc._id],
  dailymenus:     ()    => [null],                               // resolver takes no args
  orders:         (doc) => [doc._id],
  orderitems:     ()    => [],                                   // resolved async below
  payments:       (doc) => [doc?.userId],
  userloyalties:  (doc) => [doc?.userId],
  rewards:        ()    => [null],                               // resolver takes no args
  redemptions:    (doc) => [doc?.userId],
  parentstudents: (doc) => [doc?.parentId, doc?.studentId],     // invalidate both sides
  prekeys:        (doc) => [doc?.userId],
};

async function resolveOrderItemsIds(doc) {
  if (!doc?.orderId) return [];
  try {
    const OrderModel = mongoose.model('Order');
    const order = await OrderModel.findById(doc.orderId).select('userId').lean();
    return order?.userId ? [order.userId] : [];
  } catch {
    return [];
  }
}

// ─── Key Invalidation ─────────────────────────────────────────────────────────

async function invalidateKeys(collectionName, ids) {
  if (!getCacheService().isRedisAvailable()) return;

  const resolver = keyRegistry[collectionName];
  if (!resolver) return;

  const keys = ids.flatMap((id) => {
    try {
      return id == null ? resolver() : resolver(id.toString());
    } catch {
      return [];
    }
  });

  if (keys.length === 0) return;

  try {
    await getCacheService().invalidateCache(keys);
    console.log(`[ChangeStream] Invalidated ${keys.length} key(s) for "${collectionName}"`);
  } catch (err) {
    console.error(`[ChangeStream] Invalidation error for "${collectionName}":`, err.message);
  }
}

// ─── Change Event Handler ─────────────────────────────────────────────────────

function getDocument(change) {
  return change.fullDocument ?? { _id: change.documentKey?._id };
}

const WATCHED_OPS = new Set(['insert', 'update', 'replace', 'delete']);

async function handleChange(collectionName, change) {
  if (!WATCHED_OPS.has(change.operationType)) return;

  const doc = getDocument(change);

  let ids;
  if (collectionName === COLLECTIONS.orderitems) {
    ids = await resolveOrderItemsIds(doc);
  } else {
    const extractor = idExtractors[collectionName];
    ids = extractor ? extractor(doc) : [doc._id];
  }

  const validIds = ids.filter((id) => id != null);
  if (validIds.length > 0) {
    await invalidateKeys(collectionName, validIds);
  }
}

// ─── Stream Lifecycle ─────────────────────────────────────────────────────────

const activeStreams = new Map();

function watchCollection(collectionName) {
  const db = mongoose.connection.db;
  if (!db) return;

  try {
    const stream = db
      .collection(collectionName)
      .watch([], { fullDocument: 'updateLookup' });

    stream.on('change', (change) => handleChange(collectionName, change));

    stream.on('error', (err) => {
      console.error(`[ChangeStream] Error on "${collectionName}":`, err.message);
      activeStreams.delete(collectionName);
      stream.close().catch(() => {});
      // Reconnect after a short backoff
      setTimeout(() => watchCollection(collectionName), 5000);
    });

    stream.on('close', () => {
      console.log(`[ChangeStream] Stream closed for "${collectionName}"`);
      activeStreams.delete(collectionName);
    });

    activeStreams.set(collectionName, stream);
    console.log(`[ChangeStream] Watching "${collectionName}"`);
  } catch (err) {
    console.error(`[ChangeStream] Failed to open stream for "${collectionName}":`, err.message);
  }
}

const WATCHED_COLLECTIONS = [
  COLLECTIONS.users,
  COLLECTIONS.menuitems,
  COLLECTIONS.dailymenus,
  COLLECTIONS.orders,
  COLLECTIONS.orderitems,
  COLLECTIONS.payments,
  COLLECTIONS.userloyalties,
  COLLECTIONS.rewards,
  COLLECTIONS.redemptions,
  COLLECTIONS.parentstudents,
  COLLECTIONS.prekeys,
];

function startChangeStreams() {
  if (mongoose.connection.readyState !== 1) {
    console.warn('[ChangeStream] MongoDB not ready, retrying in 3s...');
    setTimeout(startChangeStreams, 3000);
    return;
  }

  console.log('[ChangeStream] Starting change streams...');
  for (const col of WATCHED_COLLECTIONS) {
    if (!activeStreams.has(col)) {
      watchCollection(col);
    }
  }
}

function stopChangeStreams() {
  for (const [name, stream] of activeStreams) {
    stream.close().catch(() => {});
    console.log(`[ChangeStream] Stopped stream for "${name}"`);
  }
  activeStreams.clear();
}

module.exports = { startChangeStreams, stopChangeStreams };
