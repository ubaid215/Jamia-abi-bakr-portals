/**
 * modules/notifications/notifications.controller.js
 */

const service = require('./notifications.service');
const { sendSuccess, sendPaginated } = require('../../shared/utils/response.utils');
const { SOCKET_EVENTS, SOCKET_ROOMS } = require('../../shared/websocket/socket.events');

let io;
const getIO = () => {
  if (!io) { try { io = require('../../shared/websocket/socket.init').getIO(); } catch (_) {} }
  return io;
};

const getNotifications = async (req, res, next) => {
  try {
    const { items, total, page, limit } = await service.getNotifications(req.query, req.user);
    return sendPaginated(res, items, { page, limit, total }, 'Notifications retrieved');
  } catch (err) { next(err); }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await service.getUnreadCount(req.user.id);
    return sendSuccess(res, { unreadCount: count });
  } catch (err) { next(err); }
};

const markAsRead = async (req, res, next) => {
  try {
    const notif = await service.markAsRead(req.params.id, req.user.id);

    // Emit updated count via socket
    const socket = getIO();
    if (socket) {
      const newCount = await service.getUnreadCount(req.user.id);
      socket.to(SOCKET_ROOMS.user(req.user.id)).emit(SOCKET_EVENTS.NOTIFICATION_COUNT, { unreadCount: newCount });
    }

    return sendSuccess(res, notif, 'Notification marked as read');
  } catch (err) { next(err); }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await service.markAllAsRead(req.user.id);

    const socket = getIO();
    if (socket) {
      socket.to(SOCKET_ROOMS.user(req.user.id)).emit(SOCKET_EVENTS.NOTIFICATION_READ_ALL, { unreadCount: 0 });
    }

    return sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };