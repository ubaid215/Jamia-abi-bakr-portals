// utils/pagination.js — Cursor-based and offset pagination utilities
// Provides standardized pagination response format across all list endpoints.

/**
 * Build Prisma pagination args from query parameters.
 * Supports both offset-based (page/limit) and cursor-based (cursor/limit) pagination.
 *
 * Usage:
 *   const { paginationArgs, buildResponse } = parsePagination(req.query);
 *   const items = await prisma.model.findMany({ ...paginationArgs, where: { ... } });
 *   const total = await prisma.model.count({ where: { ... } });
 *   res.json(buildResponse(items, total));
 *
 * @param {Object} query - req.query object
 * @param {Object} [options] - Additional options
 * @param {string} [options.cursorField='id'] - Field to use as cursor
 * @param {number} [options.defaultLimit=50] - Default page size
 * @param {number} [options.maxLimit=200] - Maximum allowed page size
 */
function parsePagination(query, options = {}) {
    const {
        cursorField = 'id',
        defaultLimit = 50,
        maxLimit = 200,
    } = options;

    const limit = Math.min(
        Math.max(parseInt(query.limit) || defaultLimit, 1),
        maxLimit
    );

    // Cursor-based pagination (preferred for large datasets)
    if (query.cursor) {
        const paginationArgs = {
            take: limit + 1, // Fetch one extra to detect if there's a next page
            cursor: { [cursorField]: query.cursor },
            skip: 1, // Skip the cursor item itself
        };

        const buildResponse = (items) => {
            const hasMore = items.length > limit;
            const results = hasMore ? items.slice(0, limit) : items;
            const nextCursor = hasMore ? results[results.length - 1]?.[cursorField] : null;

            return {
                data: results,
                pagination: {
                    type: 'cursor',
                    limit,
                    hasMore,
                    nextCursor,
                },
            };
        };

        return { paginationArgs, buildResponse };
    }

    // Offset-based pagination (default — backward compatible)
    const page = Math.max(parseInt(query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const paginationArgs = {
        take: limit,
        skip,
    };

    const buildResponse = (items, total) => {
        return {
            data: items,
            pagination: {
                type: 'offset',
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        };
    };

    return { paginationArgs, buildResponse };
}

module.exports = { parsePagination };
