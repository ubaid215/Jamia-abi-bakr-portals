/**
 * Notification Cleanup & Alert Job
 * 1. Cleans up expired notifications daily at 02:00
 * 2. Checks for overdue goals daily at 08:00 and triggers alerts
 */
const cron = require('node-cron');
const notificationService = require('../modules/notifications/notification.service');
const goalsService = require('../modules/goals/goals.service');
const prisma = require('../db/prismaClient');
const logger = require('../utils/logger');

function startNotificationJobs() {
    // ─── Cleanup expired notifications: daily at 02:00 ───
    cron.schedule('0 2 * * *', async () => {
        logger.info('Starting notification cleanup job');
        try {
            const result = await notificationService.cleanupExpired();
            logger.info({ deleted: result.deleted }, 'Notification cleanup completed');
        } catch (error) {
            logger.error({ err: error }, 'Notification cleanup failed');
        }
    });

    // ─── Check overdue goals: daily at 08:00 ───
    cron.schedule('0 8 * * *', async () => {
        logger.info('Starting overdue goals check');
        try {
            const { goals } = await goalsService.getOverdue({ page: 1, limit: 100 });

            for (const goal of goals) {
                try {
                    const studentName = goal.student?.user?.name || 'Unknown';
                    await notificationService.triggerGoalOverdue(goal, studentName);
                } catch (err) {
                    logger.error({ goalId: goal.id, err }, 'Goal overdue notification failed');
                }
            }

            logger.info({ overdueCount: goals.length }, 'Overdue goals check completed');
        } catch (error) {
            logger.error({ err: error }, 'Overdue goals check failed');
        }
    });

    logger.info('Notification jobs scheduled (cleanup 02:00, overdue goals 08:00)');
}

module.exports = { startNotificationJobs };
