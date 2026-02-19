const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

class NotificationService {

    // ────────────────────────────────────────────────
    // Create a single notification
    // ────────────────────────────────────────────────
    async create(data) {
        const notification = await prisma.progressNotification.create({
            data: {
                studentId: data.studentId,
                recipientType: data.recipientType,
                recipientId: data.recipientId,
                notificationType: data.notificationType,
                category: data.category || null,
                priority: data.priority || 'NORMAL',
                title: data.title,
                message: data.message,
                data: data.data || null,
                requiresAction: data.requiresAction || false,
                actionType: data.actionType || null,
                actionDeadline: data.actionDeadline || null,
                actionUrl: data.actionUrl || null,
                deliveryMethod: data.deliveryMethod || ['IN_APP'],
                expiresAt: data.expiresAt || null,
                batchId: data.batchId || null,
            },
        });

        logger.info({ notificationId: notification.id, recipientId: data.recipientId }, 'Notification created');
        return notification;
    }

    // ────────────────────────────────────────────────
    // Bulk create notifications (batch)
    // ────────────────────────────────────────────────
    async bulkCreate(notifications) {
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const created = [];
        for (const n of notifications) {
            try {
                const notif = await this.create({ ...n, batchId });
                created.push(notif);
            } catch (error) {
                logger.error({ err: error, notification: n }, 'Bulk create notification failed');
            }
        }

        logger.info({ batchId, count: created.length }, 'Bulk notifications created');
        return { batchId, count: created.length, notifications: created };
    }

    // ────────────────────────────────────────────────
    // Get notifications for a recipient
    // ────────────────────────────────────────────────
    async getByRecipient(recipientId, { page = 1, limit = 20, isRead, priority, category } = {}) {
        const where = { recipientId };
        if (isRead !== undefined) where.isRead = isRead === 'true' || isRead === true;
        if (priority) where.priority = priority;
        if (category) where.category = category;

        const [notifications, total] = await Promise.all([
            prisma.progressNotification.findMany({
                where,
                orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
                skip: (page - 1) * limit,
                take: parseInt(limit),
                include: {
                    student: {
                        include: {
                            user: { select: { name: true, profileImage: true } },
                        },
                    },
                },
            }),
            prisma.progressNotification.count({ where }),
        ]);

        return {
            notifications,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        };
    }

    // ────────────────────────────────────────────────
    // Get unread count
    // ────────────────────────────────────────────────
    async getUnreadCount(recipientId) {
        return prisma.progressNotification.count({
            where: { recipientId, isRead: false },
        });
    }

    // ────────────────────────────────────────────────
    // Mark as read
    // ────────────────────────────────────────────────
    async markAsRead(id) {
        return prisma.progressNotification.update({
            where: { id },
            data: { isRead: true, readAt: new Date() },
        });
    }

    // ────────────────────────────────────────────────
    // Mark all as read for a recipient
    // ────────────────────────────────────────────────
    async markAllRead(recipientId) {
        const result = await prisma.progressNotification.updateMany({
            where: { recipientId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
        return { count: result.count };
    }

    // ────────────────────────────────────────────────
    // Cleanup expired notifications
    // ────────────────────────────────────────────────
    async cleanupExpired() {
        const result = await prisma.progressNotification.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
            },
        });
        logger.info({ deleted: result.count }, 'Expired notifications cleaned up');
        return { deleted: result.count };
    }

    // ────────────────────────────────────────────────
    // Trigger notifications for risk level changes
    // ────────────────────────────────────────────────
    async triggerRiskAlert(studentId, riskLevel, attentionReasons) {
        // Get student with their teacher/admin info
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                user: { select: { name: true } },
                enrollments: {
                    where: { isCurrent: true },
                    include: {
                        classRoom: {
                            select: { name: true, teacherId: true },
                        },
                    },
                    take: 1,
                },
            },
        });

        if (!student) return;

        const studentName = student.user?.name || 'Unknown Student';
        const enrollment = student.enrollments?.[0];
        const notifications = [];

        // Notify teacher
        if (enrollment?.classRoom?.teacherId) {
            const teacher = await prisma.teacher.findUnique({
                where: { id: enrollment.classRoom.teacherId },
                select: { userId: true },
            });
            if (teacher) {
                notifications.push({
                    studentId,
                    recipientType: 'TEACHER',
                    recipientId: teacher.userId,
                    notificationType: 'RISK_ALERT',
                    category: 'ACADEMIC',
                    priority: riskLevel === 'CRITICAL' ? 'URGENT' : 'HIGH',
                    title: `${riskLevel} Risk: ${studentName}`,
                    message: `${studentName} has been flagged as ${riskLevel} risk. Reasons: ${attentionReasons.join(', ')}`,
                    requiresAction: true,
                    actionType: 'REVIEW_STUDENT',
                    actionUrl: `/progress/student/${studentId}`,
                });
            }
        }

        // Notify admins
        const admins = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
            select: { id: true },
            take: 10,
        });

        admins.forEach((admin) => {
            notifications.push({
                studentId,
                recipientType: 'ADMIN',
                recipientId: admin.id,
                notificationType: 'RISK_ALERT',
                category: 'ACADEMIC',
                priority: riskLevel === 'CRITICAL' ? 'URGENT' : 'HIGH',
                title: `${riskLevel} Risk: ${studentName}`,
                message: `${studentName} (${enrollment?.classRoom?.name || 'N/A'}) flagged as ${riskLevel}. ${attentionReasons.join(', ')}`,
                requiresAction: riskLevel === 'CRITICAL',
                actionType: 'REVIEW_STUDENT',
                actionUrl: `/admin/risk-management`,
            });
        });

        if (notifications.length > 0) {
            await this.bulkCreate(notifications);
        }
    }

    // ────────────────────────────────────────────────
    // Trigger notification for overdue goals
    // ────────────────────────────────────────────────
    async triggerGoalOverdue(goal, studentName) {
        const notifications = [];

        if (goal.teacherId) {
            const teacher = await prisma.teacher.findUnique({
                where: { id: goal.teacherId },
                select: { userId: true },
            });
            if (teacher) {
                notifications.push({
                    studentId: goal.studentId,
                    recipientType: 'TEACHER',
                    recipientId: teacher.userId,
                    notificationType: 'GOAL_OVERDUE',
                    category: 'GOALS',
                    priority: 'HIGH',
                    title: `Goal Overdue: ${goal.title}`,
                    message: `Goal "${goal.title}" for ${studentName} has passed its target date with ${goal.progress}% progress.`,
                    requiresAction: true,
                    actionType: 'REVIEW_GOAL',
                    actionUrl: `/goals/student/${goal.studentId}`,
                });
            }
        }

        if (notifications.length > 0) {
            await this.bulkCreate(notifications);
        }
    }
}

module.exports = new NotificationService();
