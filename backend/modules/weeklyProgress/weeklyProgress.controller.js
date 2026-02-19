const weeklyProgressService = require('./weeklyProgress.service');
const logger = require('../../utils/logger');

class WeeklyProgressController {

    // POST /api/weekly-progress/generate
    async generate(req, res) {
        try {
            const { studentId, weekNumber, year } = req.body;

            if (!studentId || !weekNumber || !year) {
                return res.status(400).json({
                    success: false,
                    error: 'studentId, weekNumber, and year are required',
                });
            }

            // Get teacher ID from auth if teacher role
            const teacherId = req.user.role === 'TEACHER'
                ? (await require('../../db/prismaClient').teacher.findUnique({
                    where: { userId: req.user.id },
                    select: { id: true },
                }))?.id
                : null;

            const report = await weeklyProgressService.generateWeeklyReport(
                studentId,
                parseInt(weekNumber),
                parseInt(year),
                teacherId
            );

            res.status(201).json({ success: true, data: report });
        } catch (error) {
            logger.error({ err: error }, 'Generate weekly progress error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // POST /api/weekly-progress/bulk-generate
    async bulkGenerate(req, res) {
        try {
            const { classRoomId, weekNumber, year } = req.body;

            if (!classRoomId || !weekNumber || !year) {
                return res.status(400).json({
                    success: false,
                    error: 'classRoomId, weekNumber, and year are required',
                });
            }

            const teacherId = req.user.role === 'TEACHER'
                ? (await require('../../db/prismaClient').teacher.findUnique({
                    where: { userId: req.user.id },
                    select: { id: true },
                }))?.id
                : null;

            const results = await weeklyProgressService.bulkGenerate(
                classRoomId,
                parseInt(weekNumber),
                parseInt(year),
                teacherId
            );

            const succeeded = results.filter((r) => r.success).length;
            const failed = results.filter((r) => !r.success).length;

            res.status(201).json({
                success: true,
                data: { total: results.length, succeeded, failed, results },
            });
        } catch (error) {
            logger.error({ err: error }, 'Bulk generate weekly progress error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // GET /api/weekly-progress/student/:studentId
    async getByStudent(req, res) {
        try {
            const { studentId } = req.params;
            const { page, limit, year } = req.query;

            const result = await weeklyProgressService.getByStudent(studentId, {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                year,
            });

            res.json({ success: true, ...result });
        } catch (error) {
            logger.error({ err: error }, 'Get student weekly progress error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // GET /api/weekly-progress/class/:classRoomId
    async getByClass(req, res) {
        try {
            const { classRoomId } = req.params;
            const { weekNumber, year } = req.query;

            if (!weekNumber || !year) {
                return res.status(400).json({
                    success: false,
                    error: 'weekNumber and year query params are required',
                });
            }

            const reports = await weeklyProgressService.getByClass(
                classRoomId,
                parseInt(weekNumber),
                parseInt(year)
            );

            res.json({ success: true, data: reports });
        } catch (error) {
            logger.error({ err: error }, 'Get class weekly progress error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // PUT /api/weekly-progress/:id/comments
    async updateComments(req, res) {
        try {
            const { id } = req.params;
            const { teacherComments, weeklyHighlights, areasOfImprovement, actionItems, followUpRequired } = req.body;

            const updated = await weeklyProgressService.updateComments(id, {
                teacherComments,
                weeklyHighlights,
                areasOfImprovement,
                actionItems,
                followUpRequired,
            });

            res.json({ success: true, data: updated });
        } catch (error) {
            logger.error({ err: error }, 'Update weekly comments error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // GET /api/weekly-progress/at-risk
    async getAtRisk(req, res) {
        try {
            const { classRoomId, weekNumber, year, page, limit } = req.query;

            const result = await weeklyProgressService.getAtRiskStudents({
                classRoomId,
                weekNumber: weekNumber ? parseInt(weekNumber) : undefined,
                year: year ? parseInt(year) : undefined,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
            });

            res.json({ success: true, ...result });
        } catch (error) {
            logger.error({ err: error }, 'Get at-risk students error');
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new WeeklyProgressController();
