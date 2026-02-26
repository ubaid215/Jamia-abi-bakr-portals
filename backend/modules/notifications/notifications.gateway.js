/**
 * modules/notifications/notifications.gateway.js
 * Socket.io server-side event handlers for the notifications namespace
 * Handles real-time notification delivery and acknowledgement
 *
 * This is called from socket.init.js after connection is established
 */

const notifService = require('./notifications.service');
const { SOCKET_EVENTS, SOCKET_ROOMS } = require('../../shared/websocket/socket.events');
const logger = require('../../utils/logger');

/**
 * Register all notification-related socket event handlers on a connected socket
 * Called from socket.init.js inside the 'connect' handler
 *
 * @param {import('socket.io').Socket} socket
 */
const registerNotificationHandlers = (socket) => {
  const userId = socket.user?.id;
  if (!userId) return;

  // ── Client requests their unread count on connect ─────────────────────────
  socket.on('notification:request_count', async () => {
    try {
      const count = await notifService.getUnreadCount(userId);
      socket.emit(SOCKET_EVENTS.NOTIFICATION_COUNT, { unreadCount: count });
    } catch (err) {
      logger.error({ err, userId }, 'Gateway: failed to send unread count');
    }
  });

  // ── Client marks a single notification as read ────────────────────────────
  socket.on(SOCKET_EVENTS.NOTIFICATION_READ, async ({ notificationId }) => {
    try {
      if (!notificationId) return;
      await notifService.markAsRead(notificationId, userId);
      const newCount = await notifService.getUnreadCount(userId);
      socket.emit(SOCKET_EVENTS.NOTIFICATION_COUNT, { unreadCount: newCount });
    } catch (err) {
      logger.error({ err, userId, notificationId }, 'Gateway: failed to mark notification read');
    }
  });

  // ── Client marks all notifications as read ────────────────────────────────
  socket.on(SOCKET_EVENTS.NOTIFICATION_READ_ALL, async () => {
    try {
      await notifService.markAllAsRead(userId);
      socket.emit(SOCKET_EVENTS.NOTIFICATION_COUNT, { unreadCount: 0 });
      socket.emit(SOCKET_EVENTS.NOTIFICATION_READ_ALL, { success: true });
    } catch (err) {
      logger.error({ err, userId }, 'Gateway: failed to mark all read');
    }
  });

  // ── Admin/Teacher broadcasts a notification to a classroom ────────────────
  socket.on('notification:broadcast_classroom', async ({ classRoomId, title, message, priority }) => {
    try {
      if (!['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(socket.user?.role)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Insufficient permissions' });
        return;
      }

      if (!classRoomId || !title || !message) return;

      // Emit real-time to classroom room
      socket.to(SOCKET_ROOMS.classroom(classRoomId)).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
        title,
        message,
        priority: priority || 'NORMAL',
        notificationType: 'CLASSROOM_BROADCAST',
        createdAt: new Date().toISOString(),
      });

      logger.info({ userId, classRoomId }, 'Gateway: classroom broadcast sent');
    } catch (err) {
      logger.error({ err, userId }, 'Gateway: classroom broadcast failed');
    }
  });
};

/**
 * Push a notification to a specific user by userId (server-side utility)
 * Used by services that need to push notifications without going through emitter
 *
 * @param {import('socket.io').Server} io
 * @param {string} userId
 * @param {Object} payload
 */
const pushToUser = (io, userId, payload) => {
  if (!io || !userId) return;
  io.to(SOCKET_ROOMS.user(userId)).emit(SOCKET_EVENTS.NOTIFICATION_NEW, payload);
};

/**
 * Push to all admins
 * @param {import('socket.io').Server} io
 * @param {Object} payload
 */
const pushToAdmins = (io, payload) => {
  if (!io) return;
  io.to(SOCKET_ROOMS.admin()).emit(SOCKET_EVENTS.NOTIFICATION_NEW, payload);
  io.to(SOCKET_ROOMS.superAdmin()).emit(SOCKET_EVENTS.NOTIFICATION_NEW, payload);
};

module.exports = {
  registerNotificationHandlers,
  pushToUser,
  pushToAdmins,
};