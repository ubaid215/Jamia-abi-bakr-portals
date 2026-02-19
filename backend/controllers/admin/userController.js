// controllers/admin/userController.js — User management (create admin, list users, status, delete)
const prisma = require('../../db/prismaClient');
const bcrypt = require('bcryptjs');
const logger = require('../../utils/logger');
const { invalidateUserCache } = require('../../middlewares/auth');
const { generateStrongPassword, generateEmail } = require('../../utils/passwordGenerator');

const saltRounds = 12;

// Create admin user
async function createAdmin(req, res) {
    try {
        const { name, phone } = req.body;

        // Generate email and password
        const email = generateEmail(name, 'admin');
        const password = generateStrongPassword();
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists. Please try a different name.' });
        }

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
                name,
                phone: phone || null,
                role: 'ADMIN',
                forcePasswordReset: true,
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                status: true,
                createdAt: true,
            }
        });

        logger.info({ userId: user.id, email: user.email }, 'Admin created');

        res.status(201).json({
            message: 'Admin created successfully',
            credentials: { email: user.email, password },
            user
        });

    } catch (error) {
        logger.error({ err: error }, 'Create admin error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Update user status (activate/deactivate/terminate)
async function updateUserStatus(req, res) {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        if (!['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent changing super admin status
        if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Cannot modify super admin status' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { status },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
            }
        });

        // Invalidate cache so auth middleware picks up the status change
        await invalidateUserCache(userId);

        logger.info({ userId, newStatus: status }, 'User status updated');

        res.json({
            message: `User status updated to ${status}`,
            user: updatedUser
        });

    } catch (error) {
        logger.error({ err: error }, 'Update user status error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Get all users (for user management)
async function getUsers(req, res) {
    try {
        const { role, search, page = 1, limit = 50 } = req.query;
        const skip = (page - 1) * limit;

        const where = {};
        if (role && role !== 'ALL') {
            where.role = role;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                {
                    studentProfile: {
                        admissionNo: { contains: search, mode: 'insensitive' }
                    }
                }
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip: parseInt(skip),
                take: parseInt(limit),
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                    status: true,
                    profileImage: true,
                    createdAt: true,
                    teacherProfile: {
                        select: {
                            id: true,
                            specialization: true,
                            experience: true
                        }
                    },
                    studentProfile: {
                        select: {
                            id: true,
                            admissionNo: true,
                            currentEnrollment: {
                                include: {
                                    classRoom: {
                                        select: {
                                            id: true,
                                            name: true,
                                            grade: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error({ err: error }, 'Get users error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Delete user (Super Admin only)
async function deleteUser(req, res) {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent self-deletion
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // Prevent deleting super admins
        if (user.role === 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Cannot delete super admin accounts' });
        }

        await prisma.user.delete({ where: { id } });

        // Invalidate cache
        await invalidateUserCache(id);

        logger.info({ userId: id, name: user.name }, 'User deleted');

        res.json({
            message: 'User deleted successfully',
            deletedUser: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        logger.error({ err: error }, 'Delete user error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    createAdmin,
    updateUserStatus,
    getUsers,
    deleteUser,
};
