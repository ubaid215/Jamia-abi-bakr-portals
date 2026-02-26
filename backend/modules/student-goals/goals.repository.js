/**
 * modules/student-goals/goals.repository.js
 */

const prisma = require('../../db/prismaClient');

const goalSelect = {
  id: true, studentId: true, teacherId: true,
  goalType: true, category: true, title: true, description: true,
  metric: true, targetValue: true, currentValue: true, baselineValue: true, unit: true,
  startDate: true, targetDate: true, status: true, achievedAt: true,
  progress: true, milestones: true, lastChecked: true, checkFrequency: true,
  supportActions: true, visibleToStudent: true, visibleToParent: true,
  createdAt: true, updatedAt: true,
  student: { select: { id: true, admissionNo: true, user: { select: { name: true } } } },
  teacher: { select: { id: true, user: { select: { name: true } } } },
};

const create = (data) => prisma.studentGoal.create({ data, select: goalSelect });
const findById = (id) => prisma.studentGoal.findUnique({ where: { id }, select: goalSelect });
const update = (id, data) => prisma.studentGoal.update({ where: { id }, data, select: goalSelect });
const remove = (id) => prisma.studentGoal.delete({ where: { id } });
const findMany = ({ where, skip, take }) =>
  prisma.studentGoal.findMany({ where, skip, take, orderBy: { targetDate: 'asc' }, select: goalSelect });
const count = (where) => prisma.studentGoal.count({ where });

const findDueForCheck = () =>
  prisma.studentGoal.findMany({
    where: {
      status: 'IN_PROGRESS',
      OR: [
        { lastChecked: null },
        { lastChecked: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      ],
    },
    select: goalSelect,
  });

module.exports = { create, findById, update, remove, findMany, count, findDueForCheck };