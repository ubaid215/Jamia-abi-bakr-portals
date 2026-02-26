/**
 * modules/notifications/notifications.service.js
 */

const repo = require('./notifications.repository');
const { parsePagination } = require('../../shared/utils/pagination.utils');
const { AppError } = require('../../middlewares/errorHandler');
const { cacheGet, cacheSet, cacheDel } = require('../../db/redisClient');
const prisma = require('../../db/prismaClient');

const unreadCountKey = (userId) => `notif:unread:${userId}`;

const getNotifications = async (query, user) => {
  const { page, limit, skip } = parsePagination(query);
  const where = { recipientId: user.id };

  if (query.isRead !== undefined) where.isRead = query.isRead === 'true';
  if (query.priority) where.priority = query.priority;
  if (query.notificationType) where.notificationType = query.notificationType;
  if (query.requiresAction !== undefined) where.requiresAction = query.requiresAction === 'true';

  const [items, total] = await Promise.all([
    repo.findMany({ where, skip, take: limit }),
    repo.count(where),
  ]);

  return { items, total, page, limit };
};

const getUnreadCount = async (userId) => {
  const cacheKey = unreadCountKey(userId);
  const cached = await cacheGet(cacheKey);
  if (cached !== null) return cached;

  const count = await repo.countUnread(userId);
  await cacheSet(cacheKey, count, 60); // 1 min TTL
  return count;
};

const markAsRead = async (id, userId) => {
  const notif = await repo.findById(id);
  if (!notif) throw new AppError('Notification not found', 404);
  if (notif.recipientId !== userId) throw new AppError('Access denied', 403);

  const updated = await repo.markRead(id);
  await cacheDel(unreadCountKey(userId));
  return updated;
};

const markAllAsRead = async (userId) => {
  const result = await repo.markAllRead(userId);
  await cacheDel(unreadCountKey(userId));
  return result;
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };