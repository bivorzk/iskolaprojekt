const redis = require('redis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

let redisClient;
let isRedisAvailable = false;

try {
  redisClient = redis.createClient({
    url: process.env.REDIS_HOST
  });
  redisClient.on('error', (err) => {
    console.log('Redis Client Error', err);
    isRedisAvailable = false;
  });
  redisClient.on('connect', () => {
    console.log('Redis connected');
    isRedisAvailable = true;
  });
  (async () => {
    try {
      await redisClient.connect();
    } catch (err) {
      console.log('Failed to connect to Redis', err);
      isRedisAvailable = false;
    }
  })();
} catch (err) {
  console.log('Failed to create Redis client', err);
  isRedisAvailable = false;
}

module.exports = { redisClient, isRedisAvailable };