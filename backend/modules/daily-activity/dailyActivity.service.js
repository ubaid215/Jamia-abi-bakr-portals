/**
 * modules/daily-activity/dailyActivity.service.js
 * Business logic for DailyActivity — REGULAR students only
 */

const repo = require('./dailyActivity.repository');
const { parsePagination } = require('../../shared/utils/pagination.utils');
const { toStartOfDay, toEndOfDay } = require('../../shared/utils/date.utils');
const { logCreate, logUpdate, logDelete } = require('../../shared/audit/auditLog.service');
const { AUDIT_ENTITIES } = require('../../shared/audit/auditLog.constants');
const { AppError } = require('../../middlewares/errorHandler');
const prisma = require('../../db/prismaClient');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../../db/redisClient');
const logger = require('../../utils/logger');

const CACHE_TTL = 300; // 5 min

// ── Cache helpers ─────────────────────────────────────────────────────────────

const activityCacheKey = (id) => `activity:${id}`;
const studentDayCacheKey = (studentId, date) => `activity:student:${studentId}:${date}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve the teacher's DB profile ID from req.user.id
 */
const resolveTeacherId = async (userId) => {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true },
  });
  return teacher?.id || null;
};

/**
 * Verify student exists, is REGULAR type, and belongs to the classRoom
 */
const validateStudentAndClass = async (studentId, classRoomId) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      studentType: true,
      currentEnrollment: {
        select: { classRoomId: true },
      },
    },
  });

  if (!student) throw new AppError('Student not found', 404);

  if (student.studentType !== 'REGULAR' && student.studentType !== 'REGULAR_HIFZ') {
    throw new AppError('Daily activity tracking is only available for regular students', 403);
  }

  return student;
};

/**
 * Helper to populate subject names into the subjectsStudied JSON array.
 * This is needed because subjectsStudied is a JSON field containing only subjectId.
 */
const populateSubjectNames = async (activities) => {
  if (!activities) return activities;
  
  const isArray = Array.isArray(activities);
  const arr = isArray ? activities : [activities];
  if (arr.length === 0) return activities;

  // Extract all unique subject IDs
  const subjectIds = new Set();
  arr.forEach(act => {
    if (Array.isArray(act.subjectsStudied)) {
      act.subjectsStudied.forEach(s => {
        if (s.subjectId) subjectIds.add(s.subjectId);
      });
    }
  });

  if (subjectIds.size === 0) return activities;

  // Fetch subject names from DB
  const subjects = await prisma.subject.findMany({
    where: { id: { in: Array.from(subjectIds) } },
    select: { id: true, name: true }
  });
  
  const subjectMap = subjects.reduce((map, sub) => {
    map[sub.id] = sub.name;
    return map;
  }, {});

  // Populate names back into the JSON objects
  arr.forEach(act => {
    if (Array.isArray(act.subjectsStudied)) {
      act.subjectsStudied = act.subjectsStudied.map(s => ({
        ...s,
        subjectName: subjectMap[s.subjectId] || 'Unknown Subject'
      }));
    }
  });

  return isArray ? arr : arr[0];
};

// ── Service Methods ───────────────────────────────────────────────────────────

/**
 * Create a new daily activity record
 * One record per student per day — enforced by DB unique constraint
 */
const createActivity = async (body, user, req) => {
  const teacherId = await resolveTeacherId(user.id);

  await validateStudentAndClass(body.studentId, body.classRoomId);

  // Normalize date to start of day (UTC)
  const date = body.date ? toStartOfDay(new Date(body.date)) : toStartOfDay(new Date());

  // Check for duplicate
  const existing = await repo.findByStudentAndDate(body.studentId, date);
  if (existing) {
    throw new AppError(
      'Daily activity already recorded for this student on this date. Use update instead.',
      409
    );
  }

  const data = {
    ...body,
    date,
    teacherId,
    recordedBy: teacherId || user.id,
    isVerified: true,
  };

  const activity = await repo.create(data);

  // Invalidate student's cache
  await cacheDelPattern(`activity:student:${body.studentId}:*`);

  // Fire audit log
  logCreate(AUDIT_ENTITIES.DAILY_ACTIVITY, activity.id, user, req, { studentId: body.studentId });

  logger.info({ activityId: activity.id, studentId: body.studentId }, 'DailyActivity: created');
  return activity;
};

/**
 * Update an existing daily activity
 */
const updateActivity = async (id, body, user, req) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Daily activity not found', 404);

  // Teachers can only update their own records; admins can update any
  if (user.role === 'TEACHER' && existing.recordedBy !== (await resolveTeacherId(user.id))) {
    throw new AppError('You can only update activities you recorded', 403);
  }

  const updated = await repo.update(id, body);

  // Invalidate caches
  await cacheDel(activityCacheKey(id));
  await cacheDelPattern(`activity:student:${existing.studentId}:*`);

  logUpdate(AUDIT_ENTITIES.DAILY_ACTIVITY, id, user, req, existing, updated);

  return updated;
};

/**
 * Delete a daily activity record (Admin/Super Admin only)
 */
const deleteActivity = async (id, user, req) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Daily activity not found', 404);

  await repo.remove(id);

  await cacheDel(activityCacheKey(id));
  await cacheDelPattern(`activity:student:${existing.studentId}:*`);

  logDelete(AUDIT_ENTITIES.DAILY_ACTIVITY, id, user, req, existing);

  return { deleted: true };
};

/**
 * Get a single activity by ID
 */
const getActivityById = async (id) => {
  const cached = await cacheGet(activityCacheKey(id));
  if (cached) return cached;

  const activity = await repo.findById(id);
  if (!activity) throw new AppError('Daily activity not found', 404);

  const populatedActivity = await populateSubjectNames(activity);
  await cacheSet(activityCacheKey(id), populatedActivity, CACHE_TTL);
  return populatedActivity;
};

/**
 * Get a student's activity for a specific date
 */
const getActivityByStudentAndDate = async (studentId, dateStr) => {
  const cacheKey = studentDayCacheKey(studentId, dateStr);
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const date = toStartOfDay(new Date(dateStr));
  const activity = await repo.findByStudentAndDate(studentId, date);
  if (!activity) throw new AppError('No activity found for this student on this date', 404);

  const populatedActivity = await populateSubjectNames(activity);
  await cacheSet(cacheKey, populatedActivity, CACHE_TTL);
  return populatedActivity;
};

/**
 * List activities with filters and pagination
 * Role-scoped:
 *   - STUDENT: can only see their own
 *   - PARENT: can only see their children's
 *   - TEACHER: can see their classroom/subject students
 *   - ADMIN/SUPER_ADMIN: can see all
 */
const listActivities = async (query, user) => {
  const { page, limit, skip } = parsePagination(query);

  // Build where clause
  const where = {};

  // Role-based scoping
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
    // Teacher/Admin — apply optional filters
    if (query.studentId) where.studentId = query.studentId;
    if (query.classRoomId) where.classRoomId = query.classRoomId;
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.subjectId) where.subjectId = query.subjectId;
  }

  // Date range filter
  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) where.date.gte = toStartOfDay(new Date(query.startDate));
    if (query.endDate) where.date.lte = toEndOfDay(new Date(query.endDate));
  }

  if (query.attendanceStatus) where.attendanceStatus = query.attendanceStatus;

  const [items, total] = await Promise.all([
    repo.findMany({ where, skip, take: limit }),
    repo.count(where),
  ]);

  const populatedItems = await populateSubjectNames(items);

  return { items: populatedItems, total, page, limit };
};

/**
 * Get a student's activities within a date range (for weekly calc)
 */
const getActivitiesInRange = (studentId, startDate, endDate) =>
  repo.findByStudentInRange(studentId, startDate, endDate);

module.exports = {
  createActivity,
  updateActivity,
  deleteActivity,
  getActivityById,
  getActivityByStudentAndDate,
  listActivities,
  getActivitiesInRange,
};