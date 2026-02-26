/**
 * shared/middleware/studentType.middleware.js
 * Guards routes to REGULAR students only (DailyActivity, WeeklyProgress, Snapshot, Goals)
 * Must be used AFTER authenticateToken
 *
 * Usage:
 *   router.get('/activities', authenticateToken, requireRegularStudent, controller)
 *
 * For teacher/admin accessing a student's data — pass studentId in params/body
 *   router.get('/activities/:studentId', authenticateToken, requireTeacherOrAdmin, ensureStudentIsRegular, controller)
 */

const prisma = require('../../db/prismaClient');
const { cacheGet, cacheSet } = require('../../db/redisClient');
const { sendForbidden, sendNotFound, sendBadRequest } = require('../utils/response.utils');
const logger = require('../../utils/logger');

const CACHE_TTL = 300; // 5 min

/**
 * Fetch student type — cached
 * @param {string} studentId
 * @returns {Promise<string|null>} StudentType enum or null
 */
const getStudentType = async (studentId) => {
  const cacheKey = `student:type:${studentId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { studentType: true },
  });

  if (!student) return null;
  await cacheSet(cacheKey, student.studentType, CACHE_TTL);
  return student.studentType;
};

/**
 * Guard: req.user must be a REGULAR student (role = STUDENT + studentType = REGULAR)
 * Fetches the student profile linked to req.user.id
 */
const requireRegularStudent = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return next(); // Non-students (teachers/admins) pass through
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      select: { id: true, studentType: true },
    });

    if (!student) {
      return sendNotFound(res, 'Student profile not found');
    }

    if (student.studentType !== 'REGULAR' && student.studentType !== 'REGULAR_HIFZ') {
      logger.warn(
        { userId: req.user.id, studentType: student.studentType },
        'studentType: non-REGULAR student attempted to access REGULAR-only route'
      );
      return sendForbidden(res, 'This feature is only available for regular students');
    }

    // Attach student profile to req for downstream use
    req.studentProfile = student;
    next();
  } catch (err) {
    logger.error({ err }, 'requireRegularStudent: failed');
    next(err);
  }
};

/**
 * Guard: verifies the target student (from req.params.studentId or req.body.studentId)
 * is a REGULAR student. Used by teachers/admins accessing student data.
 */
const ensureStudentIsRegular = async (req, res, next) => {
  try {
    const studentId = req.params.studentId || req.body.studentId;

    if (!studentId) {
      return sendBadRequest(res, 'studentId is required');
    }

    const studentType = await getStudentType(studentId);

    if (!studentType) {
      return sendNotFound(res, 'Student not found');
    }

    if (studentType !== 'REGULAR' && studentType !== 'REGULAR_HIFZ') {
      return sendForbidden(res, 'Daily activity tracking is only available for regular students');
    }

    next();
  } catch (err) {
    logger.error({ err }, 'ensureStudentIsRegular: failed');
    next(err);
  }
};

module.exports = {
  requireRegularStudent,
  ensureStudentIsRegular,
  getStudentType,
};