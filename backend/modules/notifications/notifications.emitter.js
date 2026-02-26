/**
 * modules/notifications/notifications.emitter.js
 * Central notification emitter — saves to DB + pushes via Socket.io
 * Used by all modules to trigger notifications
 */

const repo = require('./notifications.repository');
const { SOCKET_EVENTS, SOCKET_ROOMS } = require('../../shared/websocket/socket.events');
const logger = require('../../utils/logger');

/**
 * Send a notification to one or more recipients
 * Saves to DB + emits via Socket.io (real-time)
 *
 * @param {Object} params
 * @param {string} params.studentId
 * @param {string|string[]} params.recipientIds  - one or many user IDs
 * @param {string|string[]} params.recipientTypes - matches recipientIds
 * @param {string} params.notificationType
 * @param {string} [params.category]
 * @param {string} params.title
 * @param {string} params.message
 * @param {Object} [params.data]
 * @param {string} [params.priority]             - LOW|NORMAL|HIGH|URGENT
 * @param {boolean} [params.requiresAction]
 * @param {string} [params.actionType]
 * @param {Date} [params.actionDeadline]
 * @param {string} [params.actionUrl]
 * @param {string} [params.batchId]
 * @param {Date} [params.expiresAt]
 */
const emit = async ({
  studentId,
  recipientIds,
  recipientTypes,
  notificationType,
  category = null,
  title,
  message,
  data = null,
  priority = 'NORMAL',
  requiresAction = false,
  actionType = null,
  actionDeadline = null,
  actionUrl = null,
  batchId = null,
  expiresAt = null,
}) => {
  try {
    const ids = Array.isArray(recipientIds) ? recipientIds : [recipientIds];
    const types = Array.isArray(recipientTypes) ? recipientTypes : [recipientTypes];

    // Persist all notifications
    const records = [];
    for (let i = 0; i < ids.length; i++) {
      const record = await repo.create({
        studentId,
        recipientId: ids[i],
        recipientType: types[i] || types[0],
        notificationType,
        category,
        title,
        message,
        data,
        priority,
        requiresAction,
        actionType,
        actionDeadline,
        actionUrl,
        batchId,
        expiresAt,
        deliveryMethod: ['IN_APP'],
      });
      records.push(record);
    }

    // Push via WebSocket (fire-and-forget)
    setImmediate(() => {
      try {
        const { getIO } = require('../../shared/websocket/socket.init');
        const io = getIO();

        for (let i = 0; i < ids.length; i++) {
          io.to(SOCKET_ROOMS.user(ids[i])).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
            ...records[i],
            unreadCount: null, // Client can fetch separately
          });
        }
      } catch (err) {
        // Socket.io not initialized yet — skip silently
        logger.warn({ err: err.message }, 'Notification emitter: socket not available');
      }
    });

    return records;
  } catch (err) {
    logger.error({ err, studentId, notificationType }, 'Notification emitter: failed');
    // Never throw — notifications are non-critical
    return [];
  }
};

/**
 * Emit a risk alert notification to all admins + the teacher
 */
const emitRiskAlert = async ({ studentId, studentName, riskLevel, reasons, teacherId, classRoomId }) => {
  const { getIO } = require('../../shared/websocket/socket.init');

  const title = `⚠️ Student At Risk: ${studentName}`;
  const message = `Risk level: ${riskLevel}. Reasons: ${reasons.join(', ')}`;

  // Emit socket alert to admin room immediately
  try {
    const io = getIO();
    io.to(SOCKET_ROOMS.admin()).emit(SOCKET_EVENTS.SNAPSHOT_RISK_ALERT, {
      studentId, studentName, riskLevel, reasons, classRoomId,
    });
    io.to(SOCKET_ROOMS.superAdmin()).emit(SOCKET_EVENTS.SNAPSHOT_RISK_ALERT, {
      studentId, studentName, riskLevel, reasons, classRoomId,
    });
    if (teacherId) {
      io.to(SOCKET_ROOMS.user(teacherId)).emit(SOCKET_EVENTS.SNAPSHOT_RISK_ALERT, {
        studentId, studentName, riskLevel, reasons,
      });
    }
  } catch (_) {}

  return emit({
    studentId,
    recipientIds: [teacherId || 'system'],
    recipientTypes: ['TEACHER'],
    notificationType: 'RISK_ALERT',
    category: 'ACADEMIC',
    title,
    message,
    priority: riskLevel === 'CRITICAL' ? 'URGENT' : 'HIGH',
    requiresAction: true,
    actionType: 'REVIEW_STUDENT',
    data: { riskLevel, reasons },
  });
};

/**
 * Emit a goal achieved notification
 */
const emitGoalAchieved = async ({ studentId, studentName, goalTitle, teacherId }) => {
  return emit({
    studentId,
    recipientIds: [teacherId, studentId].filter(Boolean),
    recipientTypes: ['TEACHER', 'STUDENT'],
    notificationType: 'GOAL_ACHIEVED',
    category: 'GOALS',
    title: `🎉 Goal Achieved: ${goalTitle}`,
    message: `${studentName} has achieved their goal: "${goalTitle}"`,
    priority: 'HIGH',
    data: { goalTitle },
  });
};

module.exports = { emit, emitRiskAlert, emitGoalAchieved };