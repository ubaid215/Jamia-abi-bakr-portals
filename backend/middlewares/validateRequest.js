// middlewares/validateRequest.js — Generic Zod request validation middleware
// Usage: router.post('/login', validate(loginSchema), authController.login)

const { ZodError } = require('zod');

/**
 * Creates a middleware that validates req.body, req.query, and/or req.params
 * against the provided Zod schema object.
 *
 * @param {Object} schema - Object with optional keys: body, query, params
 * @param {import('zod').ZodSchema} [schema.body]
 * @param {import('zod').ZodSchema} [schema.query]
 * @param {import('zod').ZodSchema} [schema.params]
 */
function validate(schema) {
    return (req, res, next) => {
        const errors = [];

        if (schema.body) {
            const result = schema.body.safeParse(req.body);
            if (!result.success) {
                errors.push(...formatErrors(result.error, 'body'));
            } else {
                req.body = result.data; // Use the parsed (and potentially transformed) data
            }
        }

        if (schema.query) {
            const result = schema.query.safeParse(req.query);
            if (!result.success) {
                errors.push(...formatErrors(result.error, 'query'));
            } else {
                req.query = result.data;
            }
        }

        if (schema.params) {
            const result = schema.params.safeParse(req.params);
            if (!result.success) {
                errors.push(...formatErrors(result.error, 'params'));
            } else {
                req.params = result.data;
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors,
            });
        }

        next();
    };
}

/**
 * Formats ZodError into a clean array of field-level error objects.
 */
function formatErrors(zodError, source) {
    // Guard against malformed ZodError
    const errors = zodError?.errors ?? zodError?.issues ?? [];
    return errors.map((err) => ({
        source,
        field: err.path?.join('.') ?? 'unknown',
        message: err.message,
        code: err.code,
    }));
}

module.exports = { validate };
