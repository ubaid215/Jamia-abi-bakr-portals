const goalsService = require('./goals.service');
const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

class GoalsController {

    // POST /api/goals
    async create(req, res) {
        try {
            // Resolve teacher ID from auth
            let teacherId = null;
            if (req.user.role === 'TEACHER') {
                const teacher = await prisma.teacher.findUnique({
                    where: { userId: req.user.id },
                    select: { id: true },
                });
                teacherId = teacher?.id;
            }

            const { studentId, goalType, title, metric, targetValue, unit, startDate, targetDate } = req.body;
            if (!studentId || !goalType || !title || !metric || !targetValue || !unit || !startDate || !targetDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Required fields: studentId, goalType, title, metric, targetValue, unit, startDate, targetDate',
                });
            }

            const goal = await goalsService.create(req.body, teacherId);
            res.status(201).json({ success: true, data: goal });
        } catch (error) {
            logger.error({ err: error }, 'Create goal error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // PUT /api/goals/:id/progress
    async updateProgress(req, res) {
        try {
            const { id } = req.params;
            const { currentValue } = req.body;

            if (currentValue === undefined) {
                return res.status(400).json({ success: false, error: 'currentValue is required' });
            }

            const goal = await goalsService.updateProgress(id, currentValue);
            res.json({ success: true, data: goal });
        } catch (error) {
            logger.error({ err: error }, 'Update goal progress error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // PUT /api/goals/:id/achieve
    async achieve(req, res) {
        try {
            const { id } = req.params;
            const goal = await goalsService.achieve(id);
            res.json({ success: true, data: goal });
        } catch (error) {
            logger.error({ err: error }, 'Achieve goal error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // PUT /api/goals/:id
    async update(req, res) {
        try {
            const { id } = req.params;
            const goal = await goalsService.update(id, req.body);
            res.json({ success: true, data: goal });
        } catch (error) {
            logger.error({ err: error }, 'Update goal error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // GET /api/goals/student/:studentId
    async getByStudent(req, res) {
        try {
            const { studentId } = req.params;
            const { page, limit, status, goalType } = req.query;

            const result = await goalsService.getByStudent(studentId, {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                status,
                goalType,
            });

            res.json({ success: true, ...result });
        } catch (error) {
            logger.error({ err: error }, 'Get student goals error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // GET /api/goals/teacher/:teacherId
    async getByTeacher(req, res) {
        try {
            const { teacherId } = req.params;
            const { page, limit, status } = req.query;

            const result = await goalsService.getByTeacher(teacherId, {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                status,
            });

            res.json({ success: true, ...result });
        } catch (error) {
            logger.error({ err: error }, 'Get teacher goals error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // GET /api/goals/overdue
    async getOverdue(req, res) {
        try {
            const { page, limit } = req.query;
            const result = await goalsService.getOverdue({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
            });
            res.json({ success: true, ...result });
        } catch (error) {
            logger.error({ err: error }, 'Get overdue goals error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // GET /api/goals/stats
    async getStats(req, res) {
        try {
            const { studentId, teacherId } = req.query;
            const stats = await goalsService.getStats({ studentId, teacherId });
            res.json({ success: true, data: stats });
        } catch (error) {
            logger.error({ err: error }, 'Get goal stats error');
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new GoalsController();
