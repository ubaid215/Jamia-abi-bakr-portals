// controllers/admin/studentController.js — Student CRUD + details with progress
const prisma = require('../../db/prismaClient');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

// Get all students (server-side filtered + paginated)
async function getAllStudents(req, res) {
    try {
        const {
            page = 1, limit = 50, search, status,
            classRoomId, gender, sortBy = 'createdAt', sortOrder = 'desc',
        } = req.query;

        const skip = (page - 1) * limit;

        // Build where clause at the database level (not client-side)
        const where = {
            user: {
                role: 'STUDENT',
                ...(status && { status }),
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                    ],
                }),
            },
            ...(gender && { gender }),
            ...(search && {
                OR: [
                    { admissionNo: { contains: search, mode: 'insensitive' } },
                    { guardianName: { contains: search, mode: 'insensitive' } },
                    { user: { name: { contains: search, mode: 'insensitive' } } },
                    { user: { email: { contains: search, mode: 'insensitive' } } },
                ],
            }),
        };

        // Filter by class via enrollment
        if (classRoomId) {
            where.currentEnrollment = { classRoomId };
        }

        const [students, total] = await Promise.all([
            prisma.student.findMany({
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
                    currentEnrollment: {
                        include: {
                            classRoom: {
                                select: {
                                    id: true,
                                    name: true,
                                    grade: true,
                                    type: true,
                                },
                            },
                        },
                    },
                },
                orderBy: sortBy === 'name'
                    ? { user: { name: sortOrder } }
                    : sortBy === 'admissionNo'
                        ? { admissionNo: sortOrder }
                        : { user: { createdAt: sortOrder } },
            }),
            prisma.student.count({ where }),
        ]);

        res.json({
            students,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Get all students error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Update student
async function updateStudent(req, res) {
    try {
        const { id } = req.params;
        const {
            name, email, phone, status,
            dateOfBirth, gender, guardianName, guardianPhone,
            address, city, province,
        } = req.body;

        let student = await prisma.student.findFirst({
            where: { userId: id },
            include: { user: true },
        });

        if (!student) {
            student = await prisma.student.findUnique({
                where: { id },
                include: { user: true },
            });
        }

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const userUpdateData = {};
        if (name) userUpdateData.name = name;
        if (email && email !== student.user.email) {
            const existingUser = await prisma.user.findFirst({
                where: { email, NOT: { id: student.userId } },
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

        const studentUpdateData = {};
        if (dateOfBirth) studentUpdateData.dob = new Date(dateOfBirth);
        if (gender && ['MALE', 'FEMALE', 'OTHER'].includes(gender)) studentUpdateData.gender = gender;
        if (guardianName) studentUpdateData.guardianName = guardianName;
        if (guardianPhone) studentUpdateData.guardianPhone = guardianPhone;
        if (address) studentUpdateData.address = address;
        if (city) studentUpdateData.city = city;
        if (province) studentUpdateData.province = province;

        const result = await prisma.$transaction(async (tx) => {
            let updatedUser = student.user;
            if (Object.keys(userUpdateData).length > 0) {
                updatedUser = await tx.user.update({
                    where: { id: student.userId },
                    data: userUpdateData,
                });
            }

            let updatedStudent = student;
            if (Object.keys(studentUpdateData).length > 0) {
                updatedStudent = await tx.student.update({
                    where: { id: student.id },
                    data: studentUpdateData,
                });
            }

            return { user: updatedUser, student: updatedStudent };
        });

        const { passwordHash, ...userWithoutPassword } = result.user;

        logger.info({ studentId: student.id }, 'Student updated');

        res.json({
            message: 'Student updated successfully',
            student: {
                ...userWithoutPassword,
                profile: {
                    admissionNo: result.student.admissionNo,
                    dateOfBirth: result.student.dob,
                    gender: result.student.gender,
                    guardianName: result.student.guardianName,
                    guardianPhone: result.student.guardianPhone,
                    address: result.student.address,
                    city: result.student.city,
                    province: result.student.province,
                },
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Update student error');
        res.status(500).json({
            error: 'Failed to update student',
            details: error.message,
        });
    }
}

// Get student details by ID (with progress + attendance)
async function getStudentDetails(req, res) {
    try {
        const { id } = req.params;

        const student = await prisma.student.findUnique({
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
                currentEnrollment: {
                    include: {
                        classRoom: {
                            include: {
                                teacher: {
                                    include: {
                                        user: { select: { name: true, email: true } },
                                    },
                                },
                                subjects: {
                                    include: {
                                        teacher: {
                                            include: {
                                                user: { select: { name: true } },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                enrollments: {
                    include: {
                        classRoom: {
                            select: { id: true, name: true, grade: true, type: true },
                        },
                    },
                    orderBy: { startDate: 'desc' },
                },
                parents: {
                    include: {
                        user: {
                            select: { name: true, email: true, phone: true },
                        },
                    },
                },
                attendances: {
                    orderBy: { date: 'desc' },
                    take: 20,
                    include: {
                        subject: { select: { name: true } },
                        classRoom: { select: { name: true } },
                        teacher: {
                            include: {
                                user: { select: { name: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Progress data
        let progressData = {};

        if (student.currentEnrollment) {
            const classType = student.currentEnrollment.classRoom.type;

            if (classType === 'HIFZ') {
                const hifzProgress = await prisma.hifzProgress.findMany({
                    where: { studentId: student.id },
                    orderBy: { date: 'desc' },
                    take: 10,
                    include: {
                        teacher: {
                            include: { user: { select: { name: true } } },
                        },
                    },
                });

                const completionStats = await calculateHifzCompletion(student.id);

                progressData = {
                    type: 'HIFZ',
                    progress: hifzProgress,
                    completionStats,
                };
            } else if (classType === 'NAZRA') {
                const nazraProgress = await prisma.nazraProgress.findMany({
                    where: { studentId: student.id },
                    orderBy: { date: 'desc' },
                    take: 10,
                    include: {
                        teacher: {
                            include: { user: { select: { name: true } } },
                        },
                    },
                });

                const completionStats = await calculateNazraCompletion(student.id);

                progressData = {
                    type: 'NAZRA',
                    progress: nazraProgress,
                    completionStats,
                };
            } else if (classType === 'REGULAR') {
                const [assessments, averageResult] = await Promise.all([
                    prisma.subjectProgress.findMany({
                        where: { studentId: student.id },
                        orderBy: { date: 'desc' },
                        take: 10,
                        include: {
                            subject: { select: { name: true } },
                            teacher: {
                                include: { user: { select: { name: true } } },
                            },
                        },
                    }),
                    prisma.subjectProgress.aggregate({
                        where: { studentId: student.id },
                        _avg: { percentage: true },
                    }),
                ]);

                progressData = {
                    type: 'REGULAR',
                    assessments,
                    averagePercentage: Math.round((averageResult._avg.percentage || 0) * 100) / 100,
                };
            }
        }

        // Attendance stats
        const totalAttendance = student.attendances.length;
        const presentAttendance = student.attendances.filter(
            a => a.status === 'PRESENT' || a.status === 'LATE'
        ).length;

        const attendancePercentage = totalAttendance > 0
            ? (presentAttendance / totalAttendance) * 100
            : 0;

        res.json({
            student: student.user,
            profile: {
                admissionNo: student.admissionNo,
                dateOfBirth: student.dob,
                gender: student.gender,
                guardianName: student.guardianName,
                guardianPhone: student.guardianPhone,
                address: student.address,
            },
            academic: {
                currentEnrollment: student.currentEnrollment,
                classHistory: student.enrollments,
                attendance: {
                    total: totalAttendance,
                    present: presentAttendance,
                    percentage: Math.round(attendancePercentage * 100) / 100,
                    recent: student.attendances,
                },
            },
            progress: progressData,
            parents: student.parents,
        });
    } catch (error) {
        logger.error({ err: error }, 'Get student details error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Delete student and related data
async function deleteStudent(req, res) {
    try {
        const { id } = req.params;

        let student = await prisma.student.findFirst({
            where: { userId: id },
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true, status: true },
                },
                currentEnrollment: {
                    include: { classRoom: { select: { id: true, name: true } } },
                },
            },
        });

        if (!student) {
            student = await prisma.student.findUnique({
                where: { id },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, role: true, status: true },
                    },
                    currentEnrollment: {
                        include: { classRoom: { select: { id: true, name: true } } },
                    },
                },
            });
        }

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const studentInfo = {
            id: student.id,
            userId: student.userId,
            name: student.user.name,
            email: student.user.email,
            admissionNo: student.admissionNo,
        };

        await prisma.$transaction(async (tx) => {
            await tx.enrollment.deleteMany({ where: { studentId: student.id } });
            await tx.student.update({
                where: { id: student.id },
                data: { parents: { set: [] } },
            });
            await tx.attendance.deleteMany({ where: { studentId: student.id } });
            await Promise.all([
                tx.hifzProgress.deleteMany({ where: { studentId: student.id } }),
                tx.nazraProgress.deleteMany({ where: { studentId: student.id } }),
                tx.subjectProgress.deleteMany({ where: { studentId: student.id } }),
            ]);
            await tx.studentHifzStatus.deleteMany({ where: { studentId: student.id } });
            await tx.student.delete({ where: { id: student.id } });
            await tx.user.delete({ where: { id: student.userId } });
        });

        // Clean up files
        try {
            const filesToDelete = [
                student.profileImage,
                student.birthCertificate,
                student.cnicOrBForm,
                student.previousSchoolCertificate,
            ].filter(file => file && fs.existsSync(file));

            const otherDocs = student.otherDocuments ? JSON.parse(student.otherDocuments) : [];
            filesToDelete.push(...otherDocs);

            for (const filePath of filesToDelete) {
                if (filePath && fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch (fileError) {
            logger.warn({ err: fileError }, 'Error cleaning up student files');
        }

        logger.info({ studentId: studentInfo.id, name: studentInfo.name }, 'Student deleted');

        res.json({
            message: 'Student deleted successfully',
            deletedStudent: studentInfo,
        });
    } catch (error) {
        logger.error({ err: error }, 'Delete student error');
        res.status(500).json({
            error: 'Failed to delete student',
            details: error.message,
        });
    }
}

// Helper: Calculate Hifz completion
async function calculateHifzCompletion(studentId) {
    const totalLinesInQuran = 540;

    const progressRecords = await prisma.hifzProgress.findMany({
        where: { studentId },
        orderBy: { date: 'asc' },
    });

    if (progressRecords.length === 0) {
        return {
            totalLinesCompleted: 0,
            parasCompleted: 0,
            completionPercentage: 0,
            estimatedDaysRemaining: null,
            averageDailyLines: 0,
        };
    }

    const totalLinesCompleted = progressRecords.reduce((sum, r) => sum + r.sabaqLines, 0);
    const completionPercentage = (totalLinesCompleted / totalLinesInQuran) * 100;

    const latestProgress = progressRecords[progressRecords.length - 1];
    const parasCompleted = latestProgress.completedParas ? latestProgress.completedParas.length : 0;

    const firstRecord = progressRecords[0];
    const lastRecord = progressRecords[progressRecords.length - 1];
    const daysElapsed = Math.ceil((lastRecord.date - firstRecord.date) / (1000 * 60 * 60 * 24)) || 1;
    const averageDailyLines = totalLinesCompleted / daysElapsed;

    const linesRemaining = totalLinesInQuran - totalLinesCompleted;
    const estimatedDaysRemaining = averageDailyLines > 0 ? Math.ceil(linesRemaining / averageDailyLines) : null;

    return {
        totalLinesCompleted,
        parasCompleted,
        completionPercentage: Math.min(completionPercentage, 100),
        estimatedDaysRemaining,
        averageDailyLines: Math.round(averageDailyLines * 100) / 100,
        currentPara: latestProgress.currentPara || 1,
        currentParaProgress: latestProgress.paraProgress || 0,
    };
}

// Helper: Calculate Nazra completion
async function calculateNazraCompletion(studentId) {
    const totalLinesInQuran = 540;

    const progressRecords = await prisma.nazraProgress.findMany({
        where: { studentId },
        orderBy: { date: 'asc' },
    });

    if (progressRecords.length === 0) {
        return {
            totalLinesRecited: 0,
            completionPercentage: 0,
            estimatedDaysRemaining: null,
            averageDailyLines: 0,
        };
    }

    const totalLinesRecited = progressRecords.reduce((sum, r) => sum + r.recitedLines, 0);
    const completionPercentage = Math.min((totalLinesRecited / totalLinesInQuran) * 100, 100);

    const firstRecord = progressRecords[0];
    const lastRecord = progressRecords[progressRecords.length - 1];
    const daysElapsed = Math.ceil((lastRecord.date - firstRecord.date) / (1000 * 60 * 60 * 24)) || 1;
    const averageDailyLines = totalLinesRecited / daysElapsed;

    const linesRemaining = totalLinesInQuran - Math.min(totalLinesRecited, totalLinesInQuran);
    const estimatedDaysRemaining = averageDailyLines > 0 ? Math.ceil(linesRemaining / averageDailyLines) : null;

    return {
        totalLinesRecited,
        completionPercentage,
        estimatedDaysRemaining,
        averageDailyLines: Math.round(averageDailyLines * 100) / 100,
        isCompleted: completionPercentage >= 100,
    };
}

module.exports = {
    getAllStudents,
    updateStudent,
    getStudentDetails,
    deleteStudent,
};
