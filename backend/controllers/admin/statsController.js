// controllers/admin/statsController.js — System stats, attendance overview, trends
const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

// Get system statistics (optimized with Promise.all)
async function getSystemStats(req, res) {
    try {
        const [
            totalUsers,
            totalTeachers,
            totalStudents,
            totalParents,
            totalClasses,
            totalSubjects,
            activeStudents,
            activeTeachers,
            recentUsers,
            classTypes,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { role: 'TEACHER' } }),
            prisma.user.count({ where: { role: 'STUDENT' } }),
            prisma.user.count({ where: { role: 'PARENT' } }),
            prisma.classRoom.count(),
            prisma.subject.count(),
            prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
            prisma.user.count({ where: { role: 'TEACHER', status: 'ACTIVE' } }),
            prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    role: true,
                    createdAt: true,
                }
            }),
            prisma.classRoom.groupBy({
                by: ['type'],
                _count: { id: true },
            }),
        ]);

        // Attendance stats for last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [attendanceRecords, presentCount] = await Promise.all([
            prisma.attendance.count({
                where: { date: { gte: sevenDaysAgo } },
            }),
            prisma.attendance.count({
                where: {
                    date: { gte: sevenDaysAgo },
                    OR: [{ status: 'PRESENT' }, { status: 'LATE' }],
                },
            }),
        ]);

        const attendanceRate = attendanceRecords > 0
            ? Math.round((presentCount / attendanceRecords) * 100)
            : 0;

        res.json({
            stats: {
                totalUsers,
                totalTeachers,
                totalStudents,
                totalParents,
                totalClasses,
                totalSubjects,
                activeStudents,
                activeTeachers,
                classTypes: classTypes.reduce((acc, ct) => {
                    acc[ct.type] = ct._count.id;
                    return acc;
                }, {}),
                weeklyAttendanceRate: attendanceRate,
            },
            recentActivities: recentUsers.map(u => ({
                type: 'USER_CREATED',
                description: `${u.name} (${u.role}) joined`,
                timestamp: u.createdAt,
            })),
        });
    } catch (error) {
        logger.error({ err: error }, 'Get system stats error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Get attendance overview — N+1 fixed: all class queries batched
async function getAttendanceOverview(req, res) {
    try {
        const { startDate, endDate, classRoomId } = req.query;

        const defaultEndDate = new Date();
        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() - 30);

        const start = startDate ? new Date(startDate) : defaultStartDate;
        const end = endDate ? new Date(endDate) : defaultEndDate;

        const where = {
            date: { gte: start, lte: end },
        };
        if (classRoomId) where.classRoomId = classRoomId;

        const [statusCounts, enrolledStudents] = await Promise.all([
            prisma.attendance.groupBy({
                by: ['status'],
                where,
                _count: { id: true },
            }),
            prisma.enrollment.count({
                where: {
                    isCurrent: true,
                    ...(classRoomId && { classRoomId }),
                },
            }),
        ]);

        const countMap = {};
        let totalRecords = 0;
        for (const sc of statusCounts) {
            countMap[sc.status] = sc._count.id;
            totalRecords += sc._count.id;
        }

        const presentCount = countMap['PRESENT'] || 0;
        const absentCount = countMap['ABSENT'] || 0;
        const lateCount = countMap['LATE'] || 0;
        const excusedCount = countMap['EXCUSED'] || 0;

        const totalPossible = enrolledStudents * Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const overallAttendancePercentage = totalPossible > 0
            ? ((presentCount + lateCount) / totalPossible * 100).toFixed(2)
            : 0;

        const statusDistribution = [
            { name: 'Present', value: presentCount, color: '#10B981' },
            { name: 'Absent', value: absentCount, color: '#EF4444' },
            { name: 'Late', value: lateCount, color: '#F59E0B' },
            { name: 'Excused', value: excusedCount, color: '#6B7280' },
        ].filter(item => item.value > 0);

        // Class-wise attendance — FIXED: was N+1 (3 queries × N classes), now 4 queries total
        let classWiseAttendance = [];
        if (!classRoomId) {
            const dayCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

            const [classPresent, classTotals, classEnrollments, allClasses] = await Promise.all([
                prisma.attendance.groupBy({
                    by: ['classRoomId'],
                    where: {
                        date: { gte: start, lte: end },
                        OR: [{ status: 'PRESENT' }, { status: 'LATE' }],
                    },
                    _count: { id: true },
                }),
                prisma.attendance.groupBy({
                    by: ['classRoomId'],
                    where: { date: { gte: start, lte: end } },
                    _count: { id: true },
                }),
                prisma.enrollment.groupBy({
                    by: ['classRoomId'],
                    where: { isCurrent: true },
                    _count: { id: true },
                }),
                prisma.classRoom.findMany({
                    select: { id: true, name: true, type: true },
                }),
            ]);

            const presentByClass = new Map(classPresent.map(r => [r.classRoomId, r._count.id]));
            const totalByClass = new Map(classTotals.map(r => [r.classRoomId, r._count.id]));
            const enrollByClass = new Map(classEnrollments.map(r => [r.classRoomId, r._count.id]));

            classWiseAttendance = allClasses
                .filter(classRoom => totalByClass.has(classRoom.id))
                .map(classRoom => {
                    const presentInClass = presentByClass.get(classRoom.id) || 0;
                    const classEnrollment = enrollByClass.get(classRoom.id) || 0;
                    const totalPossible = classEnrollment * dayCount;
                    const percentage = totalPossible > 0
                        ? (presentInClass / totalPossible * 100).toFixed(2)
                        : 0;

                    return {
                        classId: classRoom.id,
                        className: classRoom.name,
                        classType: classRoom.type,
                        totalStudents: classEnrollment,
                        attendancePercentage: parseFloat(percentage),
                        presentCount: presentInClass,
                        totalRecords: totalByClass.get(classRoom.id) || 0,
                    };
                })
                .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
                .slice(0, 10);
        }

        res.json({
            period: {
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
            },
            summary: {
                totalRecords,
                presentCount,
                absentCount,
                lateCount,
                excusedCount,
                enrolledStudents,
                overallAttendancePercentage: parseFloat(overallAttendancePercentage),
            },
            charts: {
                statusDistribution,
                classWiseAttendance,
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Get attendance overview error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Get attendance trends over time
async function getAttendanceTrends(req, res) {
    try {
        const { days = 30, classRoomId } = req.query;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const dateRange = [];
        for (let i = 0; i < parseInt(days); i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            dateRange.push(date.toISOString().split('T')[0]);
        }

        const where = {
            date: { gte: startDate, lte: endDate },
        };
        if (classRoomId) where.classRoomId = classRoomId;

        const [dailyAttendance, dailyPresent] = await Promise.all([
            prisma.attendance.groupBy({
                by: ['date'],
                where,
                _count: { id: true },
            }),
            prisma.attendance.groupBy({
                by: ['date'],
                where: {
                    ...where,
                    OR: [{ status: 'PRESENT' }, { status: 'LATE' }],
                },
                _count: { id: true },
            }),
        ]);

        const trends = dateRange.map(date => {
            const dayAttendance = dailyAttendance.find(d => d.date.toISOString().split('T')[0] === date);
            const dayPresent = dailyPresent.find(d => d.date.toISOString().split('T')[0] === date);

            const total = dayAttendance?._count.id || 0;
            const present = dayPresent?._count.id || 0;
            const percentage = total > 0 ? (present / total * 100).toFixed(2) : 0;

            return {
                date,
                total,
                present,
                percentage: parseFloat(percentage),
            };
        });

        res.json({
            period: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                days: parseInt(days),
            },
            trends,
        });
    } catch (error) {
        logger.error({ err: error }, 'Get attendance trends error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Get class attendance comparison — FIXED: was N+1 (2 queries × N classes), now 4 queries total
async function getClassAttendanceComparison(req, res) {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : new Date();
        start.setDate(start.getDate() - 30);
        const end = endDate ? new Date(endDate) : new Date();

        const [classPresent, classTotals, classEnrollments, allClasses] = await Promise.all([
            prisma.attendance.groupBy({
                by: ['classRoomId'],
                where: {
                    date: { gte: start, lte: end },
                    OR: [{ status: 'PRESENT' }, { status: 'LATE' }],
                },
                _count: { id: true },
            }),
            prisma.attendance.groupBy({
                by: ['classRoomId'],
                where: { date: { gte: start, lte: end } },
                _count: { id: true },
            }),
            prisma.enrollment.groupBy({
                by: ['classRoomId'],
                where: { isCurrent: true },
                _count: { id: true },
            }),
            prisma.classRoom.findMany({
                select: { id: true, name: true, type: true },
            }),
        ]);

        const presentByClass = new Map(classPresent.map(r => [r.classRoomId, r._count.id]));
        const totalByClass = new Map(classTotals.map(r => [r.classRoomId, r._count.id]));
        const enrollByClass = new Map(classEnrollments.map(r => [r.classRoomId, r._count.id]));
        const dayCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        const classComparison = allClasses.map(classRoom => {
            const presentCount = presentByClass.get(classRoom.id) || 0;
            const totalRecords = totalByClass.get(classRoom.id) || 0;
            const enrollmentCount = enrollByClass.get(classRoom.id) || 0;
            const totalPossible = enrollmentCount * dayCount;
            const percentage = totalPossible > 0
                ? (presentCount / totalPossible * 100).toFixed(2)
                : 0;

            return {
                classId: classRoom.id,
                className: classRoom.name,
                classType: classRoom.type,
                totalStudents: enrollmentCount,
                attendancePercentage: parseFloat(percentage),
                presentCount,
                totalRecords,
            };
        });

        classComparison.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

        res.json({
            period: {
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
            },
            classes: classComparison,
        });
    } catch (error) {
        logger.error({ err: error }, 'Get class attendance comparison error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Manage leave requests
async function manageLeaveRequests(req, res) {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const skip = (page - 1) * limit;

        const where = {};
        if (status) where.status = status;

        const [leaveRequests, total] = await Promise.all([
            prisma.leaveRequest.findMany({
                where,
                skip: parseInt(skip),
                take: parseInt(limit),
                include: {
                    teacher: {
                        include: {
                            user: {
                                select: { name: true, email: true, phone: true },
                            },
                        },
                    },
                    appliedToAdmin: {
                        select: { name: true, email: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.leaveRequest.count({ where }),
        ]);

        res.json({
            leaveRequests,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Manage leave requests error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Update leave request status
async function updateLeaveRequest(req, res) {
    try {
        const { id } = req.params;
        const { status, response } = req.body;

        if (!status || !['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ error: 'Valid status is required' });
        }

        const leaveRequest = await prisma.leaveRequest.findUnique({ where: { id } });
        if (!leaveRequest) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        const updatedLeaveRequest = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status,
                response: response || null,
            },
            include: {
                teacher: {
                    include: {
                        user: {
                            select: { name: true, email: true },
                        },
                    },
                },
            },
        });

        logger.info({ requestId: id, status }, 'Leave request updated');

        res.json({
            message: `Leave request ${status.toLowerCase()} successfully`,
            leaveRequest: updatedLeaveRequest,
        });
    } catch (error) {
        logger.error({ err: error }, 'Update leave request error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// GET /admin/stats/students-at-risk
// FIXED: was 4 queries × N students (N+1). Now 4 queries total regardless of student count.
async function getStudentsAtRisk(req, res) {
    try {
        const {
            classRoomId,
            startDate,
            endDate,
            thresholdPercent = 75,
            criticalPercent = 60,
        } = req.query;

        const start = startDate
            ? new Date(startDate)
            : new Date(Date.now() - 30 * 86400000);
        const end = endDate ? new Date(endDate) : new Date();

        // 1. Get all active enrollments (optionally filtered by class)
        const enrollments = await prisma.enrollment.findMany({
            where: {
                isCurrent: true,
                ...(classRoomId && { classRoomId }),
            },
            include: {
                student: {
                    include: {
                        user: { select: { id: true, name: true, email: true, phone: true } },
                        parents: {
                            include: {
                                user: { select: { name: true, email: true, phone: true } },
                            },
                        },
                    },
                },
                classRoom: { select: { id: true, name: true, type: true } },
            },
        });

        if (enrollments.length === 0) {
            return res.json({
                period: {
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0],
                },
                summary: {
                    totalStudentsChecked: 0,
                    atRiskCount: 0,
                    criticalCount: 0,
                    warningCount: 0,
                    thresholdPercent: parseFloat(thresholdPercent),
                    criticalPercent: parseFloat(criticalPercent),
                },
                atRiskStudents: [],
            });
        }

        // 2. Batch fetch ALL attendance data in 4 queries (was 4 × N queries)
        const attendanceWhere = {
            date: { gte: start, lte: end },
            ...(classRoomId && { classRoomId }),
        };
        const recentWhere = {
            date: { gte: new Date(Date.now() - 7 * 86400000) },
            ...(classRoomId && { classRoomId }),
        };

        const [allTotals, allPresent, allAbsent, recentAttendance] = await Promise.all([
            prisma.attendance.groupBy({
                by: ['studentId', 'classRoomId'],
                where: attendanceWhere,
                _count: { id: true },
            }),
            prisma.attendance.groupBy({
                by: ['studentId', 'classRoomId'],
                where: {
                    ...attendanceWhere,
                    OR: [{ status: 'PRESENT' }, { status: 'LATE' }],
                },
                _count: { id: true },
            }),
            prisma.attendance.groupBy({
                by: ['studentId', 'classRoomId'],
                where: { ...attendanceWhere, status: 'ABSENT' },
                _count: { id: true },
            }),
            prisma.attendance.findMany({
                where: recentWhere,
                orderBy: { date: 'desc' },
                select: { studentId: true, classRoomId: true, status: true, date: true },
            }),
        ]);

        // 3. Index all results for O(1) lookup
        const totalMap = new Map();
        const presentMap = new Map();
        const absentMap = new Map();
        const recentMap = new Map();

        for (const r of allTotals) {
            totalMap.set(`${r.studentId}:${r.classRoomId}`, r._count.id);
        }
        for (const r of allPresent) {
            presentMap.set(`${r.studentId}:${r.classRoomId}`, r._count.id);
        }
        for (const r of allAbsent) {
            absentMap.set(`${r.studentId}:${r.classRoomId}`, r._count.id);
        }
        // Group recent records by student+class, already sorted desc by date from DB
        for (const r of recentAttendance) {
            const key = `${r.studentId}:${r.classRoomId}`;
            if (!recentMap.has(key)) recentMap.set(key, []);
            recentMap.get(key).push(r);
        }

        // 4. Compute risk profiles in JS — zero additional DB calls
        const studentRiskProfiles = enrollments.map((enrollment) => {
            const key = `${enrollment.studentId}:${enrollment.classRoomId}`;
            const totalRecords = totalMap.get(key) || 0;
            const presentRecords = presentMap.get(key) || 0;
            const absentRecords = absentMap.get(key) || 0;
            const recentRecords = recentMap.get(key) || [];

            const attendancePercent =
                totalRecords > 0
                    ? parseFloat(((presentRecords / totalRecords) * 100).toFixed(2))
                    : null;

            // Count consecutive absences from most-recent records (already desc-sorted)
            let consecutiveAbsenceStreak = 0;
            for (const record of recentRecords) {
                if (record.status === 'ABSENT') {
                    consecutiveAbsenceStreak++;
                } else {
                    break;
                }
            }

            // 5. Determine risk level
            let riskLevel = 'NONE';
            const riskReasons = [];

            if (attendancePercent !== null) {
                if (attendancePercent < parseFloat(criticalPercent)) {
                    riskLevel = 'CRITICAL';
                    riskReasons.push(
                        `Attendance at ${attendancePercent}% — below critical threshold of ${criticalPercent}%`
                    );
                } else if (attendancePercent < parseFloat(thresholdPercent)) {
                    riskLevel = 'WARNING';
                    riskReasons.push(
                        `Attendance at ${attendancePercent}% — below required ${thresholdPercent}%`
                    );
                }
            }

            if (consecutiveAbsenceStreak >= 3) {
                if (riskLevel === 'NONE') riskLevel = 'WARNING';
                if (consecutiveAbsenceStreak >= 5) riskLevel = 'CRITICAL';
                riskReasons.push(
                    `${consecutiveAbsenceStreak} consecutive absences in the last 7 days`
                );
            }

            return {
                studentId: enrollment.studentId,
                studentName: enrollment.student.user.name,
                email: enrollment.student.user.email,
                phone: enrollment.student.user.phone,
                admissionNo: enrollment.student.admissionNo,
                classRoom: enrollment.classRoom,
                parents: enrollment.student.parents?.map((p) => ({
                    name: p.user.name,
                    email: p.user.email,
                    phone: p.user.phone,
                })),
                attendance: {
                    totalRecords,
                    presentRecords,
                    absentRecords,
                    attendancePercent,
                    consecutiveAbsenceStreak,
                },
                riskLevel,
                riskReasons,
            };
        });

        // 6. Filter to only at-risk students and sort by severity
        const riskOrder = { CRITICAL: 0, WARNING: 1, NONE: 2 };
        const atRiskStudents = studentRiskProfiles
            .filter((s) => s.riskLevel !== 'NONE')
            .sort((a, b) => {
                if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
                    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
                }
                return (a.attendance.attendancePercent ?? 100) -
                    (b.attendance.attendancePercent ?? 100);
            });

        // 7. Build summary metrics
        const summary = {
            totalStudentsChecked: studentRiskProfiles.length,
            atRiskCount: atRiskStudents.length,
            criticalCount: atRiskStudents.filter((s) => s.riskLevel === 'CRITICAL').length,
            warningCount: atRiskStudents.filter((s) => s.riskLevel === 'WARNING').length,
            thresholdPercent: parseFloat(thresholdPercent),
            criticalPercent: parseFloat(criticalPercent),
        };

        res.json({
            period: {
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
            },
            summary,
            atRiskStudents,
        });
    } catch (error) {
        logger.error({ err: error }, 'Get students at risk error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getSystemStats,
    getAttendanceOverview,
    getAttendanceTrends,
    getClassAttendanceComparison,
    manageLeaveRequests,
    updateLeaveRequest,
    getStudentsAtRisk,
};