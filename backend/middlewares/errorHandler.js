// middlewares/errorHandler.js — Centralized error handling middleware
// Handles Prisma, JWT, Multer, Zod, and generic errors.

const { ZodError } = require('zod');
const logger = require('../utils/logger');

/**
 * Custom application error class with HTTP status code.
 */
class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Centralized error handler middleware.
 * Must be registered LAST in the middleware chain (4 arguments).
 */
function errorHandler(err, req, res, _next) {
    // Default values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let details = null;

    // ---- Zod Validation Errors ----
    if (err instanceof ZodError) {
        statusCode = 400;
        message = 'Validation failed';
        details = err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
        }));
    }

    // ---- Prisma Errors ----
    else if (err.code && err.code.startsWith('P')) {
        switch (err.code) {
            case 'P2002': {
                statusCode = 409;
                const field = err.meta?.target?.join(', ') || 'field';
                message = `Duplicate value for ${field}`;
                break;
            }
            case 'P2025':
                statusCode = 404;
                message = 'Record not found';
                break;
            case 'P2003':
                statusCode = 400;
                message = 'Referenced record does not exist';
                break;
            default:
                statusCode = 500;
                message = 'Database error';
        }
    }

    // ---- JWT Errors ----
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired. Please login again.';
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    // ---- Multer Errors ----
    else if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 413;
        message = 'File too large';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        statusCode = 400;
        message = 'Unexpected file upload field';
    }

    // ---- CORS Errors ----
    else if (err.message && err.message.includes('CORS')) {
        statusCode = 403;
        message = 'Cross-origin request blocked';
        // DO NOT leak allowedOrigins
    }

    // Log the error
    if (statusCode >= 500) {
        logger.error({ err, req: { method: req.method, url: req.url } }, message);
    } else {
        logger.warn({ statusCode, url: req.url }, message);
    }

    // Send response
    const response = {
        error: message,
        ...(details && { details }),
        ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && {
            stack: err.stack,
        }),
    };

    res.status(statusCode).json(response);
}

module.exports = { AppError, errorHandler };
