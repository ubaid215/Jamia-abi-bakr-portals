/**
 * modules/progress-snapshot/snapshot.scheduler.js
 * Module-level scheduler for snapshot recalculation
 * Registered via shared/scheduler/scheduler.registry.js
 */

const { refreshSnapshot } = require('./snapshot.service');
const snapshotRepo = require('./snapshot.repository');
const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

/**
 * Recalculate snapshots for ALL students whose nextCalculationDue has passed
 * Called by the daily cron job at 2 AM
 */
const runDailySnapshotRefresh = async () => {
  const due = await snapshotRepo.findNeedingRecalculation();

  if (due.length === 0) {
    logger.info('SnapshotScheduler: no snapshots due for recalculation');
    return { processed: 0, errors: 0 };
  }

  logger.info({ count: due.length }, 'SnapshotScheduler: starting batch recalculation');

  let processed = 0;
  let errors = 0;

  // Process in batches of 20 to avoid DB overload
  const BATCH_SIZE = 20;
  for (let i = 0; i < due.length; i += BATCH_SIZE) {
    const batch = due.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async ({ studentId }) => {
        try {
          await refreshSnapshot(studentId);
          processed++;
        } catch (err) {
          errors++;
          logger.error({ err, studentId }, 'SnapshotScheduler: failed for student');
        }
      })
    );
    // Small delay between batches to avoid DB spike
    if (i + BATCH_SIZE < due.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  logger.info({ processed, errors, total: due.length }, 'SnapshotScheduler: batch complete');
  return { processed, errors };
};

/**
 * Recalculate snapshot for a specific classroom's students
 * Called after a teacher submits daily activities for a class
 * @param {string} classRoomId
 */
const runForClassRoom = async (classRoomId) => {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      classRoomId,
      isCurrent: true,
      student: { studentType: { in: ['REGULAR', 'REGULAR_HIFZ'] } },
    },
    select: { studentId: true },
  });

  const results = await Promise.allSettled(
    enrollments.map(({ studentId }) => refreshSnapshot(studentId))
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  logger.info({ classRoomId, successful, failed }, 'SnapshotScheduler: classroom refresh done');
  return { successful, failed };
};

/**
 * Emergency recalculation — triggered on demand (e.g., admin action)
 * Recalculates ALL active REGULAR students regardless of due date
 */
const runFullRefresh = async () => {
  const students = await prisma.student.findMany({
    where: {
      studentType: { in: ['REGULAR', 'REGULAR_HIFZ'] },
      currentEnrollmentId: { not: null },
    },
    select: { id: true },
  });

  logger.info({ total: students.length }, 'SnapshotScheduler: full refresh initiated');

  let processed = 0;
  let errors = 0;

  const BATCH_SIZE = 10;
  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = students.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async ({ id }) => {
        try {
          await refreshSnapshot(id);
          processed++;
        } catch (err) {
          errors++;
        }
      })
    );
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return { processed, errors, total: students.length };
};

module.exports = {
  runDailySnapshotRefresh,
  runForClassRoom,
  runFullRefresh,
};