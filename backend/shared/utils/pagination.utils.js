/**
 * shared/utils/pagination.utils.js
 * Consistent pagination parsing and metadata across all modules
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse and validate pagination params from req.query
 * @param {Object} query - req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
const parsePagination = (query = {}) => {
  let page = parseInt(query.page) || DEFAULT_PAGE;
  let limit = parseInt(query.limit) || DEFAULT_LIMIT;

  // Clamp values
  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build pagination metadata object for sendPaginated
 * @param {number} page
 * @param {number} limit
 * @param {number} total
 * @returns {Object}
 */
const buildPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

module.exports = {
  parsePagination,
  buildPaginationMeta,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};