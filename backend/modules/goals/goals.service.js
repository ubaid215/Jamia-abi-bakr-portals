const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

class GoalsService {

    // ────────────────────────────────────────────────
    // Create a goal
    // ────────────────────────────────────────────────
    async create(data, teacherId) {
        const goal = await prisma.studentGoal.create({
            data: {
                studentId: data.studentId,
                teacherId: teacherId || null,
                goalType: data.goalType,
                category: data.category || null,
                title: data.title,
                description: data.description || null,
                metric: data.metric,
                targetValue: parseFloat(data.targetValue),
                currentValue: parseFloat(data.currentValue || 0),
                baselineValue: parseFloat(data.baselineValue || 0),
                unit: data.unit,
                startDate: new Date(data.startDate),
                targetDate: new Date(data.targetDate),
                status: 'IN_PROGRESS',
                progress: 0,
                milestones: data.milestones || null,
                checkFrequency: data.checkFrequency || 'WEEKLY',
                supportActions: data.supportActions || null,
                visibleToStudent: data.visibleToStudent !== false,
                visibleToParent: data.visibleToParent !== false,
            },
        });

        logger.info({ goalId: goal.id, studentId: data.studentId }, 'Student goal created');
        return goal;
    }

    // ────────────────────────────────────────────────
    // Update progress on a goal
    // ────────────────────────────────────────────────
    async updateProgress(goalId, currentValue) {
        const goal = await prisma.studentGoal.findUnique({ where: { id: goalId } });
        if (!goal) throw new Error('Goal not found');

        const newValue = parseFloat(currentValue);
        const range = goal.targetValue - goal.baselineValue;
        const progress = range > 0
            ? Math.min(100, Math.max(0, +(((newValue - goal.baselineValue) / range) * 100).toFixed(1)))
            : (newValue >= goal.targetValue ? 100 : 0);

        const updates = {
            currentValue: newValue,
            progress,
            lastChecked: new Date(),
        };

        // Auto-achieve if 100%
        if (progress >= 100 && goal.status !== 'ACHIEVED') {
            updates.status = 'ACHIEVED';
            updates.achievedAt = new Date();
        }

        const updated = await prisma.studentGoal.update({
            where: { id: goalId },
            data: updates,
        });

        logger.info({ goalId, progress: updates.progress }, 'Goal progress updated');
        return updated;
    }

    // ────────────────────────────────────────────────
    // Mark goal as achieved
    // ────────────────────────────────────────────────
    async achieve(goalId) {
        return prisma.studentGoal.update({
            where: { id: goalId },
            data: {
                status: 'ACHIEVED',
                progress: 100,
                achievedAt: new Date(),
            },
        });
    }

    // ────────────────────────────────────────────────
    // Get goals for a student
    // ────────────────────────────────────────────────
    async getByStudent(studentId, { page = 1, limit = 10, status, goalType } = {}) {
        const where = { studentId };
        if (status) where.status = status;
        if (goalType) where.goalType = goalType;

        const [goals, total] = await Promise.all([
            prisma.studentGoal.findMany({
                where,
                orderBy: [{ status: 'asc' }, { targetDate: 'asc' }],
                skip: (page - 1) * limit,
                take: parseInt(limit),
                include: {
                    teacher: {
                        include: { user: { select: { name: true } } },
                    },
                },
            }),
            prisma.studentGoal.count({ where }),
        ]);

        return {
            goals,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        };
    }

    // ────────────────────────────────────────────────
    // Get goals created by a teacher
    // ────────────────────────────────────────────────
    async getByTeacher(teacherId, { page = 1, limit = 20, status } = {}) {
        const where = { teacherId };
        if (status) where.status = status;

        const [goals, total] = await Promise.all([
            prisma.studentGoal.findMany({
                where,
                orderBy: [{ targetDate: 'asc' }],
                skip: (page - 1) * limit,
                take: parseInt(limit),
                include: {
                    student: {
                        include: { user: { select: { name: true, profileImage: true } } },
                    },
                },
            }),
            prisma.studentGoal.count({ where }),
        ]);

        return {
            goals,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        };
    }

    // ────────────────────────────────────────────────
    // Get overdue goals
    // ────────────────────────────────────────────────
    async getOverdue({ page = 1, limit = 20 } = {}) {
        const where = {
            targetDate: { lt: new Date() },
            status: 'IN_PROGRESS',
        };

        const [goals, total] = await Promise.all([
            prisma.studentGoal.findMany({
                where,
                orderBy: { targetDate: 'asc' },
                skip: (page - 1) * limit,
                take: parseInt(limit),
                include: {
                    student: {
                        include: { user: { select: { name: true, profileImage: true } } },
                    },
                    teacher: {
                        include: { user: { select: { name: true } } },
                    },
                },
            }),
            prisma.studentGoal.count({ where }),
        ]);

        return {
            goals,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        };
    }

    // ────────────────────────────────────────────────
    // Get goal statistics for a class / system
    // ────────────────────────────────────────────────
    async getStats(filters = {}) {
        const where = {};
        if (filters.studentId) where.studentId = filters.studentId;
        if (filters.teacherId) where.teacherId = filters.teacherId;

        const [total, inProgress, achieved, overdue] = await Promise.all([
            prisma.studentGoal.count({ where }),
            prisma.studentGoal.count({ where: { ...where, status: 'IN_PROGRESS' } }),
            prisma.studentGoal.count({ where: { ...where, status: 'ACHIEVED' } }),
            prisma.studentGoal.count({
                where: { ...where, status: 'IN_PROGRESS', targetDate: { lt: new Date() } },
            }),
        ]);

        return {
            total,
            inProgress,
            achieved,
            overdue,
            achievementRate: total > 0 ? +((achieved / total) * 100).toFixed(1) : 0,
        };
    }

    // ────────────────────────────────────────────────
    // Update goal details
    // ────────────────────────────────────────────────
    async update(goalId, data) {
        const updateData = {};
        const allowedFields = [
            'title', 'description', 'targetValue', 'targetDate',
            'milestones', 'supportActions', 'checkFrequency',
            'visibleToStudent', 'visibleToParent',
        ];

        allowedFields.forEach((field) => {
            if (data[field] !== undefined) {
                if (field === 'targetValue') updateData[field] = parseFloat(data[field]);
                else if (field === 'targetDate') updateData[field] = new Date(data[field]);
                else updateData[field] = data[field];
            }
        });

        return prisma.studentGoal.update({
            where: { id: goalId },
            data: updateData,
        });
    }
}

module.exports = new GoalsService();
