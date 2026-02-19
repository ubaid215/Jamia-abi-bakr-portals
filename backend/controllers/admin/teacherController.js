// controllers/admin/teacherController.js — Teacher CRUD operations
const prisma = require('../../db/prismaClient');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { generateStrongPassword, generateEmail } = require('../../utils/passwordGenerator');

const saltRounds = 12;

// Get all teachers
async function getAllTeachers(req, res) {
    try {
        const { page = 1, limit = 50, search, status } = req.query;
        const skip = (page - 1) * limit;

        const where = {
            user: {
                role: 'TEACHER',
                ...(status && { status }),
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                    ],
                }),
            },
        };

        const [teachers, total] = await Promise.all([
            prisma.teacher.findMany({
                where,
                skip: parseInt(skip),
                take: parseInt(limit),
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            profileImage: true,
                            status: true,
                            createdAt: true,
                        },
                    },
                    classes: {
                        select: {
                            id: true,
                            name: true,
                            grade: true,
                            type: true,
                        },
                    },
                    subjects: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: { user: { createdAt: 'desc' } },
            }),
            prisma.teacher.count({ where }),
        ]);

        res.json({
            teachers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Get all teachers error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Get teacher details by ID
async function getTeacherDetails(req, res) {
    try {
        const { id } = req.params;

        // Try by userId first, then by teacher.id
        let teacher = await prisma.teacher.findFirst({
            where: { userId: id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        profileImage: true,
                        status: true,
                        createdAt: true,
                    },
                },
                classes: {
                    include: {
                        _count: {
                            select: { enrollments: { where: { isCurrent: true } } },
                        },
                    },
                },
                subjects: {
                    include: {
                        classRoom: {
                            select: { name: true },
                        },
                    },
                },
            },
        });

        if (!teacher) {
            teacher = await prisma.teacher.findUnique({
                where: { id },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            profileImage: true,
                            status: true,
                            createdAt: true,
                        },
                    },
                    classes: {
                        include: {
                            _count: {
                                select: { enrollments: { where: { isCurrent: true } } },
                            },
                        },
                    },
                    subjects: {
                        include: {
                            classRoom: {
                                select: { name: true },
                            },
                        },
                    },
                },
            });
        }

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        res.json({
            teacher: teacher.user,
            profile: {
                bio: teacher.bio,
                specialization: teacher.specialization,
                qualification: teacher.qualification,
                experience: teacher.experience,
                cnic: teacher.cnic,
                joiningDate: teacher.joiningDate,
                salary: teacher.salary,
                employmentType: teacher.employmentType,
            },
            classes: teacher.classes,
            subjects: teacher.subjects,
        });
    } catch (error) {
        logger.error({ err: error }, 'Get teacher details error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Update teacher
async function updateTeacher(req, res) {
    try {
        const { id } = req.params;
        const {
            name, email, phone, status,
            bio, specialization, qualification, experience,
            cnic, salary, employmentType,
        } = req.body;

        // Find teacher
        let teacher = await prisma.teacher.findFirst({
            where: { userId: id },
            include: { user: true },
        });

        if (!teacher) {
            teacher = await prisma.teacher.findUnique({
                where: { id },
                include: { user: true },
            });
        }

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        // Prepare update data
        const userUpdateData = {};
        if (name) userUpdateData.name = name;
        if (email && email !== teacher.user.email) {
            const existingUser = await prisma.user.findFirst({
                where: { email, NOT: { id: teacher.userId } },
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use' });
            }
            userUpdateData.email = email;
        }
        if (phone) userUpdateData.phone = phone;
        if (status && ['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(status)) {
            userUpdateData.status = status;
        }

        const teacherUpdateData = {};
        if (bio !== undefined) teacherUpdateData.bio = bio;
        if (specialization !== undefined) teacherUpdateData.specialization = specialization;
        if (qualification !== undefined) teacherUpdateData.qualification = qualification;
        if (experience !== undefined) teacherUpdateData.experience = experience;
        if (cnic !== undefined) teacherUpdateData.cnic = cnic;
        if (salary !== undefined) teacherUpdateData.salary = salary;
        if (employmentType !== undefined) teacherUpdateData.employmentType = employmentType;

        const result = await prisma.$transaction(async (tx) => {
            let updatedUser = teacher.user;
            if (Object.keys(userUpdateData).length > 0) {
                updatedUser = await tx.user.update({
                    where: { id: teacher.userId },
                    data: userUpdateData,
                });
            }

            let updatedTeacher = teacher;
            if (Object.keys(teacherUpdateData).length > 0) {
                updatedTeacher = await tx.teacher.update({
                    where: { id: teacher.id },
                    data: teacherUpdateData,
                });
            }

            return { user: updatedUser, teacher: updatedTeacher };
        });

        const { passwordHash, ...userWithoutPassword } = result.user;

        logger.info({ teacherId: teacher.id, userId: teacher.userId }, 'Teacher updated');

        res.json({
            message: 'Teacher updated successfully',
            teacher: {
                ...userWithoutPassword,
                profile: {
                    bio: result.teacher.bio,
                    specialization: result.teacher.specialization,
                    qualification: result.teacher.qualification,
                    experience: result.teacher.experience,
                },
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Update teacher error');
        res.status(500).json({
            error: 'Failed to update teacher',
            details: error.message,
        });
    }
}

// Delete teacher and related data
async function deleteTeacher(req, res) {
    try {
        const { id } = req.params;

        let teacher = await prisma.teacher.findFirst({
            where: { userId: id },
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true, status: true },
                },
            },
        });

        if (!teacher) {
            teacher = await prisma.teacher.findUnique({
                where: { id },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, role: true, status: true },
                    },
                },
            });
        }

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        if (teacher.user.role === 'SUPER_ADMIN' || teacher.user.role === 'ADMIN') {
            return res.status(403).json({
                error: `Cannot delete ${teacher.user.role} account. Use user management instead.`,
            });
        }

        const pendingLeaveRequests = await prisma.leaveRequest.count({
            where: { teacherId: teacher.id, status: 'PENDING' },
        });

        if (pendingLeaveRequests > 0) {
            return res.status(400).json({
                error: 'Cannot delete teacher with pending leave requests',
                pendingRequests: pendingLeaveRequests,
            });
        }

        const teacherInfo = {
            id: teacher.id,
            userId: teacher.userId,
            name: teacher.user.name,
            email: teacher.user.email,
        };

        await prisma.$transaction(async (tx) => {
            await tx.subject.updateMany({ where: { teacherId: teacher.id }, data: { teacherId: null } });
            await tx.classRoom.updateMany({ where: { teacherId: teacher.id }, data: { teacherId: null } });
            await tx.attendance.deleteMany({ where: { teacherId: teacher.id } });
            await Promise.all([
                tx.hifzProgress.deleteMany({ where: { teacherId: teacher.id } }),
                tx.nazraProgress.deleteMany({ where: { teacherId: teacher.id } }),
                tx.subjectProgress.deleteMany({ where: { teacherId: teacher.id } }),
            ]);
            await tx.leaveRequest.deleteMany({ where: { teacherId: teacher.id } });
            await tx.teacher.delete({ where: { id: teacher.id } });
            await tx.user.delete({ where: { id: teacher.userId } });
        });

        // Clean up uploaded files (non-blocking)
        try {
            const filesToDelete = [
                teacher.profileImage,
                teacher.cnicFront,
                teacher.cnicBack,
            ].filter(file => file && fs.existsSync(file));

            const degreeDocs = teacher.degreeDocuments ? JSON.parse(teacher.degreeDocuments) : [];
            const otherDocs = teacher.otherDocuments ? JSON.parse(teacher.otherDocuments) : [];
            filesToDelete.push(...degreeDocs, ...otherDocs);

            for (const filePath of filesToDelete) {
                if (filePath && fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch (fileError) {
            logger.warn({ err: fileError }, 'Error cleaning up teacher files');
        }

        logger.info({ teacherId: teacherInfo.id, name: teacherInfo.name }, 'Teacher deleted');

        res.json({
            message: 'Teacher deleted successfully',
            deletedTeacher: teacherInfo,
        });
    } catch (error) {
        logger.error({ err: error }, 'Delete teacher error');
        res.status(500).json({
            error: 'Failed to delete teacher',
            details: error.message,
        });
    }
}

module.exports = {
    getAllTeachers,
    getTeacherDetails,
    updateTeacher,
    deleteTeacher,
};
