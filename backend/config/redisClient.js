// db/redisClient.js
const { createClient } = require('redis');
const config = require('../config/config');
const logger = require('../utils/logger');

let redisClient = null;
let isConnected = false;

if (config.redisEnabled) {
    redisClient = createClient({
        url: config.REDIS_URL,
        socket: {
            // Retry connection with backoff — don't crash if Redis is temporarily down
            reconnectStrategy: (retries) => {
                if (retries > 10) {
                    logger.error('Redis: max reconnection attempts reached, giving up');
                    return false; // stop retrying
                }
                const delay = Math.min(retries * 100, 3000);
                logger.warn(`Redis: reconnecting in ${delay}ms (attempt ${retries})`);
                return delay;
            },
            connectTimeout: 5000,
        },
        // Production TLS — Redis Cloud / Railway / Render all require this
        ...(config.isProd && {
            socket: {
                tls: config.REDIS_URL.startsWith('rediss://'), // rediss:// = TLS
                rejectUnauthorized: false, // needed for self-signed certs on some providers
                reconnectStrategy: (retries) => {
                    if (retries > 10) return false;
                    return Math.min(retries * 100, 3000);
                },
            },
        }),
    });

    redisClient.on('connect', () => {
        isConnected = true;
        logger.info('Redis: connected');
    });

    redisClient.on('ready', () => {
        logger.info('Redis: ready to accept commands');
    });

    redisClient.on('error', (err) => {
        isConnected = false;
        // Log but don't crash — app works without Redis
        logger.error({ err: err.message }, 'Redis: connection error');
    });

    redisClient.on('end', () => {
        isConnected = false;
        logger.warn('Redis: connection closed');
    });

    // Connect async — server starts regardless of Redis status
    redisClient.connect().catch((err) => {
        logger.error({ err: err.message }, 'Redis: initial connection failed — running without cache');
    });
}

// ── Cache helpers ──────────────────────────────────────────

/**
 * Get a cached value. Returns null on miss or if Redis is unavailable.
 */
async function cacheGet(key) {
    if (!redisClient || !isConnected) return null;
    try {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
    } catch (err) {
        logger.warn({ err: err.message, key }, 'Redis: cacheGet failed');
        return null; // graceful degradation
    }
}

/**
 * Set a cached value with optional TTL in seconds (default: 5 minutes).
 */
async function cacheSet(key, value, ttlSeconds = 300) {
    if (!redisClient || !isConnected) return;
    try {
        await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
        logger.warn({ err: err.message, key }, 'Redis: cacheSet failed');
    }
}

/**
 * Delete a cached key (call after mutations to invalidate stale data).
 */
async function cacheDel(key) {
    if (!redisClient || !isConnected) return;
    try {
        await redisClient.del(key);
    } catch (err) {
        logger.warn({ err: err.message, key }, 'Redis: cacheDel failed');
    }
}

/**
 * Delete all keys matching a pattern e.g. 'at-risk:*'
 */
async function cacheDelPattern(pattern) {
    if (!redisClient || !isConnected) return;
    try {
        // SCAN is non-blocking unlike KEYS — safe for production
        let cursor = 0;
        do {
            const result = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = result.cursor;
            if (result.keys.length > 0) {
                await redisClient.del(result.keys);
            }
        } while (cursor !== 0);
    } catch (err) {
        logger.warn({ err: err.message, pattern }, 'Redis: cacheDelPattern failed');
    }
}

/**
 * Health check for /health endpoint.
 */
async function redisHealthCheck() {
    if (!redisClient) {
        return { status: 'disabled', message: 'REDIS_URL not configured' };
    }
    if (!isConnected) {
        return { status: 'disconnected', message: 'Redis unreachable' };
    }
    try {
        const start = Date.now();
        await redisClient.ping();
        return { status: 'connected', latency: `${Date.now() - start}ms` };
    } catch {
        return { status: 'error', message: 'PING failed' };
    }
}

module.exports = {
    redisClient,
    cacheGet,
    cacheSet,
    cacheDel,
    cacheDelPattern,
    redisHealthCheck,
};