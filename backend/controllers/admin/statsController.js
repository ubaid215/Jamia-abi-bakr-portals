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
                select: { id: true, name: true, role: true, createdAt: true },
            }),
            prisma.classRoom.groupBy({
                by: ['type'],
                _count: { id: true },
            }),
        ]);

        // Attendance stats for last 7 days — one groupBy instead of two COUNTs
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const attendanceByStatus = await prisma.attendance.groupBy({
            by: ['status'],
            where: { date: { gte: sevenDaysAgo } },
            _count: { id: true },
        });

        let totalAttendance = 0;
        let presentCount = 0;
        for (const row of attendanceByStatus) {
            totalAttendance += row._count.id;
            if (row.status === 'PRESENT' || row.status === 'LATE') {
                presentCount += row._count.id;
            }
        }

        const attendanceRate = totalAttendance > 0
            ? Math.round((presentCount / totalAttendance) * 100)
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

// Get attendance overview
async function getAttendanceOverview(req, res) {
    try {
        const { startDate, endDate, classRoomId } = req.query;

        const defaultEndDate = new Date();
        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() - 30);

        const start = startDate ? new Date(startDate) : defaultStartDate;
        const end   = endDate   ? new Date(endDate)   : defaultEndDate;

        const dateWhere = { date: { gte: start, lte: end } };
        if (classRoomId) dateWhere.classRoomId = classRoomId;

        // ── Summary counts + enrollment in parallel ─────────────────────────
        const [statusCounts, enrolledStudents] = await Promise.all([
            prisma.attendance.groupBy({
                by: ['status'],
                where: dateWhere,
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

        const presentCount  = countMap['PRESENT']  || 0;
        const absentCount   = countMap['ABSENT']   || 0;
        const lateCount     = countMap['LATE']     || 0;
        const excusedCount  = countMap['EXCUSED']  || 0;

        const totalPossible = enrolledStudents * Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const overallAttendancePercentage = totalPossible > 0
            ? ((presentCount + lateCount) / totalPossible * 100).toFixed(2)
            : 0;

        const statusDistribution = [
            { name: 'Present', value: presentCount, color: '#10B981' },
            { name: 'Absent',  value: absentCount,  color: '#EF4444' },
            { name: 'Late',    value: lateCount,    color: '#F59E0B' },
            { name: 'Excused', value: excusedCount, color: '#6B7280' },
        ].filter(item => item.value > 0);

        // ── Class-wise attendance ────────────────────────────────────────────
        // FIXED: was N+1 (3 queries × N classes). Now 3 queries total.
        let classWiseAttendance = [];
        if (!classRoomId) {
            const [allClasses, presentByClass, totalByClass, enrollmentByClass] =
                await Promise.all([
                    prisma.classRoom.findMany({
                        select: { id: true, name: true, type: true },
                    }),
                    // present + late counts grouped by class
                    prisma.attendance.groupBy({
                        by: ['classRoomId'],
                        where: {
                            date: { gte: start, lte: end },
                            OR: [{ status: 'PRESENT' }, { status: 'LATE' }],
                        },
                        _count: { id: true },
                    }),
                    // total records grouped by class
                    prisma.attendance.groupBy({
                        by: ['classRoomId'],
                        where: { date: { gte: start, lte: end } },
                        _count: { id: true },
                    }),
                    // enrollment counts grouped by class
                    prisma.enrollment.groupBy({
                        by: ['classRoomId'],
                        where: { isCurrent: true },
                        _count: { id: true },
                    }),
                ]);

            const presentMap    = Object.fromEntries(presentByClass.map(r => [r.classRoomId, r._count.id]));
            const totalMap      = Object.fromEntries(totalByClass.map(r => [r.classRoomId, r._count.id]));
            const enrollmentMap = Object.fromEntries(enrollmentByClass.map(r => [r.classRoomId, r._count.id]));
            const daySpan       = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

            classWiseAttendance = allClasses
                .filter(c => totalMap[c.id])   // skip classes with no records in range
                .map(c => {
                    const presentInClass  = presentMap[c.id]    || 0;
                    const totalRecs       = totalMap[c.id]      || 0;
                    const enrolled        = enrollmentMap[c.id] || 0;
                    const classTotalPoss  = enrolled * daySpan;
                    const pct             = classTotalPoss > 0
                        ? parseFloat((presentInClass / classTotalPoss * 100).toFixed(2))
                        : 0;

                    return {
                        classId:              c.id,
                        className:            c.name,
                        classType:            c.type,
                        totalStudents:        enrolled,
                        attendancePercentage: pct,
                        presentCount:         presentInClass,
                        totalRecords:         totalRecs,
                    };
                })
                .sort((a, b) => b.attendancePercentage - a.attendancePercentage);
        }

        res.json({
            period: {
                startDate: start.toISOString().split('T')[0],
                endDate:   end.toISOString().split('T')[0],
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
                classWiseAttendance: classWiseAttendance.slice(0, 10),
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

        const endDate   = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const dateRange = [];
        for (let i = 0; i < parseInt(days); i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            dateRange.push(date.toISOString().split('T')[0]);
        }

        const where = { date: { gte: startDate, lte: endDate } };
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
            const dayPresent    = dailyPresent.find(d => d.date.toISOString().split('T')[0] === date);
            const total         = dayAttendance?._count.id || 0;
            const present       = dayPresent?._count.id    || 0;
            const percentage    = total > 0 ? parseFloat((present / total * 100).toFixed(2)) : 0;
            return { date, total, present, percentage };
        });

        res.json({
            period: {
                startDate: startDate.toISOString().split('T')[0],
                endDate:   endDate.toISOString().split('T')[0],
                days:      parseInt(days),
            },
            trends,
        });
    } catch (error) {
        logger.error({ err: error }, 'Get attendance trends error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Get class attendance comparison
async function getClassAttendanceComparison(req, res) {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
        const end   = endDate   ? new Date(endDate)   : new Date();

        // FIXED: was 2 COUNT queries × N classes (N+1).
        // Now: fetch everything in 4 parallel queries, then join in JS.
        const [classes, presentByClass, totalByClass, enrollmentByClass] =
            await Promise.all([
                prisma.classRoom.findMany({
                    select: { id: true, name: true, type: true },
                }),
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
            ]);

        const presentMap    = Object.fromEntries(presentByClass.map(r => [r.classRoomId, r._count.id]));
        const totalMap      = Object.fromEntries(totalByClass.map(r => [r.classRoomId, r._count.id]));
        const enrollmentMap = Object.fromEntries(enrollmentByClass.map(r => [r.classRoomId, r._count.id]));
        const daySpan       = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        const classComparison = classes.map(c => {
            const presentCount   = presentMap[c.id]    || 0;
            const totalRecords   = totalMap[c.id]      || 0;
            const enrolled       = enrollmentMap[c.id] || 0;
            const totalPossible  = enrolled * daySpan;
            const percentage     = totalPossible > 0
                ? parseFloat((presentCount / totalPossible * 100).toFixed(2))
                : 0;

            return {
                classId:              c.id,
                className:            c.name,
                classType:            c.type,
                totalStudents:        enrolled,
                attendancePercentage: percentage,
                presentCount,
                totalRecords,
            };
        });

        classComparison.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

        res.json({
            period: {
                startDate: start.toISOString().split('T')[0],
                endDate:   end.toISOString().split('T')[0],
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
                skip:    parseInt(skip),
                take:    parseInt(limit),
                include: {
                    teacher: {
                        include: {
                            user: { select: { name: true, email: true, phone: true } },
                        },
                    },
                    appliedToAdmin: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.leaveRequest.count({ where }),
        ]);

        res.json({
            leaveRequests,
            pagination: {
                page:  parseInt(page),
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
        const { id }              = req.params;
        const { status, response } = req.body;

        if (!status || !['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ error: 'Valid status is required' });
        }

        const leaveRequest = await prisma.leaveRequest.findUnique({ where: { id } });
        if (!leaveRequest) return res.status(404).json({ error: 'Leave request not found' });

        const updatedLeaveRequest = await prisma.leaveRequest.update({
            where: { id },
            data:  { status, response: response || null },
            include: {
                teacher: {
                    include: { user: { select: { name: true, email: true } } },
                },
            },
        });

        logger.info({ requestId: id, status }, 'Leave request updated');
        res.json({
            message:      `Leave request ${status.toLowerCase()} successfully`,
            leaveRequest: updatedLeaveRequest,
        });
    } catch (error) {
        logger.error({ err: error }, 'Update leave request error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// GET /admin/stats/students-at-risk
// FIXED: was 4 COUNT queries × N students (120+ queries for 30 students).
// Now: 3 queries total — one aggregation for period stats, one for recent
// absences, one for enrollments. All JS, no per-student round trips.
async function getStudentsAtRisk(req, res) {
    try {
        const {
            classRoomId,
            startDate,
            endDate,
            thresholdPercent = 75,
            criticalPercent  = 60,
        } = req.query;

        const start = startDate
            ? new Date(startDate)
            : new Date(Date.now() - 30 * 86400000);
        const end   = endDate ? new Date(endDate) : new Date();
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

        const threshold = parseFloat(thresholdPercent);
        const critical  = parseFloat(criticalPercent);

        // ── 1. All active enrollments (single query) ─────────────────────────
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

        if (!enrollments.length) {
            return res.json({
                period: {
                    startDate: start.toISOString().split('T')[0],
                    endDate:   end.toISOString().split('T')[0],
                },
                summary: {
                    totalStudentsChecked: 0,
                    atRiskCount:   0,
                    criticalCount: 0,
                    warningCount:  0,
                    thresholdPercent: threshold,
                    criticalPercent:  critical,
                },
                atRiskStudents: [],
            });
        }

        const studentIds  = [...new Set(enrollments.map(e => e.studentId))];
        const classIds    = [...new Set(enrollments.map(e => e.classRoomId))];

        // ── 2. Period attendance counts — one groupBy, all students at once ──
        // Groups by (studentId, classRoomId, status) → replaces 3 COUNTs × N
        const periodCounts = await prisma.attendance.groupBy({
            by: ['studentId', 'classRoomId', 'status'],
            where: {
                studentId:   { in: studentIds },
                classRoomId: { in: classIds },
                date:        { gte: start, lte: end },
            },
            _count: { id: true },
        });

        // ── 3. Recent 7-day records for consecutive-absence streak ───────────
        // One query for all students, replaces findMany × N
        const recentRecords = await prisma.attendance.findMany({
            where: {
                studentId:   { in: studentIds },
                classRoomId: { in: classIds },
                date:        { gte: sevenDaysAgo },
            },
            orderBy: { date: 'desc' },
            select: {
                studentId:   true,
                classRoomId: true,
                status:      true,
                date:        true,
            },
        });

        // ── Build lookup maps ────────────────────────────────────────────────
        // periodCounts → { `${studentId}:${classRoomId}` → { PRESENT, ABSENT, LATE, … } }
        const periodMap = {};
        for (const row of periodCounts) {
            const key = `${row.studentId}:${row.classRoomId}`;
            if (!periodMap[key]) periodMap[key] = {};
            periodMap[key][row.status] = row._count.id;
        }

        // recentRecords → { `${studentId}:${classRoomId}` → [sorted desc by date] }
        const recentMap = {};
        for (const row of recentRecords) {
            const key = `${row.studentId}:${row.classRoomId}`;
            if (!recentMap[key]) recentMap[key] = [];
            recentMap[key].push(row);
        }

        // ── Compute risk profiles entirely in JS ─────────────────────────────
        const studentRiskProfiles = enrollments.map((enrollment) => {
            const key    = `${enrollment.studentId}:${enrollment.classRoomId}`;
            const counts = periodMap[key] || {};

            const totalRecords   = Object.values(counts).reduce((s, n) => s + n, 0);
            const presentRecords = (counts['PRESENT'] || 0) + (counts['LATE'] || 0);
            const absentRecords  = counts['ABSENT'] || 0;

            const attendancePercent = totalRecords > 0
                ? parseFloat(((presentRecords / totalRecords) * 100).toFixed(2))
                : null;

            // Consecutive absence streak from the last 7 days
            const recent = recentMap[key] || [];
            let consecutiveAbsenceStreak = 0;
            for (const record of recent) {
                if (record.status === 'ABSENT') consecutiveAbsenceStreak++;
                else break;
            }

            // Risk level
            let riskLevel  = 'NONE';
            const riskReasons = [];

            if (attendancePercent !== null) {
                if (attendancePercent < critical) {
                    riskLevel = 'CRITICAL';
                    riskReasons.push(
                        `Attendance at ${attendancePercent}% — below critical threshold of ${critical}%`
                    );
                } else if (attendancePercent < threshold) {
                    riskLevel = 'WARNING';
                    riskReasons.push(
                        `Attendance at ${attendancePercent}% — below required ${threshold}%`
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
                studentId:   enrollment.studentId,
                studentName: enrollment.student.user.name,
                email:       enrollment.student.user.email,
                phone:       enrollment.student.user.phone,
                admissionNo: enrollment.student.admissionNo,
                classRoom:   enrollment.classRoom,
                parents:     enrollment.student.parents?.map((p) => ({
                    name:  p.user.name,
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

        // ── Filter + sort ────────────────────────────────────────────────────
        const riskOrder    = { CRITICAL: 0, WARNING: 1, NONE: 2 };
        const atRiskStudents = studentRiskProfiles
            .filter((s) => s.riskLevel !== 'NONE')
            .sort((a, b) => {
                if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
                    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
                }
                return (a.attendance.attendancePercent ?? 100) -
                       (b.attendance.attendancePercent ?? 100);
            });

        const summary = {
            totalStudentsChecked: studentRiskProfiles.length,
            atRiskCount:   atRiskStudents.length,
            criticalCount: atRiskStudents.filter((s) => s.riskLevel === 'CRITICAL').length,
            warningCount:  atRiskStudents.filter((s) => s.riskLevel === 'WARNING').length,
            thresholdPercent: threshold,
            criticalPercent:  critical,
        };

        res.json({
            period: {
                startDate: start.toISOString().split('T')[0],
                endDate:   end.toISOString().split('T')[0],
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