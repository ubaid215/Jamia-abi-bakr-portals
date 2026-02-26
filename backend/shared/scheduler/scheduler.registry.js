/**
 * shared/scheduler/scheduler.registry.js
 * Register all application cron jobs here
 * Import and call registerAllJobs() from app.js after server starts
 */

const { registerJob, startAll, stopAll } = require('./scheduler.init');
const logger = require('../../utils/logger');
const prisma = require('../../db/prismaClient');

const registerAllJobs = () => {

  // ── 1. Weekly Progress Generation ──────────────────────────────────────────
  // Every Friday at 20:00 — generate weekly progress for all REGULAR students
  registerJob(
    'weekly-progress-generator',
    '0 20 * * 5', // Friday 8 PM
    async () => {
      const { generateForClassRoom } = require('../../modules/weekly-progress/weeklyProgress.service');
      const { getWeekInfo } = require('../utils/date.utils');

      const { weekNumber, year } = getWeekInfo();

      const classRooms = await prisma.classRoom.findMany({
        where: { type: { in: ['REGULAR'] } },
        select: { id: true, name: true },
      });

      logger.info({ count: classRooms.length, weekNumber, year }, 'Cron: generating weekly progress');

      for (const cls of classRooms) {
        await generateForClassRoom(cls.id, weekNumber, year);
      }
    }
  );

  // ── 2. Progress Snapshot Refresh ────────────────────────────────────────────
  // Daily at 02:00 AM — refresh all student snapshots
  registerJob(
    'snapshot-daily-refresh',
    '0 2 * * *', // 2 AM daily
    async () => {
      const { refreshForClassRoom } = require('../../modules/progress-snapshot/snapshot.service');

      const classRooms = await prisma.classRoom.findMany({
        where: { type: { in: ['REGULAR'] } },
        select: { id: true },
      });

      for (const cls of classRooms) {
        await refreshForClassRoom(cls.id);
      }

      logger.info({ classRooms: classRooms.length }, 'Cron: snapshots refreshed');
    }
  );

  // ── 3. Goals Risk Check ─────────────────────────────────────────────────────
  // Every day at 08:00 AM — check goal progress and mark at-risk
  registerJob(
    'goals-risk-check',
    '0 8 * * *', // 8 AM daily
    async () => {
      const { checkGoalsForRisk } = require('../../modules/student-goals/goals.service');
      const result = await checkGoalsForRisk();
      logger.info(result, 'Cron: goals risk check done');
    }
  );

  // ── 4. Expired Notification Cleanup ────────────────────────────────────────
  // Every day at 03:00 AM — delete expired notifications
  registerJob(
    'notification-cleanup',
    '0 3 * * *', // 3 AM daily
    async () => {
      const repo = require('../../modules/notifications/notifications.repository');
      const result = await repo.deleteExpired();
      logger.info({ deleted: result.count }, 'Cron: expired notifications cleaned up');
    }
  );

  // ── 5. Attendance streak update ─────────────────────────────────────────────
  // Every day at 06:00 AM — recalculate streaks for active students
  registerJob(
    'attendance-streak-updater',
    '0 6 * * *',
    async () => {
      const activeStudents = await prisma.student.findMany({
        where: {
          studentType: { in: ['REGULAR', 'REGULAR_HIFZ'] },
          currentEnrollmentId: { not: null },
        },
        select: { id: true },
        take: 500, // Process in batches to avoid memory issues
      });

      const { refreshSnapshot } = require('../../modules/progress-snapshot/snapshot.service');
      let processed = 0;

      for (const student of activeStudents) {
        try {
          await refreshSnapshot(student.id);
          processed++;
        } catch (_) {}
      }

      logger.info({ processed }, 'Cron: streak update done');
    }
  );

  // Start all registered jobs
  startAll();
  logger.info('✅ All cron jobs registered and started');
};

module.exports = { registerAllJobs, stopAll };