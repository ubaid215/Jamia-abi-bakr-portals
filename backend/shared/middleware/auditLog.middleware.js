/**
 * shared/middleware/auditLog.middleware.js
 * Auto-audit middleware — attaches audit logging to mutating routes (POST/PUT/PATCH/DELETE)
 * Usage: router.post('/route', authenticateToken, auditLog('CREATE', 'DAILY_ACTIVITY'), controller)
 */

const { createAuditLog } = require('../audit/auditLog.service');
const logger = require('../../utils/logger');

/**
 * Creates an audit middleware for a specific action and entity
 * @param {string} action  - AUDIT_ACTIONS value
 * @param {string} entity  - AUDIT_ENTITIES value
 * @param {Function} [getEntityId] - (req, res_body) => string — extract entity ID from response
 * @returns {Function} Express middleware
 */
const auditLog = (action, entity, getEntityId = null) => {
  return (req, res, next) => {
    // Intercept res.json to capture the response body for entity ID extraction
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Only log on successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId =
          getEntityId
            ? getEntityId(req, body)
            : (body?.data?.id || req.params?.id || 'unknown');

        // Fire-and-forget — never block the response
        setImmediate(() => {
          createAuditLog({
            action,
            entity,
            entityId: String(entityId),
            user: req.user,
            description: `${action} on ${entity}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: {
              method: req.method,
              path: req.originalUrl,
              statusCode: res.statusCode,
            },
          }).catch(err => {
            logger.error({ err }, 'auditLog middleware: failed to write');
          });
        });
      }

      return originalJson(body);
    };

    next();
  };
};

module.exports = { auditLog };