/**
 * modules/weekly-progress/weeklyProgress.service.js
 * Business logic — generates and retrieves WeeklyProgress
 */

const repo = require('./weeklyProgress.repository');
const { calculateWeeklyProgress } = require('./weeklyProgress.calculator');
const activityRepo = require('../daily-activity/dailyActivity.repository');
const { getWeekInfo, getWeekDateRange } = require('../../shared/utils/date.utils');
const { countAcademicWorkingDays } = require('../../shared/utils/academicCalendar.utils');
const { parsePagination } = require('../../shared/utils/pagination.utils');
const { logCreate, logUpdate } = require('../../shared/audit/auditLog.service');
const { AUDIT_ENTITIES } = require('../../shared/audit/auditLog.constants');
const { AppError } = require('../../middlewares/errorHandler');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../../db/redisClient');
const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

const CACHE_TTL = 600; // 10 min

const weekCacheKey = (studentId, weekNumber, year) =>
  `weekly:${studentId}:${year}:${weekNumber}`;

// ── Core: Generate / Refresh weekly progress ──────────────────────────────────

/**
 * Generate (or regenerate) WeeklyProgress for a student for a given week
 * Called by: cron job, teacher manually, or after daily activity creation
 */
const generateWeeklyProgress = async ({ studentId, weekNumber, year, classRoomId, teacherId, user, req }) => {
  const { startDate, endDate } = getWeekDateRange(weekNumber, year);

  // Get all daily activities for the student in this week
  const activities = await activityRepo.findByStudentInRange(studentId, startDate, endDate);

  // Count academic working days (holiday-aware)
  const totalWorkingDays = await countAcademicWorkingDays(startDate, endDate);

  // Run calculations
  const calculated = calculateWeeklyProgress(activities, totalWorkingDays);

  // Resolve teacher if not provided
  let resolvedTeacherId = teacherId;
  if (!resolvedTeacherId && user) {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    resolvedTeacherId = teacher?.id || null;
  }

  const data = {
    ...calculated,
    teacherId: resolvedTeacherId,
    classRoomId,
    startDate,
    endDate,
  };

  const progress = await repo.upsert(studentId, weekNumber, year, data);

  // Invalidate cache
  await cacheDel(weekCacheKey(studentId, weekNumber, year));

  if (user) {
    logCreate(AUDIT_ENTITIES.WEEKLY_PROGRESS, progress.id, user, req, { studentId, weekNumber, year });
  }

  logger.info({ studentId, weekNumber, year }, 'WeeklyProgress: generated');
  return progress;
};

/**
 * Teacher adds manual comments/highlights to a weekly progress
 */
const updateWeeklyProgress = async (id, body, user, req) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Weekly progress not found', 404);

  // Only allow updating commentary fields — not calculated metrics
  const allowedFields = [
    'weeklyHighlights', 'areasOfImprovement', 'teacherComments',
    'achievements', 'incidents', 'actionItems', 'followUpRequired',
  ];

  const updateData = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) updateData[key] = body[key];
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('No updatable fields provided', 400);
  }

  const updated = await repo.update(id, updateData);
  await cacheDel(weekCacheKey(existing.studentId, existing.weekNumber, existing.year));

  logUpdate(AUDIT_ENTITIES.WEEKLY_PROGRESS, id, user, req, existing, updated);
  return updated;
};

/**
 * Get weekly progress for a student by week+year
 */
const getByStudentAndWeek = async (studentId, weekNumber, year) => {
  const cacheKey = weekCacheKey(studentId, weekNumber, year);
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const progress = await repo.findByStudentAndWeek(studentId, weekNumber, year);
  if (!progress) throw new AppError('Weekly progress not found for this period', 404);

  await cacheSet(cacheKey, progress, CACHE_TTL);
  return progress;
};

/**
 * Get current week's progress for a student
 */
const getCurrentWeekProgress = async (studentId) => {
  const { weekNumber, year } = getWeekInfo();
  return getByStudentAndWeek(studentId, weekNumber, year);
};

/**
 * List weekly progress with filters + pagination
 * Role-scoped: students see own, parents see children, teachers/admins see all
 */
const listWeeklyProgress = async (query, user) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {};

  if (user.role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!student) throw new AppError('Student profile not found', 404);
    where.studentId = student.id;

  } else if (user.role === 'PARENT') {
    const parent = await prisma.parent.findUnique({
      where: { userId: user.id },
      select: { children: { select: { id: true } } },
    });
    const childIds = parent?.children?.map(c => c.id) || [];
    if (childIds.length === 0) return { items: [], total: 0, page, limit };
    where.studentId = { in: childIds };

  } else {
    if (query.studentId) where.studentId = query.studentId;
    if (query.classRoomId) where.classRoomId = query.classRoomId;
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.followUpRequired !== undefined) where.followUpRequired = query.followUpRequired === 'true';
  }

  if (query.year) where.year = parseInt(query.year);
  if (query.weekNumber) where.weekNumber = parseInt(query.weekNumber);

  const [items, total] = await Promise.all([
    repo.findMany({ where, skip, take: limit }),
    repo.count(where),
  ]);

  return { items, total, page, limit };
};

/**
 * Bulk generate weekly progress for all REGULAR students in a classroom
 * Called by cron job or admin action
 */
const generateForClassRoom = async (classRoomId, weekNumber, year) => {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      classRoomId,
      isCurrent: true,
      student: { studentType: { in: ['REGULAR', 'REGULAR_HIFZ'] } },
    },
    select: {
      studentId: true,
      student: { select: { currentEnrollment: { select: { classRoomId: true } } } },
    },
  });

  const results = [];
  for (const enrollment of enrollments) {
    try {
      const progress = await generateWeeklyProgress({
        studentId: enrollment.studentId,
        weekNumber,
        year,
        classRoomId,
      });
      results.push({ studentId: enrollment.studentId, status: 'success', progressId: progress.id });
    } catch (err) {
      logger.error({ err, studentId: enrollment.studentId }, 'WeeklyProgress: bulk generate failed for student');
      results.push({ studentId: enrollment.studentId, status: 'error', error: err.message });
    }
  }

  logger.info({ classRoomId, weekNumber, year, count: results.length }, 'WeeklyProgress: bulk generated');
  return results;
};

module.exports = {
  generateWeeklyProgress,
  updateWeeklyProgress,
  getByStudentAndWeek,
  getCurrentWeekProgress,
  listWeeklyProgress,
  generateForClassRoom,
};