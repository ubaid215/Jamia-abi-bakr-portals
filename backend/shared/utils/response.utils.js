/**
 * shared/utils/response.utils.js
 * Standardized API response helpers — used across all modules
 */

const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
  };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a created response (201)
 */
const sendCreated = (res, data = null, message = 'Created successfully') => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Send a paginated response
 * @param {import('express').Response} res
 * @param {Array} items
 * @param {Object} pagination - { page, limit, total }
 * @param {string} message
 */
const sendPaginated = (res, items, pagination, message = 'Success') => {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);

  return res.status(200).json({
    success: true,
    message,
    timestamp: new Date().toISOString(),
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};

/**
 * Send an error response
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} statusCode
 * @param {*} details
 */
const sendError = (res, message = 'Something went wrong', statusCode = 500, details = null) => {
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a not found response (404)
 */
const sendNotFound = (res, message = 'Resource not found') => {
  return sendError(res, message, 404);
};

/**
 * Send a forbidden response (403)
 */
const sendForbidden = (res, message = 'Access denied') => {
  return sendError(res, message, 403);
};

/**
 * Send a bad request response (400)
 */
const sendBadRequest = (res, message = 'Bad request', details = null) => {
  return sendError(res, message, 400, details);
};

module.exports = {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendError,
  sendNotFound,
  sendForbidden,
  sendBadRequest,
};