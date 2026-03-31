// utils/logger.js — Structured logger using Pino with enhanced slow request tracking
// JSON output in production, pretty-printed in development

const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

// Slow request threshold (in milliseconds) - configurable via environment variable
const SLOW_REQUEST_THRESHOLD = parseInt(process.env.SLOW_REQUEST_THRESHOLD) || 3000;
const SLOW_QUERY_THRESHOLD = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 200;

// Create the base logger
const baseLogger = pino({
    level: isDev ? 'debug' : 'info',
    ...(isDev
        ? {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname',
                    messageFormat: '{level}: {msg}',
                    singleLine: false,
                },
            },
        }
        : {}),
    // Custom timestamps
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    // In production, output raw JSON for log aggregators
    serializers: {
        req: (req) => ({
            method: req.method,
            url: req.url,
            path: req.path,
            params: req.params,
            query: req.query,
            remoteAddress: req.remoteAddress || req.ip,
            userAgent: req.headers?.['user-agent'],
            requestId: req.id,
        }),
        res: (res) => ({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            responseTime: res.responseTime,
        }),
        err: pino.stdSerializers.err,
    },
    // Custom levels for better filtering
    customLevels: {
        slow: 35,
        metric: 25,
    },
    formatters: {
        level(label) {
            return { level: label };
        },
    },
});

// Enhanced logger with slow request detection wrapper
const logger = {
    // Standard log levels
    fatal: (obj, ...args) => baseLogger.fatal(obj, ...args),
    error: (obj, ...args) => baseLogger.error(obj, ...args),
    warn: (obj, ...args) => baseLogger.warn(obj, ...args),
    info: (obj, ...args) => baseLogger.info(obj, ...args),
    debug: (obj, ...args) => baseLogger.debug(obj, ...args),
    trace: (obj, ...args) => baseLogger.trace(obj, ...args),

    // Custom: Slow request logger
    slowRequest: (obj, ...args) => {
        baseLogger.warn({
            ...(typeof obj === 'object' ? obj : { msg: obj }),
            type: 'SLOW_REQUEST',
            threshold: SLOW_REQUEST_THRESHOLD,
        }, ...args);
    },

    // Custom: Slow query logger
    slowQuery: (obj, ...args) => {
        baseLogger.warn({
            ...(typeof obj === 'object' ? obj : { msg: obj }),
            type: 'SLOW_QUERY',
            threshold: SLOW_QUERY_THRESHOLD,
        }, ...args);
    },

    // Custom: Request logging with automatic slow detection
    logRequest: (req, res, duration, startTime) => {
        const logData = {
            method: req.method,
            url: req.url,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            durationMs: duration,
            query: req.query,
            params: req.params,
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers?.['user-agent'],
        };

        // Always log requests in development with duration
        if (isDev) {
            if (duration > SLOW_REQUEST_THRESHOLD) {
                logger.slowRequest({
                    ...logData,
                    message: `🚨 SLOW REQUEST: ${duration}ms (threshold: ${SLOW_REQUEST_THRESHOLD}ms)`,
                });
            } else if (duration > SLOW_QUERY_THRESHOLD) {
                logger.warn({
                    ...logData,
                    message: `⚠️ Request took ${duration}ms (exceeds ${SLOW_QUERY_THRESHOLD}ms threshold)`,
                });
            } else {
                logger.info({
                    ...logData,
                    message: `${req.method} ${req.url} - ${duration}ms`,
                });
            }
        } else {
            // In production, log all requests at info level
            logger.info(logData);
            
            // Still log slow requests as warnings
            if (duration > SLOW_REQUEST_THRESHOLD) {
                logger.slowRequest({
                    ...logData,
                    message: `Slow request detected: ${duration}ms`,
                });
            }
        }
    },

    // Custom: Query logging with slow detection
    logQuery: (query, duration, params) => {
        const logData = {
            query: query.substring(0, 500), // Truncate long queries
            duration: `${duration}ms`,
            durationMs: duration,
            params: params ? JSON.stringify(params).substring(0, 200) : undefined,
        };

        if (duration > SLOW_QUERY_THRESHOLD) {
            logger.slowQuery({
                ...logData,
                message: `🐌 SLOW QUERY: ${duration}ms (threshold: ${SLOW_QUERY_THRESHOLD}ms)`,
            });
        } else if (isDev && duration > 100) {
            logger.debug({
                ...logData,
                message: `Query took ${duration}ms`,
            });
        }
    },

    // Custom: Metric logging (performance metrics)
    logMetric: (name, value, tags = {}) => {
        logger.info({
            type: 'METRIC',
            metric: name,
            value,
            tags,
            timestamp: new Date().toISOString(),
        });
    },

    // Custom: API call logging
    logApiCall: (service, endpoint, duration, status, error = null) => {
        const logData = {
            type: 'API_CALL',
            service,
            endpoint,
            duration: `${duration}ms`,
            durationMs: duration,
            status,
        };

        if (error) {
            logData.error = error.message;
            logger.error(logData);
        } else if (duration > SLOW_QUERY_THRESHOLD) {
            logger.warn({
                ...logData,
                message: `Slow API call to ${service}: ${duration}ms`,
            });
        } else {
            logger.debug(logData);
        }
    },

    // Helper: Create a child logger with additional context
    child: (bindings) => {
        const childLogger = baseLogger.child(bindings);
        return {
            ...logger,
            fatal: (obj, ...args) => childLogger.fatal(obj, ...args),
            error: (obj, ...args) => childLogger.error(obj, ...args),
            warn: (obj, ...args) => childLogger.warn(obj, ...args),
            info: (obj, ...args) => childLogger.info(obj, ...args),
            debug: (obj, ...args) => childLogger.debug(obj, ...args),
            trace: (obj, ...args) => childLogger.trace(obj, ...args),
        };
    },
};

// Middleware to automatically log requests with duration
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const originalEnd = res.end;
    
    // Add request ID for tracking
    req.id = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Capture the end event
    res.end = function(...args) {
        const duration = Date.now() - startTime;
        res.responseTime = duration;
        
        // Log the request
        logger.logRequest(req, res, duration, startTime);
        
        // Call the original end
        originalEnd.apply(this, args);
    };
    
    next();
};

// Export both the logger and the middleware
module.exports = logger;
module.exports.requestLogger = requestLogger;
module.exports.SLOW_REQUEST_THRESHOLD = SLOW_REQUEST_THRESHOLD;
module.exports.SLOW_QUERY_THRESHOLD = SLOW_QUERY_THRESHOLD;