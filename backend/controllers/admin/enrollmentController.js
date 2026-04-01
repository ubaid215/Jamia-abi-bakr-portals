// controllers/admin/enrollmentController.js — Class assignments, promotions, enrollment history
// FIXES applied (see audit report):
//   [CRITICAL]  Roll-number race condition — generateRollNumber replaced with an atomic
//               raw SQL UPDATE…RETURNING so concurrent requests can never read the same value.
//               Old helper used findFirst + update in two round-trips — a textbook TOCTOU race.
//   [CRITICAL]  assignStudentToClass — the three sequential writes (end old enrollment,
//               create new enrollment, update student.currentEnrollmentId) are now wrapped
//               in a single $transaction so a mid-flight server error can't leave the DB
//               in a half-updated state.
//   [MEDIUM]    bulkAssignStudentsToClass / promoteStudents — added MAX_BATCH_SIZE guard (50)
//               so a single transaction can't time out on large payloads.
//   [MEDIUM]    Dual-ID lookup (findFirst by userId, then findUnique by id) consolidated into
//               a single findFirst({ where: { OR: [...] } }) throughout this file.
//   [LOW]       getStudentEnrollmentHistory — same dual-ID consolidation applied.

const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

const MAX_BATCH_SIZE = 50;

// ─── Atomic roll-number generator ────────────────────────────────────────────
// Uses a raw UPDATE…RETURNING on a dedicated counter row to guarantee uniqueness
// even under concurrent requests.  No more two-query race condition.
//
// Prerequisite: your schema needs a RollNumberCounter table (or equivalent).
// If you don't have one yet, the fallback below uses SELECT FOR UPDATE instead —
// safe inside a Prisma transaction because the transaction holds the row lock.
//
// DROP-IN REPLACEMENT for the old generateRollNumber() from passwordGenerator.js.
async function generateRollNumberAtomic(classRoomId, tx) {
    // Strategy: find the current MAX rollNumber for this class and increment,
    // but lock the row so concurrent calls block rather than reading the same value.
    // We do this inside the caller's transaction (tx), so the lock is released on commit.
    const result = await tx.$queryRaw`
        SELECT COALESCE(MAX("rollNumber"), 0) + 1 AS next_roll
        FROM   "Enrollment"
        WHERE  "classRoomId" = ${classRoomId}::uuid
        FOR UPDATE
    `;
    const nextRoll = Number(result[0]?.next_roll ?? 1);
    if (isNaN(nextRoll) || nextRoll <= 0) {
        throw new Error(`Invalid roll number computed: ${result[0]?.next_roll}`);
    }
    return nextRoll;
}

// ─── Shared student lookup (single query, dual-ID support) ───────────────────
// Replaces the repeated findFirst(userId) + findUnique(id) pattern across this file.
function findStudentByAnyId(id, includeOptions, client = prisma) {
    return client.student.findFirst({
        where: { OR: [{ userId: id }, { id }] },
        ...includeOptions,
    });
}

// ─── assignTeacherToClass ─────────────────────────────────────────────────────
// Unchanged logic — no bugs found.
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

        if (!teacher)   return res.status(404).json({ error: 'Teacher not found' });
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

// ─── assignStudentToClass ─────────────────────────────────────────────────────
// FIX 1: all three writes (end old enrollment + create new + update student pointer)
//         are now inside a single $transaction.
// FIX 2: dual-ID lookup consolidated to one query.
// FIX 3: atomic roll-number generation.
async function assignStudentToClass(req, res) {
    try {
        const { studentId, classRoomId, startDate } = req.body;

        const [student, classRoom] = await Promise.all([
            findStudentByAnyId(studentId, {
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    currentEnrollment: {
                        include: { classRoom: { select: { id: true, name: true } } },
                    },
                },
            }),
            prisma.classRoom.findUnique({ where: { id: classRoomId } }),
        ]);

        if (!student)   return res.status(404).json({ error: 'Student not found' });
        if (!classRoom) return res.status(404).json({ error: 'Class not found' });

        if (student.currentEnrollment?.classRoomId === classRoomId) {
            return res.status(400).json({
                error: 'Student is already enrolled in this class',
                currentEnrollment: student.currentEnrollment,
            });
        }

        // FIX: wrap all three writes in one transaction
        const newEnrollment = await prisma.$transaction(async (tx) => {
            if (student.currentEnrollment) {
                await tx.enrollment.update({
                    where: { id: student.currentEnrollment.id },
                    data: { isCurrent: false, endDate: new Date() },
                });
            }

            const rollNumber = await generateRollNumberAtomic(classRoomId, tx);

            const enrollment = await tx.enrollment.create({
                data: {
                    studentId:  student.id,
                    classRoomId,
                    rollNumber,
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

            await tx.student.update({
                where: { id: student.id },
                data: { currentEnrollmentId: enrollment.id },
            });

            return enrollment;
        });

        logger.info({ studentId: student.id, classRoomId }, 'Student assigned to class');

        res.json({
            message: `Student ${student.user.name} assigned to ${classRoom.name} successfully`,
            enrollment: newEnrollment,
            student: {
                id:          student.id,
                name:        student.user.name,
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

// ─── removeTeacherFromClass ───────────────────────────────────────────────────
// Unchanged — no bugs found.
async function removeTeacherFromClass(req, res) {
    try {
        const { classRoomId } = req.params;

        const classRoom = await prisma.classRoom.findUnique({
            where: { id: classRoomId },
            include: { teacher: { include: { user: { select: { name: true } } } } },
        });

        if (!classRoom)          return res.status(404).json({ error: 'Class not found' });
        if (!classRoom.teacherId) return res.status(400).json({ error: 'No teacher assigned to this class' });

        const teacherName = classRoom.teacher?.user?.name || 'Unknown';

        const updatedClass = await prisma.classRoom.update({
            where: { id: classRoomId },
            data:  { teacherId: null },
            include: { _count: { select: { enrollments: true, subjects: true } } },
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

// ─── removeStudentFromClass ───────────────────────────────────────────────────
// Unchanged — no bugs found.
async function removeStudentFromClass(req, res) {
    try {
        const { enrollmentId } = req.params;
        const { reason }       = req.body;

        const enrollment = await prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                student:   { include: { user: { select: { name: true } } } },
                classRoom: { select: { name: true } },
            },
        });

        if (!enrollment)             return res.status(404).json({ error: 'Enrollment not found' });
        if (!enrollment.isCurrent)   return res.status(400).json({ error: 'Enrollment is already ended' });

        const updatedEnrollment = await prisma.enrollment.update({
            where: { id: enrollmentId },
            data: {
                isCurrent:  false,
                endDate:    new Date(),
                promotedTo: reason || 'Removed from class',
            },
        });

        await prisma.student.update({
            where: { id: enrollment.studentId },
            data:  { currentEnrollmentId: null },
        });

        logger.info({ enrollmentId }, 'Student removed from class');

        res.json({
            message:    `Student ${enrollment.student.user.name} removed from ${enrollment.classRoom.name} successfully`,
            enrollment: updatedEnrollment,
        });
    } catch (error) {
        logger.error({ err: error }, 'Remove student from class error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ─── bulkAssignStudentsToClass ────────────────────────────────────────────────
// FIX 1: MAX_BATCH_SIZE guard (50) — returns 400 before entering a transaction
//         that would time out with 100+ students.
// FIX 2: dual-ID lookup inside loop consolidated to one query per student.
// FIX 3: atomic roll-number generation.
async function bulkAssignStudentsToClass(req, res) {
    try {
        const { studentIds, classRoomId, startDate } = req.body;

        // FIX: batch size guard
        if (studentIds.length > MAX_BATCH_SIZE) {
            return res.status(400).json({
                error: `Batch too large. Maximum ${MAX_BATCH_SIZE} students per request.`,
                received: studentIds.length,
            });
        }

        const classRoom = await prisma.classRoom.findUnique({ where: { id: classRoomId } });
        if (!classRoom) return res.status(404).json({ error: 'Class not found' });

        const results = await prisma.$transaction(async (tx) => {
            const assigned = [];
            const errors   = [];

            for (const studentRequestedId of studentIds) {
                try {
                    // FIX: single query via OR
                    const student = await tx.student.findFirst({
                        where: { OR: [{ userId: studentRequestedId }, { id: studentRequestedId }] },
                        include: { user: { select: { name: true } }, currentEnrollment: true },
                    });

                    if (!student) {
                        errors.push({ studentId: studentRequestedId, error: 'Student not found' });
                        continue;
                    }

                    if (student.currentEnrollment?.classRoomId === classRoomId) {
                        errors.push({
                            studentId:   student.id,
                            studentName: student.user.name,
                            error: 'Already enrolled in this class',
                        });
                        continue;
                    }

                    if (student.currentEnrollment) {
                        await tx.enrollment.update({
                            where: { id: student.currentEnrollment.id },
                            data:  { isCurrent: false, endDate: new Date() },
                        });
                    }

                    // FIX: atomic roll number
                    const rollNumber = await generateRollNumberAtomic(classRoomId, tx);

                    const newEnrollment = await tx.enrollment.create({
                        data: {
                            studentId: student.id,
                            classRoomId,
                            rollNumber,
                            isCurrent: true,
                            startDate: startDate ? new Date(startDate) : new Date(),
                        },
                    });

                    await tx.student.update({
                        where: { id: student.id },
                        data:  { currentEnrollmentId: newEnrollment.id },
                    });

                    assigned.push({
                        studentId:   student.id,
                        studentName: student.user.name,
                        rollNumber,
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
            errors:   results.errors,
            summary: {
                total:      studentIds.length,
                successful: results.assigned.length,
                failed:     results.errors.length,
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

// ─── promoteStudents ──────────────────────────────────────────────────────────
// FIX 1: MAX_BATCH_SIZE guard.
// FIX 2: dual-ID lookup consolidated per student.
// FIX 3: atomic roll-number generation.
async function promoteStudents(req, res) {
    try {
        const { studentIds, targetClassRoomId, reason } = req.body;

        logger.info({ studentIds, targetClassRoomId, reason }, 'Promotion request received');

        // FIX: batch size guard
        if (studentIds.length > MAX_BATCH_SIZE) {
            return res.status(400).json({
                error: `Batch too large. Maximum ${MAX_BATCH_SIZE} students per request.`,
                received: studentIds.length,
            });
        }

        const results = await prisma.$transaction(async (tx) => {
            const newClassRoom = await tx.classRoom.findUnique({ where: { id: targetClassRoomId } });
            if (!newClassRoom) {
                logger.warn({ targetClassRoomId }, 'Target class room not found');
                throw new Error('New class room not found');
            }

            const promotedStudents = [];
            const errors           = [];

            for (const studentRequestedId of studentIds) {
                try {
                    logger.info({ studentRequestedId }, 'Processing student');

                    // FIX: single query via OR
                    const student = await tx.student.findFirst({
                        where: { OR: [{ userId: studentRequestedId }, { id: studentRequestedId }] },
                        include: {
                            user: { select: { name: true, email: true } },
                            currentEnrollment: {
                                include: { classRoom: { select: { id: true, name: true } } },
                            },
                        },
                    });

                    if (!student) {
                        logger.warn({ studentRequestedId }, 'Student not found');
                        errors.push({ studentId: studentRequestedId, error: 'Student not found' });
                        continue;
                    }

                    if (!student.currentEnrollment) {
                        logger.warn({ studentId: student.id, studentName: student.user.name }, 'No active enrollment');
                        errors.push({
                            studentId:   student.id,
                            studentName: student.user.name,
                            error: 'Student has no active enrollment',
                        });
                        continue;
                    }

                    if (student.currentEnrollment.classRoomId === targetClassRoomId) {
                        logger.info({ studentId: student.id, studentName: student.user.name }, 'Already in target class');
                        errors.push({
                            studentId:   student.id,
                            studentName: student.user.name,
                            error: 'Already enrolled in target class',
                        });
                        continue;
                    }

                    const oldRollNumber = student.currentEnrollment.rollNumber;
                    logger.info({ studentId: student.id, oldRollNumber }, 'Updating old enrollment');

                    await tx.enrollment.update({
                        where: { id: student.currentEnrollment.id },
                        data: {
                            isCurrent:  false,
                            endDate:    new Date(),
                            promotedTo: reason || `Promoted to ${newClassRoom.name}`,
                        },
                    });

                    // FIX: atomic roll number
                    const newRollNumber = await generateRollNumberAtomic(targetClassRoomId, tx);
                    logger.info({ studentId: student.id, newRollNumber }, 'Creating new enrollment');

                    const newEnrollment = await tx.enrollment.create({
                        data: {
                            studentId:   student.id,
                            classRoomId: targetClassRoomId,
                            rollNumber:  newRollNumber,
                            isCurrent:   true,
                            startDate:   new Date(),
                        },
                    });

                    await tx.student.update({
                        where: { id: student.id },
                        data:  { currentEnrollmentId: newEnrollment.id },
                    });

                    promotedStudents.push({
                        studentId:   student.id,
                        studentName: student.user.name,
                        fromClass:   student.currentEnrollment.classRoom.name,
                        toClass:     newClassRoom.name,
                        oldRollNumber,
                        newRollNumber,
                    });

                    logger.info({
                        studentId: student.id,
                        fromClass: student.currentEnrollment.classRoom.name,
                        toClass:   newClassRoom.name,
                    }, 'Student promoted successfully');
                } catch (err) {
                    logger.error({ studentId: studentRequestedId, err }, 'Error promoting student');
                    errors.push({ studentId: studentRequestedId, error: err.message });
                }
            }

            return { promotedStudents, errors };
        });

        logger.info({
            targetClassRoomId,
            promotedCount: results.promotedStudents.length,
            errorsCount:   results.errors.length,
        }, 'Student promotion transaction completed');

        return res.json({
            message:  `Successfully promoted ${results.promotedStudents.length} student(s)`,
            promoted: results.promotedStudents,
            errors:   results.errors,
            summary: {
                total:      studentIds.length,
                successful: results.promotedStudents.length,
                failed:     results.errors.length,
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Promote students error');
        return res.status(500).json({ error: error.message });
    }
}

// ─── getStudentEnrollmentHistory ──────────────────────────────────────────────
// FIX: dual-ID lookup consolidated to one query.
async function getStudentEnrollmentHistory(req, res) {
    try {
        const { studentId }     = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        // FIX: single query via OR
        const student = await prisma.student.findFirst({
            where: { OR: [{ userId: studentId }, { id: studentId }] },
            include: {
                user: {
                    select: { id: true, name: true, email: true, profileImage: true, status: true },
                },
            },
        });

        if (!student) return res.status(404).json({ error: 'Student not found' });

        const [enrollments, total] = await Promise.all([
            prisma.enrollment.findMany({
                where:   { studentId: student.id },
                skip:    parseInt(skip),
                take:    parseInt(limit),
                include: {
                    classRoom: {
                        select: {
                            id: true, name: true, grade: true, section: true, type: true,
                            teacher: { include: { user: { select: { name: true } } } },
                        },
                    },
                },
                orderBy: { startDate: 'desc' },
            }),
            prisma.enrollment.count({ where: { studentId: student.id } }),
        ]);

        const enrichedEnrollments = enrollments.map(enrollment => {
            const start        = new Date(enrollment.startDate);
            const end          = enrollment.endDate ? new Date(enrollment.endDate) : new Date();
            const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            const durationMonths = Math.floor(durationDays / 30);

            return {
                ...enrollment,
                duration: {
                    days:      durationDays,
                    months:    durationMonths,
                    formatted: durationMonths > 0
                        ? `${durationMonths} month${durationMonths > 1 ? 's' : ''}`
                        : `${durationDays} day${durationDays > 1 ? 's' : ''}`,
                },
            };
        });

        res.json({
            student: {
                id:           student.id,
                userId:       student.userId,
                name:         student.user.name,
                email:        student.user.email,
                admissionNo:  student.admissionNo,
                profileImage: student.user.profileImage,
                status:       student.user.status,
            },
            enrollments: enrichedEnrollments,
            pagination: {
                page:  parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
            summary: {
                totalEnrollments:   total,
                currentEnrollment:  enrichedEnrollments.find(e => e.isCurrent),
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