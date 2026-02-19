// db/redisClient.js — Redis connection with graceful fallback
// If Redis is unavailable, the app continues to work without caching.

let redis = null;
let redisAvailable = false;

try {
    const config = require('../config/config');

    if (config.REDIS_URL) {
        const Redis = require('ioredis');

        redis = new Redis(config.REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 5) return null; // Stop retrying after 5 attempts
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true,
        });

        redis.on('connect', () => {
            redisAvailable = true;
            console.log('✅ Redis connected');
        });

        redis.on('error', (err) => {
            redisAvailable = false;
            // Don't spam logs — only log on first disconnect
            if (redis.listenerCount('error') <= 1) {
                console.warn('⚠️  Redis unavailable — running without cache:', err.message);
            }
        });

        redis.on('close', () => {
            redisAvailable = false;
        });

        // Attempt connection (non-blocking)
        redis.connect().catch(() => {
            console.warn('⚠️  Redis connection failed — running without cache');
        });
    } else {
        console.log('ℹ️  REDIS_URL not set — running without cache');
    }
} catch (err) {
    console.warn('⚠️  Redis initialization skipped:', err.message);
}

/**
 * Safe Redis GET — returns null if Redis is unavailable
 */
async function cacheGet(key) {
    if (!redis || !redisAvailable) return null;
    try {
        const value = await redis.get(key);
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
}

/**
 * Safe Redis SET with TTL — silently fails if Redis is unavailable
 */
async function cacheSet(key, value, ttlSeconds = 300) {
    if (!redis || !redisAvailable) return;
    try {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {
        // Silently fail
    }
}

/**
 * Safe Redis DEL — invalidate cache entry
 */
async function cacheDel(key) {
    if (!redis || !redisAvailable) return;
    try {
        await redis.del(key);
    } catch {
        // Silently fail
    }
}

/**
 * Invalidate all keys matching a pattern (e.g., "user:*")
 */
async function cacheDelPattern(pattern) {
    if (!redis || !redisAvailable) return;
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch {
        // Silently fail
    }
}

/**
 * Health check for Redis connection
 */
async function redisHealthCheck() {
    if (!redis || !redisAvailable) {
        return { status: 'disconnected', message: 'Redis not configured or unavailable' };
    }
    try {
        const start = Date.now();
        await redis.ping();
        return { status: 'connected', latency: `${Date.now() - start}ms` };
    } catch (err) {
        return { status: 'error', message: err.message };
    }
}

// Graceful shutdown
async function disconnectRedis() {
    if (redis) {
        try {
            await redis.quit();
        } catch {
            // Already disconnected
        }
    }
}

process.on('SIGINT', disconnectRedis);
process.on('SIGTERM', disconnectRedis);

module.exports = {
    cacheGet,
    cacheSet,
    cacheDel,
    cacheDelPattern,
    redisHealthCheck,
    disconnectRedis,
    get isAvailable() { return redisAvailable; },
};
