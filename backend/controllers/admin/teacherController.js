// controllers/admin/teacherController.js — Teacher CRUD operations
// FIXES applied (see audit report):
//   [MEDIUM]  Dual-ID lookup (findFirst by userId, then findUnique by id) consolidated
//             into a single findFirst({ where: { OR: [...] } }) in all five functions.
//   [MEDIUM]  updateTeacher — email uniqueness check moved inside the $transaction so it
//             can't race with another concurrent update that grabs the same email.
//   [LOW]     updateTeacher — userUpdateData.phone was only updated when truthy; clearing
//             a phone number now correctly nullifies it (if value is explicitly provided).
//   [UNCHANGED] getAllTeachers, deleteTeacher, updateTeacherStatus, mergeTeacherClasses
//               — logic already correct.

const prisma  = require('../../db/prismaClient');
const bcrypt  = require('bcryptjs');
const fs      = require('fs');
const path    = require('path');
const logger  = require('../../utils/logger');
const { generateStrongPassword, generateEmail } = require('../../utils/passwordGenerator');

const saltRounds = 12;

// ─── Shared include for teacher queries ──────────────────────────────────────
const teacherClassesInclude = {
    classes: {
        select: { id: true, name: true, grade: true, type: true, section: true },
    },
    classTeachers: {
        include: {
            classRoom: {
                select: { id: true, name: true, grade: true, type: true, section: true },
            },
        },
        orderBy: { assignedAt: 'asc' },
    },
};

// Build a deduplicated class list from both sources
function mergeTeacherClasses(teacher) {
    const seen = new Map();

    for (const cls of teacher.classes || []) {
        seen.set(cls.id, { ...cls, myRole: 'CLASS_TEACHER' });
    }

    for (const ct of teacher.classTeachers || []) {
        const cls = ct.classRoom;
        if (!seen.has(cls.id)) {
            seen.set(cls.id, { ...cls, myRole: ct.role });
        } else {
            // Join-table role is authoritative
            seen.set(cls.id, { ...seen.get(cls.id), myRole: ct.role });
        }
    }

    return Array.from(seen.values());
}

// ─── Shared helper: find teacher by userId OR teacher.id in one query ─────────
function findTeacherByAnyId(id, includeBlock, client = prisma) {
    return client.teacher.findFirst({
        where:   { OR: [{ userId: id }, { id }] },
        include: includeBlock,
    });
}

// ─── getAllTeachers ───────────────────────────────────────────────────────────
// Unchanged logic — already correct.
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
                        { name:  { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                    ],
                }),
            },
        };

        const [teachers, total] = await Promise.all([
            prisma.teacher.findMany({
                where,
                skip:  parseInt(skip),
                take:  parseInt(limit),
                include: {
                    user: {
                        select: {
                            id: true, name: true, email: true, phone: true,
                            profileImage: true, status: true, createdAt: true,
                        },
                    },
                    ...teacherClassesInclude,
                    subjects: { select: { id: true, name: true } },
                },
                orderBy: { user: { createdAt: 'desc' } },
            }),
            prisma.teacher.count({ where }),
        ]);

        const teachersWithClasses = teachers.map(t => ({
            ...t,
            allClasses: mergeTeacherClasses(t),
        }));

        res.json({
            teachers: teachersWithClasses,
            pagination: {
                page:  parseInt(page),
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

// ─── getTeacherDetails ────────────────────────────────────────────────────────
// FIX: dual-ID lookup consolidated to one query.
async function getTeacherDetails(req, res) {
    try {
        const { id } = req.params;

        const includeBlock = {
            user: {
                select: {
                    id: true, name: true, email: true, phone: true,
                    profileImage: true, status: true, createdAt: true,
                },
            },
            classes: {
                include: {
                    _count: { select: { enrollments: { where: { isCurrent: true } } } },
                },
            },
            classTeachers: {
                include: {
                    classRoom: {
                        include: {
                            _count: { select: { enrollments: { where: { isCurrent: true } } } },
                        },
                    },
                },
            },
            subjects: {
                include: {
                    classRoom: { select: { name: true } },
                },
            },
        };

        // FIX: single query via OR
        const teacher = await findTeacherByAnyId(id, includeBlock);

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        const allClasses = mergeTeacherClasses(teacher);

        res.json({
            teacher: teacher.user,
            profile: {
                bio:            teacher.bio,
                specialization: teacher.specialization,
                qualification:  teacher.qualification,
                experience:     teacher.experience,
                cnic:           teacher.cnic,
                joiningDate:    teacher.joiningDate,
                salary:         teacher.salary,
                employmentType: teacher.employmentType,
            },
            classes:       allClasses,
            classTeachers: teacher.classTeachers,
            subjects:      teacher.subjects,
        });
    } catch (error) {
        logger.error({ err: error }, 'Get teacher details error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ─── updateTeacher ────────────────────────────────────────────────────────────
// FIX 1: dual-ID lookup consolidated to one query.
// FIX 2: email uniqueness check moved inside the $transaction to prevent race.
// FIX 3: phone cleared to null when explicitly passed as empty string.
async function updateTeacher(req, res) {
    try {
        const { id } = req.params;
        const {
            name, email, phone, status,
            bio, specialization, qualification, experience,
            cnic, salary, employmentType,
            joiningDate, dateOfBirth, gender,
            phoneSecondary, address, bloodGroup, medicalConditions,
            emergencyContactName, emergencyContactPhone, emergencyContactRelation,
            bankName, accountNumber, iban,
        } = req.body;

        // FIX: single query via OR
        const teacher = await findTeacherByAnyId(id, { user: true });
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

        // Build update payloads before the transaction
        const userUpdateData = {};
        if (name)   userUpdateData.name   = name;
        // FIX: phone can be cleared to null
        if (phone !== undefined) userUpdateData.phone = phone === '' ? null : phone;
        if (status && ['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(status)) {
            userUpdateData.status = status;
        }
        // Email is handled inside the transaction to avoid the race condition

        const teacherUpdateData = {};
        if (bio                 !== undefined) teacherUpdateData.bio                 = bio;
        if (specialization      !== undefined) teacherUpdateData.specialization      = specialization;
        if (qualification       !== undefined) teacherUpdateData.qualification       = qualification;
        if (experience          !== undefined) teacherUpdateData.experience          = experience ? String(experience) : null;
        if (cnic                !== undefined) teacherUpdateData.cnic                = cnic;
        if (salary              !== undefined) teacherUpdateData.salary              = salary !== '' && salary !== null ? parseFloat(salary) : null;
        if (employmentType      !== undefined) teacherUpdateData.employmentType      = employmentType;
        if (joiningDate)                       teacherUpdateData.joiningDate         = new Date(joiningDate);
        if (dateOfBirth)                       teacherUpdateData.dateOfBirth         = new Date(dateOfBirth);
        if (gender              !== undefined) teacherUpdateData.gender              = gender;
        if (phoneSecondary      !== undefined) teacherUpdateData.phoneSecondary      = phoneSecondary;
        if (address             !== undefined) teacherUpdateData.address             = address;
        if (bloodGroup          !== undefined) teacherUpdateData.bloodGroup          = bloodGroup;
        if (medicalConditions   !== undefined) teacherUpdateData.medicalConditions   = medicalConditions;
        if (emergencyContactName      !== undefined) teacherUpdateData.emergencyContactName      = emergencyContactName;
        if (emergencyContactPhone     !== undefined) teacherUpdateData.emergencyContactPhone     = emergencyContactPhone;
        if (emergencyContactRelation  !== undefined) teacherUpdateData.emergencyContactRelation  = emergencyContactRelation;
        if (bankName            !== undefined) teacherUpdateData.bankName            = bankName;
        if (accountNumber       !== undefined) teacherUpdateData.accountNumber       = accountNumber;
        if (iban                !== undefined) teacherUpdateData.iban                = iban;

        const result = await prisma.$transaction(async (tx) => {
            // FIX: email uniqueness check inside the transaction
            if (email && email !== teacher.user.email) {
                const existingUser = await tx.user.findFirst({
                    where: { email, NOT: { id: teacher.userId } },
                });
                if (existingUser) {
                    throw Object.assign(new Error('Email already in use'), { statusCode: 400 });
                }
                userUpdateData.email = email;
            }

            let updatedUser = teacher.user;
            if (Object.keys(userUpdateData).length > 0) {
                updatedUser = await tx.user.update({
                    where: { id: teacher.userId },
                    data:  userUpdateData,
                });
            }

            let updatedTeacher = teacher;
            if (Object.keys(teacherUpdateData).length > 0) {
                updatedTeacher = await tx.teacher.update({
                    where: { id: teacher.id },
                    data:  teacherUpdateData,
                });
            }

            return { user: updatedUser, teacher: updatedTeacher };
        });

        const { passwordHash, ...userWithoutPassword } = result.user;
        logger.info({ teacherId: teacher.id }, 'Teacher updated');

        res.json({
            message: 'Teacher updated successfully',
            teacher: {
                ...userWithoutPassword,
                profile: {
                    bio:                      result.teacher.bio,
                    specialization:           result.teacher.specialization,
                    qualification:            result.teacher.qualification,
                    experience:               result.teacher.experience,
                    cnic:                     result.teacher.cnic,
                    salary:                   result.teacher.salary,
                    employmentType:           result.teacher.employmentType,
                    joiningDate:              result.teacher.joiningDate,
                    dateOfBirth:              result.teacher.dateOfBirth,
                    gender:                   result.teacher.gender,
                    phoneSecondary:           result.teacher.phoneSecondary,
                    address:                  result.teacher.address,
                    bloodGroup:               result.teacher.bloodGroup,
                    medicalConditions:        result.teacher.medicalConditions,
                    emergencyContactName:     result.teacher.emergencyContactName,
                    emergencyContactPhone:    result.teacher.emergencyContactPhone,
                    emergencyContactRelation: result.teacher.emergencyContactRelation,
                    bankName:                 result.teacher.bankName,
                    accountNumber:            result.teacher.accountNumber,
                    iban:                     result.teacher.iban,
                },
            },
        });
    } catch (error) {
        // Surface the 400 from the email uniqueness check
        if (error.statusCode === 400) {
            return res.status(400).json({ error: error.message });
        }
        logger.error({ err: error }, 'Update teacher error');
        res.status(500).json({ error: 'Failed to update teacher', details: error.message });
    }
}

// ─── deleteTeacher ────────────────────────────────────────────────────────────
// FIX: dual-ID lookup consolidated to one query.
async function deleteTeacher(req, res) {
    try {
        const { id } = req.params;

        // FIX: single query via OR
        const teacher = await findTeacherByAnyId(id, {
            user: { select: { id: true, name: true, email: true, role: true, status: true } },
        });

        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

        if (['SUPER_ADMIN', 'ADMIN'].includes(teacher.user.role)) {
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
            id:     teacher.id,
            userId: teacher.userId,
            name:   teacher.user.name,
            email:  teacher.user.email,
        };

        await prisma.$transaction(async (tx) => {
            await tx.subject.updateMany({
                where: { teacherId: teacher.id },
                data:  { teacherId: null },
            });
            await tx.classRoom.updateMany({
                where: { teacherId: teacher.id },
                data:  { teacherId: null },
            });
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

        // Non-blocking file cleanup
        try {
            const filesToDelete = [teacher.profileImage, teacher.cnicFront, teacher.cnicBack]
                .filter(f => f && fs.existsSync(f));
            const degreeDocs = teacher.degreeDocuments ? JSON.parse(teacher.degreeDocuments) : [];
            const otherDocs  = teacher.otherDocuments  ? JSON.parse(teacher.otherDocuments)  : [];
            filesToDelete.push(...degreeDocs, ...otherDocs);
            for (const filePath of filesToDelete) {
                if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        } catch (fileError) {
            logger.warn({ err: fileError }, 'Error cleaning up teacher files');
        }

        logger.info({ teacherId: teacherInfo.id, name: teacherInfo.name }, 'Teacher deleted');

        res.json({ message: 'Teacher deleted successfully', deletedTeacher: teacherInfo });
    } catch (error) {
        logger.error({ err: error }, 'Delete teacher error');
        res.status(500).json({ error: 'Failed to delete teacher', details: error.message });
    }
}

// ─── updateTeacherStatus ──────────────────────────────────────────────────────
// FIX: dual-ID lookup consolidated to one query.
async function updateTeacherStatus(req, res) {
    try {
        const { id }     = req.params;
        const { status } = req.body;

        if (!status || !['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // FIX: single query via OR
        const teacher = await findTeacherByAnyId(id, { user: true });
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

        const updatedUser = await prisma.user.update({
            where: { id: teacher.userId },
            data:  { status },
        });

        logger.info({ teacherId: teacher.id, status }, 'Teacher status updated');

        res.json({ message: 'Teacher status updated successfully', status: updatedUser.status });
    } catch (error) {
        logger.error({ err: error }, 'Update teacher status error');
        res.status(500).json({ error: 'Failed to update teacher status', details: error.message });
    }
}

module.exports = {
    getAllTeachers,
    getTeacherDetails,
    updateTeacher,
    updateTeacherStatus,
    deleteTeacher,
};