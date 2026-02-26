/**
 * modules/parent-communication/parentComm.service.js
 */

const repo = require('./parentComm.repository');
const { parsePagination } = require('../../shared/utils/pagination.utils');
const { AppError } = require('../../middlewares/errorHandler');
const { logCreate, logUpdate } = require('../../shared/audit/auditLog.service');
const { AUDIT_ENTITIES } = require('../../shared/audit/auditLog.constants');
const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

const createCommunication = async (body, user, req) => {
  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  const comm = await repo.create({
    ...body,
    teacherId: teacher?.id || null,
    isActive: true,
    deliveredAt: new Date(),
  });

  logCreate(AUDIT_ENTITIES.PARENT_COMMUNICATION, comm.id, user, req);
  logger.info({ commId: comm.id, studentId: body.studentId }, 'ParentComm: created');
  return comm;
};

const updateCommunication = async (id, body, user, req) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Communication record not found', 404);

  const updated = await repo.update(id, body);
  logUpdate(AUDIT_ENTITIES.PARENT_COMMUNICATION, id, user, req, existing, updated);
  return updated;
};

const parentAcknowledge = async (id, parentId, response) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Communication not found', 404);

  // Verify the parent is linked to this student
  const parent = await prisma.parent.findUnique({
    where: { userId: parentId },
    select: { id: true, children: { select: { id: true } } },
  });
  const childIds = parent?.children?.map(c => c.id) || [];
  if (!childIds.includes(existing.studentId)) throw new AppError('Access denied', 403);

  return repo.update(id, {
    acknowledged: true,
    parentResponse: response || null,
    parentResponseAt: new Date(),
  });
};

const listCommunications = async (query, user) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {};

  if (user.role === 'PARENT') {
    const parent = await prisma.parent.findUnique({
      where: { userId: user.id },
      select: { id: true, children: { select: { id: true } } },
    });
    where.parentId = parent?.id;
    where.studentId = { in: parent?.children?.map(c => c.id) || [] };
  } else if (user.role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.id }, select: { id: true } });
    where.teacherId = teacher?.id;
  } else {
    if (query.studentId) where.studentId = query.studentId;
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.parentId) where.parentId = query.parentId;
  }

  if (query.communicationType) where.communicationType = query.communicationType;
  if (query.acknowledged !== undefined) where.acknowledged = query.acknowledged === 'true';

  const [items, total] = await Promise.all([repo.findMany({ where, skip, take: limit }), repo.count(where)]);
  return { items, total, page, limit };
};

module.exports = { createCommunication, updateCommunication, parentAcknowledge, listCommunications };