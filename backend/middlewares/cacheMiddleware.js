// middlewares/cacheMiddleware.js — Route-level response caching via Redis
// Usage: router.get('/stats', cacheResponse('stats', 60), controller.getStats)

const { cacheGet, cacheSet } = require('../db/redisClient');

/**
 * Creates middleware that caches the JSON response for a given key/TTL.
 * On cache hit, returns cached response immediately.
 * On cache miss, intercepts res.json() to store the response before sending.
 *
 * @param {string|Function} keyOrFn - Cache key string, or function(req) => string
 * @param {number} ttlSeconds - Cache TTL in seconds (default: 60)
 */
function cacheResponse(keyOrFn, ttlSeconds = 60) {
    return async (req, res, next) => {
        const cacheKey =
            typeof keyOrFn === 'function'
                ? keyOrFn(req)
                : `route:${keyOrFn}:${req.originalUrl}`;

        // Try cache
        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Intercept res.json to cache the response
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cacheSet(cacheKey, body, ttlSeconds).catch(() => { });
            }
            return originalJson(body);
        };

        next();
    };
}

module.exports = { cacheResponse };
