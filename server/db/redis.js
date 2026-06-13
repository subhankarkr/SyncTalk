const Redis = require("ioredis");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

// ─── Build a Redis client ─────────────────────────────────────────────────────
const buildRedisClient = (purpose) => {
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) {
    console.warn(`⚠️  UPSTASH_REDIS_URL is missing. Redis ${purpose} client disabled.`);
    return null;
  }
  const client = new Redis(url, {
    tls: { rejectUnauthorized: false },
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 3000),
  });
  client.on("error", (err) => console.error(`Redis ${purpose} Error:`, err.message));
  return client;
};

// ─── Three separate connections ───────────────────────────────────────────────
const redisCache = buildRedisClient("Cache");
const redisPub   = buildRedisClient("Publisher");
const redisSub   = buildRedisClient("Subscriber");

const connectRedis = async () => {
  try {
    if (redisCache) await redisCache.connect();
    if (redisPub)   await redisPub.connect();
    if (redisSub)   await redisSub.connect();
    console.log("✅ Redis clients connected successfully.");
  } catch (err) {
    console.error("❌ Redis connection error:", err.message);
  }
};

// ─── Cache helpers ────────────────────────────────────────────────────────────
const cacheLatestText = async (roomId, text) => {
  try {
    if (redisCache && redisCache.status === "ready") {
      await redisCache.set(`room:${roomId}:latest`, text, "EX", 86400);
    }
  } catch (err) {
    console.error("Failed to cache latest text:", err.message);
  }
};

const getLatestTextFromCache = async (roomId) => {
  try {
    if (redisCache && redisCache.status === "ready") {
      return await redisCache.get(`room:${roomId}:latest`);
    }
  } catch (err) {
    console.error("Redis latest text retrieval failed:", err.message);
  }
  return null;
};

module.exports = {
  redisPub,
  redisSub,
  connectRedis,
  cacheLatestText,
  getLatestTextFromCache,
};
