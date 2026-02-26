/**
 * modules/progress-snapshot/snapshot.service.js
 */

const prisma = require('../../db/prismaClient');
const { calculateSnapshot } = require('./snapshot.calculator');
const { cacheGet, cacheSet, cacheDel } = require('../../db/redisClient');
const { emitRiskAlert } = require('../notifications/notifications.emitter');
const { AppError } = require('../../middlewares/errorHandler');
const logger = require('../../utils/logger');

const WEEKS_HISTORY = 8; // Look back 8 weeks for snapshot calc
const CACHE_TTL = 300;

const snapshotKey = (studentId) => `snapshot:${studentId}`;

const getSnapshotByStudentId = async (studentId) => {
  const cacheKey = snapshotKey(studentId);
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const snapshot = await prisma.studentProgressSnapshot.findUnique({
    where: { studentId },
  });

  if (!snapshot) throw new AppError('Snapshot not found. Progress has not been calculated yet.', 404);

  await cacheSet(cacheKey, snapshot, CACHE_TTL);
  return snapshot;
};

/**
 * Recalculate and persist a student's progress snapshot
 */
const refreshSnapshot = async (studentId) => {
  // Get last N weeks of weekly progress
  const weeklyHistory = await prisma.weeklyProgress.findMany({
    where: { studentId },
    orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    take: WEEKS_HISTORY,
  });

  // Get last 30 days of daily activities
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentActivities = await prisma.dailyActivity.findMany({
    where: { studentId, date: { gte: thirtyDaysAgo } },
    orderBy: { date: 'desc' },
  });

  const existingSnapshot = await prisma.studentProgressSnapshot.findUnique({
    where: { studentId },
  });

  const calculated = calculateSnapshot(weeklyHistory, recentActivities, existingSnapshot || {});

  // Get last activity date
  const lastActivity = recentActivities[0];

  const snapshot = await prisma.studentProgressSnapshot.upsert({
    where: { studentId },
    create: { studentId, ...calculated, lastActivityDate: lastActivity?.date || null },
    update: { ...calculated, lastActivityDate: lastActivity?.date || null },
  });

  await cacheDel(snapshotKey(studentId));

  // Trigger risk alert if needed
  if (calculated.interventionRequired) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        user: { select: { name: true } },
        currentEnrollment: {
          select: {
            classRoomId: true,
            classRoom: { select: { teacherId: true } },
          },
        },
      },
    });

    if (student) {
      // Check if we already sent this alert recently (prevent spam)
      const recentAlert = await prisma.progressNotification.findFirst({
        where: {
          studentId,
          notificationType: 'RISK_ALERT',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (!recentAlert) {
        await emitRiskAlert({
          studentId,
          studentName: student.user.name,
          riskLevel: calculated.riskLevel,
          reasons: calculated.attentionReasons,
          teacherId: student.currentEnrollment?.classRoom?.teacherId,
          classRoomId: student.currentEnrollment?.classRoomId,
        });
      }
    }
  }

  logger.info({ studentId, riskLevel: calculated.riskLevel }, 'Snapshot: refreshed');
  return snapshot;
};

/**
 * Bulk refresh snapshots for all REGULAR students in a classroom
 */
const refreshForClassRoom = async (classRoomId) => {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      classRoomId,
      isCurrent: true,
      student: { studentType: { in: ['REGULAR', 'REGULAR_HIFZ'] } },
    },
    select: { studentId: true },
  });

  const results = [];
  for (const { studentId } of enrollments) {
    try {
      await refreshSnapshot(studentId);
      results.push({ studentId, status: 'success' });
    } catch (err) {
      logger.error({ err, studentId }, 'Snapshot: bulk refresh failed for student');
      results.push({ studentId, status: 'error', error: err.message });
    }
  }

  return results;
};

/**
 * Get students needing attention (for admin/teacher dashboard)
 */
const getAtRiskStudents = async (classRoomId = null) => {
  const where = {
    needsAttention: true,
    student: {
      studentType: { in: ['REGULAR', 'REGULAR_HIFZ'] },
    },
  };

  if (classRoomId) {
    where.student.currentEnrollment = { classRoomId };
  }

  return prisma.studentProgressSnapshot.findMany({
    where,
    orderBy: [{ riskLevel: 'desc' }, { lastActivityDate: 'asc' }],
    include: {
      student: {
        select: {
          id: true,
          admissionNo: true,
          user: { select: { name: true, profileImage: true } },
          currentEnrollment: {
            select: { classRoom: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
};

module.exports = { getSnapshotByStudentId, refreshSnapshot, refreshForClassRoom, getAtRiskStudents };