/**
 * modules/student-goals/goals.service.js
 */

const repo = require('./goals.repository');
const { parsePagination } = require('../../shared/utils/pagination.utils');
const { logCreate, logUpdate, logDelete } = require('../../shared/audit/auditLog.service');
const { AUDIT_ENTITIES } = require('../../shared/audit/auditLog.constants');
const { AppError } = require('../../middlewares/errorHandler');
const { emitGoalAchieved, emit } = require('../notifications/notifications.emitter');
const { cacheGet, cacheSet, cacheDel } = require('../../db/redisClient');
const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

const goalKey = (id) => `goal:${id}`;

const createGoal = async (body, user, req) => {
  const teacher = await prisma.teacher.findUnique({ where: { userId: user.id }, select: { id: true } });

  const progress = body.targetValue > 0
    ? Math.round(((body.currentValue || 0) / body.targetValue) * 100 * 100) / 100
    : 0;

  const goal = await repo.create({
    ...body,
    teacherId: teacher?.id || null,
    progress,
    baselineValue: body.currentValue || 0,
  });

  logCreate(AUDIT_ENTITIES.STUDENT_GOAL, goal.id, user, req);
  return goal;
};

const updateGoal = async (id, body, user, req) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Goal not found', 404);

  // Recalculate progress if currentValue or targetValue changed
  let progress = existing.progress;
  const targetValue = body.targetValue || existing.targetValue;
  const currentValue = body.currentValue !== undefined ? body.currentValue : existing.currentValue;

  if (targetValue > 0) {
    progress = Math.round((currentValue / targetValue) * 100 * 100) / 100;
  }

  // Auto-mark as achieved
  let status = body.status || existing.status;
  let achievedAt = existing.achievedAt;
  if (progress >= 100 && status === 'IN_PROGRESS') {
    status = 'ACHIEVED';
    achievedAt = new Date();
  }

  const updated = await repo.update(id, {
    ...body,
    progress,
    status,
    achievedAt,
    lastChecked: new Date(),
  });

  await cacheDel(goalKey(id));

  // Emit goal achieved notification
  if (status === 'ACHIEVED' && existing.status !== 'ACHIEVED') {
    const student = await prisma.student.findUnique({
      where: { id: existing.studentId },
      select: { user: { select: { name: true } } },
    });

    await emitGoalAchieved({
      studentId: existing.studentId,
      studentName: student?.user?.name || 'Student',
      goalTitle: existing.title,
      teacherId: existing.teacherId,
    });
  }

  logUpdate(AUDIT_ENTITIES.STUDENT_GOAL, id, user, req, existing, updated);
  return updated;
};

const deleteGoal = async (id, user, req) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Goal not found', 404);
  await repo.remove(id);
  await cacheDel(goalKey(id));
  logDelete(AUDIT_ENTITIES.STUDENT_GOAL, id, user, req);
  return { deleted: true };
};

const getGoalById = async (id) => {
  const cached = await cacheGet(goalKey(id));
  if (cached) return cached;
  const goal = await repo.findById(id);
  if (!goal) throw new AppError('Goal not found', 404);
  await cacheSet(goalKey(id), goal, 300);
  return goal;
};

const listGoals = async (query, user) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {};

  if (user.role === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!student) throw new AppError('Student profile not found', 404);
    where.studentId = student.id;
    where.visibleToStudent = true;
  } else if (user.role === 'PARENT') {
    const parent = await prisma.parent.findUnique({ where: { userId: user.id }, select: { children: { select: { id: true } } } });
    const childIds = parent?.children?.map(c => c.id) || [];
    where.studentId = { in: childIds };
    where.visibleToParent = true;
  } else {
    if (query.studentId) where.studentId = query.studentId;
    if (query.teacherId) where.teacherId = query.teacherId;
  }

  if (query.status) where.status = query.status;
  if (query.goalType) where.goalType = query.goalType;

  const [items, total] = await Promise.all([repo.findMany({ where, skip, take: limit }), repo.count(where)]);
  return { items, total, page, limit };
};

/**
 * Auto-check goals for risk — called by cron job
 */
const checkGoalsForRisk = async () => {
  const goals = await repo.findDueForCheck();
  let updated = 0;

  for (const goal of goals) {
    const now = new Date();
    const daysLeft = Math.ceil((new Date(goal.targetDate) - now) / (1000 * 60 * 60 * 24));

    let newStatus = goal.status;

    // Mark AT_RISK if less than 20% complete with < 30% time left
    const timeUsedPercent = ((now - new Date(goal.startDate)) / (new Date(goal.targetDate) - new Date(goal.startDate))) * 100;
    if (goal.progress < 30 && timeUsedPercent > 70) newStatus = 'AT_RISK';
    if (daysLeft < 0) newStatus = 'FAILED';

    if (newStatus !== goal.status) {
      await repo.update(goal.id, { status: newStatus, lastChecked: now });
      updated++;

      if (newStatus === 'AT_RISK') {
        await emit({
          studentId: goal.studentId,
          recipientIds: [goal.teacherId || goal.studentId],
          recipientTypes: ['TEACHER'],
          notificationType: 'GOAL_AT_RISK',
          title: `⚠️ Goal at risk: ${goal.title}`,
          message: `Goal "${goal.title}" is at risk of not being achieved by the target date.`,
          priority: 'HIGH',
          data: { goalId: goal.id, progress: goal.progress, daysLeft },
        });
      }
    } else {
      await repo.update(goal.id, { lastChecked: now });
    }
  }

  logger.info({ checked: goals.length, updated }, 'Goals: risk check completed');
  return { checked: goals.length, updated };
};

module.exports = { createGoal, updateGoal, deleteGoal, getGoalById, listGoals, checkGoalsForRisk };