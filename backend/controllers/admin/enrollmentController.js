// controllers/admin/enrollmentController.js — Class assignments, promotions, enrollment history
const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');
const { generateRollNumber } = require('../../utils/passwordGenerator');

// Assign teacher to class
async function assignTeacherToClass(req, res) {
    try {
        const { teacherId, classRoomId } = req.body;

        const [teacher, classRoom] = await Promise.all([
            prisma.teacher.findUnique({
                where: { id: teacherId },
                include: { user: { select: { name: true } } },
            }),
            prisma.classRoom.findUnique({ where: { id: classRoomId } }),
        ]);

        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
        if (!classRoom) return res.status(404).json({ error: 'Class not found' });

        const updatedClass = await prisma.classRoom.update({
            where: { id: classRoomId },
            data: { teacherId },
            include: {
                teacher: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
                _count: { select: { enrollments: true, subjects: true } },
            },
        });

        logger.info({ teacherId, classRoomId }, 'Teacher assigned to class');

        res.json({
            message: `Teacher ${teacher.user.name} assigned to ${classRoom.name} successfully`,
            class: updatedClass,
        });
    } catch (error) {
        logger.error({ err: error }, 'Assign teacher to class error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Assign student to class (enroll student)
async function assignStudentToClass(req, res) {
    try {
        const { studentId, classRoomId, startDate } = req.body;

        // Find student by userId or studentId
        let student = await prisma.student.findFirst({
            where: { userId: studentId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                currentEnrollment: {
                    include: { classRoom: { select: { id: true, name: true } } },
                },
            },
        });

        if (!student) {
            student = await prisma.student.findUnique({
                where: { id: studentId },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    currentEnrollment: {
                        include: { classRoom: { select: { id: true, name: true } } },
                    },
                },
            });
        }

        if (!student) return res.status(404).json({ error: 'Student not found' });

        const classRoom = await prisma.classRoom.findUnique({ where: { id: classRoomId } });
        if (!classRoom) return res.status(404).json({ error: 'Class not found' });

        if (student.currentEnrollment) {
            if (student.currentEnrollment.classRoomId === classRoomId) {
                return res.status(400).json({
                    error: 'Student is already enrolled in this class',
                    currentEnrollment: student.currentEnrollment,
                });
            }

            await prisma.enrollment.update({
                where: { id: student.currentEnrollment.id },
                data: { isCurrent: false, endDate: new Date() },
            });
        }

        const newRollNumber = await generateRollNumber(classRoomId, prisma);
        const rollNumberInt = Number(newRollNumber);

        const newEnrollment = await prisma.enrollment.create({
            data: {
                studentId: student.id,
                classRoomId,
                rollNumber: rollNumberInt,
                isCurrent: true,
                startDate: startDate ? new Date(startDate) : new Date(),
            },
            include: {
                classRoom: {
                    select: { id: true, name: true, grade: true, section: true, type: true },
                },
                student: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
            },
        });

        await prisma.student.update({
            where: { id: student.id },
            data: { currentEnrollmentId: newEnrollment.id },
        });

        logger.info({ studentId: student.id, classRoomId }, 'Student assigned to class');

        res.json({
            message: `Student ${student.user.name} assigned to ${classRoom.name} successfully`,
            enrollment: newEnrollment,
            student: {
                id: student.id,
                name: student.user.name,
                admissionNo: student.admissionNo,
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Assign student to class error');
        res.status(500).json({
            error: 'Failed to assign student to class',
            details: error.message,
        });
    }
}

// Remove teacher from class
async function removeTeacherFromClass(req, res) {
    try {
        const { classRoomId } = req.params;

        const classRoom = await prisma.classRoom.findUnique({
            where: { id: classRoomId },
            include: {
                teacher: { include: { user: { select: { name: true } } } },
            },
        });

        if (!classRoom) return res.status(404).json({ error: 'Class not found' });
        if (!classRoom.teacherId) return res.status(400).json({ error: 'No teacher assigned to this class' });

        const teacherName = classRoom.teacher?.user?.name || 'Unknown';

        const updatedClass = await prisma.classRoom.update({
            where: { id: classRoomId },
            data: { teacherId: null },
            include: {
                _count: { select: { enrollments: true, subjects: true } },
            },
        });

        logger.info({ classRoomId }, 'Teacher removed from class');

        res.json({
            message: `Teacher ${teacherName} removed from ${classRoom.name} successfully`,
            class: updatedClass,
        });
    } catch (error) {
        logger.error({ err: error }, 'Remove teacher from class error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Remove student from class (end enrollment)
async function removeStudentFromClass(req, res) {
    try {
        const { enrollmentId } = req.params;
        const { reason } = req.body;

        const enrollment = await prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                student: { include: { user: { select: { name: true } } } },
                classRoom: { select: { name: true } },
            },
        });

        if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
        if (!enrollment.isCurrent) return res.status(400).json({ error: 'Enrollment is already ended' });

        const updatedEnrollment = await prisma.enrollment.update({
            where: { id: enrollmentId },
            data: {
                isCurrent: false,
                endDate: new Date(),
                promotedTo: reason || 'Removed from class',
            },
        });

        await prisma.student.update({
            where: { id: enrollment.studentId },
            data: { currentEnrollmentId: null },
        });

        logger.info({ enrollmentId }, 'Student removed from class');

        res.json({
            message: `Student ${enrollment.student.user.name} removed from ${enrollment.classRoom.name} successfully`,
            enrollment: updatedEnrollment,
        });
    } catch (error) {
        logger.error({ err: error }, 'Remove student from class error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Bulk assign students to class
async function bulkAssignStudentsToClass(req, res) {
    try {
        const { studentIds, classRoomId, startDate } = req.body;

        const classRoom = await prisma.classRoom.findUnique({ where: { id: classRoomId } });
        if (!classRoom) return res.status(404).json({ error: 'Class not found' });

        const results = await prisma.$transaction(async (tx) => {
            const assigned = [];
            const errors = [];

            for (const studentRequestedId of studentIds) {
                try {
                    let student = await tx.student.findFirst({
                        where: { userId: studentRequestedId },
                        include: { user: { select: { name: true } }, currentEnrollment: true },
                    });

                    if (!student) {
                        student = await tx.student.findUnique({
                            where: { id: studentRequestedId },
                            include: { user: { select: { name: true } }, currentEnrollment: true },
                        });
                    }

                    if (!student) {
                        errors.push({ studentId: studentRequestedId, error: 'Student not found' });
                        continue;
                    }

                    if (student.currentEnrollment?.classRoomId === classRoomId) {
                        errors.push({
                            studentId: student.id,
                            studentName: student.user.name,
                            error: 'Already enrolled in this class',
                        });
                        continue;
                    }

                    if (student.currentEnrollment) {
                        await tx.enrollment.update({
                            where: { id: student.currentEnrollment.id },
                            data: { isCurrent: false, endDate: new Date() },
                        });
                    }

                    const newRollNumber = await generateRollNumber(classRoomId, tx);
                    const rollNumberInt = Number(newRollNumber);

                    const newEnrollment = await tx.enrollment.create({
                        data: {
                            studentId: student.id,
                            classRoomId,
                            rollNumber: rollNumberInt,
                            isCurrent: true,
                            startDate: startDate ? new Date(startDate) : new Date(),
                        },
                    });

                    await tx.student.update({
                        where: { id: student.id },
                        data: { currentEnrollmentId: newEnrollment.id },
                    });

                    assigned.push({
                        studentId: student.id,
                        studentName: student.user.name,
                        rollNumber: rollNumberInt,
                    });
                } catch (err) {
                    errors.push({ studentId: studentRequestedId, error: err.message });
                }
            }

            return { assigned, errors };
        });

        logger.info({ classRoomId, assigned: results.assigned.length }, 'Bulk assign completed');

        res.json({
            message: `Successfully assigned ${results.assigned.length} student(s) to ${classRoom.name}`,
            assigned: results.assigned,
            errors: results.errors,
            summary: {
                total: studentIds.length,
                successful: results.assigned.length,
                failed: results.errors.length,
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Bulk assign students error');
        res.status(500).json({
            error: 'Failed to assign students',
            details: error.message,
        });
    }
}

// Promote students to new class
async function promoteStudents(req, res) {
    try {
        const { studentIds, newClassRoomId, reason } = req.body;

        const results = await prisma.$transaction(async (tx) => {
            const newClassRoom = await tx.classRoom.findUnique({
                where: { id: newClassRoomId },
            });

            if (!newClassRoom) throw new Error('New class room not found');

            const promotedStudents = [];
            const errors = [];

            for (const studentRequestedId of studentIds) {
                try {
                    let student = await tx.student.findFirst({
                        where: { userId: studentRequestedId },
                        include: {
                            user: { select: { name: true, email: true } },
                            currentEnrollment: {
                                include: { classRoom: { select: { id: true, name: true } } },
                            },
                        },
                    });

                    if (!student) {
                        student = await tx.student.findUnique({
                            where: { id: studentRequestedId },
                            include: {
                                user: { select: { name: true, email: true } },
                                currentEnrollment: {
                                    include: { classRoom: { select: { id: true, name: true } } },
                                },
                            },
                        });
                    }

                    if (!student) {
                        errors.push({ studentId: studentRequestedId, error: 'Student not found' });
                        continue;
                    }

                    if (!student.currentEnrollment) {
                        errors.push({
                            studentId: student.id,
                            studentName: student.user.name,
                            error: 'Student has no active enrollment',
                        });
                        continue;
                    }

                    if (student.currentEnrollment.classRoomId === newClassRoomId) {
                        errors.push({
                            studentId: student.id,
                            studentName: student.user.name,
                            error: 'Already enrolled in target class',
                        });
                        continue;
                    }

                    const oldRollNumber = student.currentEnrollment.rollNumber;

                    await tx.enrollment.update({
                        where: { id: student.currentEnrollment.id },
                        data: {
                            isCurrent: false,
                            endDate: new Date(),
                            promotedTo: reason || `Promoted to ${newClassRoom.name}`,
                        },
                    });

                    const newRollNumber = await generateRollNumber(newClassRoomId, tx);
                    const rollNumberInt = Number(newRollNumber);

                    if (isNaN(rollNumberInt) || rollNumberInt <= 0) {
                        throw new Error(`Invalid roll number generated: ${newRollNumber}`);
                    }

                    const newEnrollment = await tx.enrollment.create({
                        data: {
                            studentId: student.id,
                            classRoomId: newClassRoomId,
                            rollNumber: rollNumberInt,
                            isCurrent: true,
                            startDate: new Date(),
                        },
                    });

                    await tx.student.update({
                        where: { id: student.id },
                        data: { currentEnrollmentId: newEnrollment.id },
                    });

                    promotedStudents.push({
                        studentId: student.id,
                        studentName: student.user.name,
                        fromClass: student.currentEnrollment.classRoom.name,
                        toClass: newClassRoom.name,
                        oldRollNumber,
                        newRollNumber: rollNumberInt,
                    });
                } catch (err) {
                    errors.push({ studentId: studentRequestedId, error: err.message });
                }
            }

            return { promotedStudents, errors };
        });

        logger.info({
            newClassRoomId,
            promoted: results.promotedStudents.length,
            errors: results.errors.length,
        }, 'Student promotion completed');

        return res.json({
            message: `Successfully promoted ${results.promotedStudents.length} student(s)`,
            promoted: results.promotedStudents,
            errors: results.errors,
            summary: {
                total: studentIds.length,
                successful: results.promotedStudents.length,
                failed: results.errors.length,
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Promote students error');
        return res.status(500).json({ error: error.message });
    }
}

// Get student enrollment history
async function getStudentEnrollmentHistory(req, res) {
    try {
        const { studentId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        let student = await prisma.student.findFirst({
            where: { userId: studentId },
            include: {
                user: {
                    select: { id: true, name: true, email: true, profileImage: true, status: true },
                },
            },
        });

        if (!student) {
            student = await prisma.student.findUnique({
                where: { id: studentId },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, profileImage: true, status: true },
                    },
                },
            });
        }

        if (!student) return res.status(404).json({ error: 'Student not found' });

        const [enrollments, total] = await Promise.all([
            prisma.enrollment.findMany({
                where: { studentId: student.id },
                skip: parseInt(skip),
                take: parseInt(limit),
                include: {
                    classRoom: {
                        select: {
                            id: true,
                            name: true,
                            grade: true,
                            section: true,
                            type: true,
                            teacher: {
                                include: { user: { select: { name: true } } },
                            },
                        },
                    },
                },
                orderBy: { startDate: 'desc' },
            }),
            prisma.enrollment.count({ where: { studentId: student.id } }),
        ]);

        const enrichedEnrollments = enrollments.map(enrollment => {
            const start = new Date(enrollment.startDate);
            const end = enrollment.endDate ? new Date(enrollment.endDate) : new Date();
            const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            const durationMonths = Math.floor(durationDays / 30);

            return {
                ...enrollment,
                duration: {
                    days: durationDays,
                    months: durationMonths,
                    formatted: durationMonths > 0
                        ? `${durationMonths} month${durationMonths > 1 ? 's' : ''}`
                        : `${durationDays} day${durationDays > 1 ? 's' : ''}`,
                },
            };
        });

        res.json({
            student: {
                id: student.id,
                userId: student.userId,
                name: student.user.name,
                email: student.user.email,
                admissionNo: student.admissionNo,
                profileImage: student.user.profileImage,
                status: student.user.status,
            },
            enrollments: enrichedEnrollments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
            summary: {
                totalEnrollments: total,
                currentEnrollment: enrichedEnrollments.find(e => e.isCurrent),
                totalClassesAttended: total,
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Get student enrollment history error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    assignTeacherToClass,
    assignStudentToClass,
    removeTeacherFromClass,
    removeStudentFromClass,
    bulkAssignStudentsToClass,
    promoteStudents,
    getStudentEnrollmentHistory,
};
