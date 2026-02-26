/**
 * modules/parent-communication/parentComm.repository.js
 */

const prisma = require('../../db/prismaClient');

const commSelect = {
  id: true, studentId: true, parentId: true, teacherId: true,
  communicationType: true, subject: true, message: true,
  relatedActivity: true, meetingRequested: true, meetingScheduled: true,
  meetingCompleted: true, meetingNotes: true, parentResponse: true,
  parentResponseAt: true, acknowledged: true, sentVia: true,
  deliveredAt: true, priority: true, isActive: true,
  createdAt: true, updatedAt: true,
  student: { select: { id: true, admissionNo: true, user: { select: { name: true } } } },
  teacher: { select: { id: true, user: { select: { name: true } } } },
  parent: { select: { id: true, user: { select: { name: true, phone: true } } } },
};

const create = (data) => prisma.parentCommunication.create({ data, select: commSelect });
const findById = (id) => prisma.parentCommunication.findUnique({ where: { id }, select: commSelect });
const update = (id, data) => prisma.parentCommunication.update({ where: { id }, data, select: commSelect });
const findMany = ({ where, skip, take }) =>
  prisma.parentCommunication.findMany({
    where, skip, take,
    orderBy: { createdAt: 'desc' },
    select: commSelect,
  });
const count = (where) => prisma.parentCommunication.count({ where });

module.exports = { create, findById, update, findMany, count };