/**
 * modules/notifications/notifications.repository.js
 * Prisma queries for ProgressNotification
 */

const prisma = require('../../db/prismaClient');

const notifSelect = {
  id: true, studentId: true, recipientType: true, recipientId: true,
  notificationType: true, category: true, priority: true,
  title: true, message: true, data: true,
  requiresAction: true, actionType: true, actionDeadline: true,
  isRead: true, readAt: true, actionUrl: true,
  batchId: true, deliveryMethod: true,
  emailSent: true, smsSent: true,
  createdAt: true, expiresAt: true,
};

const create = (data) => prisma.progressNotification.create({ data, select: notifSelect });

const createMany = (data) => prisma.progressNotification.createMany({ data });

const findById = (id) => prisma.progressNotification.findUnique({ where: { id }, select: notifSelect });

const findMany = ({ where, skip, take }) =>
  prisma.progressNotification.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    select: notifSelect,
  });

const count = (where) => prisma.progressNotification.count({ where });

const markRead = (id) =>
  prisma.progressNotification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
    select: notifSelect,
  });

const markAllRead = (recipientId) =>
  prisma.progressNotification.updateMany({
    where: { recipientId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

const countUnread = (recipientId) =>
  prisma.progressNotification.count({ where: { recipientId, isRead: false } });

const deleteExpired = () =>
  prisma.progressNotification.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

module.exports = { create, createMany, findById, findMany, count, markRead, markAllRead, countUnread, deleteExpired };