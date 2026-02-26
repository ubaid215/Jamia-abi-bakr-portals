/**
 * shared/audit/auditLog.service.js
 * Writes structured audit entries to the AuditLog table
 * Non-blocking — failures are logged but never throw
 */

const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

/**
 * Create an audit log entry
 * @param {Object} params
 * @param {string} params.action         - AuditAction enum value
 * @param {string} params.entity         - AuditEntity enum value
 * @param {string} params.entityId       - ID of the affected record
 * @param {Object} params.user           - req.user object
 * @param {Object} [params.changes]      - { before, after }
 * @param {string} [params.description]  - Human-readable description
 * @param {Object} [params.metadata]     - Extra context
 * @param {string} [params.ipAddress]    - Request IP
 * @param {string} [params.userAgent]    - Request User-Agent
 * @param {string} [params.requestId]    - Optional request trace ID
 * @param {string} [params.severity]     - INFO | WARNING | ERROR | CRITICAL
 * @param {boolean} [params.isSuccess]   - Default true
 * @param {string} [params.errorMessage] - If isSuccess is false
 * @returns {Promise<void>}
 */
const createAuditLog = async ({
  action,
  entity,
  entityId,
  user,
  changes = null,
  description = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
  requestId = null,
  severity = 'INFO',
  isSuccess = true,
  errorMessage = null,
  tags = [],
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: String(entityId),
        userId: user.id,
        userName: user.name || null,
        userRole: user.role,
        userEmail: user.email || null,
        changes,
        description,
        metadata,
        ipAddress,
        userAgent,
        requestId,
        severity,
        isSuccess,
        errorMessage,
        tags,
      },
    });
  } catch (err) {
    // Audit log failures must NEVER crash the application
    logger.error({ err, action, entity, entityId }, 'AuditLog: failed to write entry');
  }
};

/**
 * Convenience: log a CREATE action
 */
const logCreate = (entity, entityId, user, req, after = null, description = null) =>
  createAuditLog({
    action: 'CREATE',
    entity,
    entityId,
    user,
    changes: after ? { before: null, after } : null,
    description,
    ipAddress: req?.ip || null,
    userAgent: req?.headers?.['user-agent'] || null,
  });

/**
 * Convenience: log an UPDATE action
 */
const logUpdate = (entity, entityId, user, req, before = null, after = null, description = null) =>
  createAuditLog({
    action: 'UPDATE',
    entity,
    entityId,
    user,
    changes: { before, after },
    description,
    ipAddress: req?.ip || null,
    userAgent: req?.headers?.['user-agent'] || null,
  });

/**
 * Convenience: log a DELETE action
 */
const logDelete = (entity, entityId, user, req, before = null, description = null) =>
  createAuditLog({
    action: 'DELETE',
    entity,
    entityId,
    user,
    changes: before ? { before, after: null } : null,
    description,
    ipAddress: req?.ip || null,
    userAgent: req?.headers?.['user-agent'] || null,
  });

module.exports = {
  createAuditLog,
  logCreate,
  logUpdate,
  logDelete,
};