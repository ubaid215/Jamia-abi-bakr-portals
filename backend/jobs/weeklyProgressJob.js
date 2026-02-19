/**
 * Weekly Progress Auto-Generation Job
 * Runs every Sunday at midnight to generate weekly reports for all enrolled students.
 */
const cron = require('node-cron');
const prisma = require('../db/prismaClient');
const weeklyProgressService = require('../modules/weeklyProgress/weeklyProgress.service');
const logger = require('../utils/logger');

function getISOWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function startWeeklyProgressJob() {
    // Run every Sunday at 00:00
    cron.schedule('0 0 * * 0', async () => {
        logger.info('Starting weekly progress auto-generation job');

        try {
            const now = new Date();
            const weekNumber = getISOWeekNumber(now) - 1; // Previous week
            const year = now.getFullYear();

            // Get all classes with current enrollments
            const classes = await prisma.classRoom.findMany({
                where: {
                    enrollments: { some: { isCurrent: true } },
                },
                select: { id: true, name: true },
            });

            let totalGenerated = 0;
            let totalFailed = 0;

            for (const cls of classes) {
                try {
                    const results = await weeklyProgressService.bulkGenerate(
                        cls.id,
                        weekNumber,
                        year,
                        null // System-generated
                    );
                    const succeeded = results.filter((r) => r.success).length;
                    const failed = results.filter((r) => !r.success).length;
                    totalGenerated += succeeded;
                    totalFailed += failed;

                    logger.info({ classId: cls.id, className: cls.name, succeeded, failed }, 'Class weekly reports generated');
                } catch (error) {
                    logger.error({ classId: cls.id, err: error }, 'Class weekly report generation failed');
                }
            }

            logger.info({ totalGenerated, totalFailed, weekNumber, year }, 'Weekly progress job completed');
        } catch (error) {
            logger.error({ err: error }, 'Weekly progress job failed');
        }
    });

    logger.info('Weekly progress auto-generation job scheduled (Sundays 00:00)');
}

module.exports = { startWeeklyProgressJob };
