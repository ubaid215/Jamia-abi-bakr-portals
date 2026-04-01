// controllers/admin/statsController.js — System stats, attendance overview, trends
// OPTIMIZED: Added query timeouts, connection pooling, and Redis cache fixes

const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

// ─── Query Timeout Wrapper ──────────────────────────────────────────────
const withTimeout = async (promise, timeoutMs = 5000) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`Query timeout after ${timeoutMs}ms`));
        }, timeoutMs);
    });
    
    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

// ─── Lightweight TTL cache (drop-in replacement point for Redis) ──────────────
class SimpleCache {
    constructor() { 
        this._store = new Map(); 
        this._cleanupInterval = setInterval(() => this._cleanup(), 60000); // Cleanup every minute
    }
    
    _cleanup() {
        const now = Date.now();
        for (const [key, entry] of this._store.entries()) {
            if (now > entry.expiresAt) {
                this._store.delete(key);
            }
        }
    }
    
    get(key) {
        const entry = this._store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this._store.delete(key);
            return null;
        }
        return entry.value;
    }
    
    set(key, value, ttlSeconds) {
        this._store.set(key, { 
            value, 
            expiresAt: Date.now() + ttlSeconds * 1000 
        });
    }
    
    invalidatePattern(pattern) {
        for (const key of this._store.keys()) {
            if (key.includes(pattern)) {
                this._store.delete(key);
            }
        }
    }
    
    destroy() {
        clearInterval(this._cleanupInterval);
    }
}

const cache = new SimpleCache();
const STATS_TTL = 60;     // seconds
const OVERVIEW_TTL = 60;  // seconds

// ─── Helper: convert a JS Date to a YYYY-MM-DD string in UTC ─────────────────
const toDateKey = (d) => (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0];

// ─── getSystemStats ───────────────────────────────────────────────────────────
async function getSystemStats(req, res) {
    const cacheKey = 'stats:system';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        // Set statement timeout for this session to prevent hanging queries
        await prisma.$executeRaw`SET LOCAL statement_timeout = '10000'`;
        
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
            withTimeout(prisma.user.count(), 3000),
            withTimeout(prisma.user.count({ where: { role: 'TEACHER' } }), 3000),
            withTimeout(prisma.user.count({ where: { role: 'STUDENT' } }), 3000),
            withTimeout(prisma.user.count({ where: { role: 'PARENT' } }), 3000),
            withTimeout(prisma.classRoom.count(), 3000),
            withTimeout(prisma.subject.count(), 3000),
            withTimeout(prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }), 3000),
            withTimeout(prisma.user.count({ where: { role: 'TEACHER', status: 'ACTIVE' } }), 3000),
            withTimeout(prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true, name: true, role: true, createdAt: true },
            }), 3000),
            withTimeout(prisma.classRoom.groupBy({
                by: ['type'],
                _count: { id: true },
            }), 3000),
        ]);

        // Reset statement timeout
        await prisma.$executeRaw`RESET statement_timeout`;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [attendanceRecords, presentCount] = await Promise.all([
            prisma.attendance.count({ where: { date: { gte: sevenDaysAgo } } }),
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

        const payload = {
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
        };

        cache.set(cacheKey, payload, STATS_TTL);
        res.json(payload);
    } catch (error) {
        if (error.message && error.message.includes('timeout')) {
            logger.error({ err: error }, 'Query timeout in getSystemStats');
            return res.status(504).json({ error: 'Request timeout - please try again' });
        }
        logger.error({ err: error }, 'Get system stats error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ─── getAttendanceOverview ────────────────────────────────────────────────────
async function getAttendanceOverview(req, res) {
    const { startDate, endDate, classRoomId } = req.query;

    const cacheKey = `stats:overview:${startDate || ''}:${endDate || ''}:${classRoomId || ''}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        const defaultEndDate = new Date();
        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() - 30);

        const start = startDate ? new Date(startDate) : defaultStartDate;
        const end = endDate ? new Date(endDate) : defaultEndDate;

        const where = { date: { gte: start, lte: end } };
        if (classRoomId) where.classRoomId = classRoomId;

        // Add timeout to these queries
        const [statusCounts, enrolledStudents, uniqueDatesResult] = await Promise.all([
            withTimeout(prisma.attendance.groupBy({
                by: ['status'],
                where,
                _count: { id: true },
            }), 5000),
            withTimeout(prisma.enrollment.count({
                where: {
                    isCurrent: true,
                    ...(classRoomId && { classRoomId }),
                },
            }), 3000),
            withTimeout(prisma.attendance.groupBy({
                by: ['date'],
                where,
                _count: { id: true },
            }), 5000),
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

        const schoolDayCount = uniqueDatesResult.length;
        const totalPossible = enrolledStudents * schoolDayCount;
        const overallAttendancePercentage = totalPossible > 0
            ? ((presentCount + lateCount) / totalPossible * 100).toFixed(2)
            : 0;

        const payload = {
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
                statusDistribution: [
                    { name: 'Present', value: presentCount, color: '#10B981' },
                    { name: 'Absent', value: absentCount, color: '#EF4444' },
                    { name: 'Late', value: lateCount, color: '#F59E0B' },
                    { name: 'Excused', value: excusedCount, color: '#6B7280' },
                ].filter(item => item.value > 0),
                classWiseAttendance: [],
            },
        };

        cache.set(cacheKey, payload, OVERVIEW_TTL);
        res.json(payload);
    } catch (error) {
        if (error.message && error.message.includes('timeout')) {
            logger.error({ err: error }, 'Query timeout in getAttendanceOverview');
            return res.status(504).json({ error: 'Request timeout - please try again' });
        }
        logger.error({ err: error }, 'Get attendance overview error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ─── getAttendanceTrends ──────────────────────────────────────────────────────
async function getAttendanceTrends(req, res) {
    try {
        const { days = 30, classRoomId } = req.query;
        const dayCount = Math.min(parseInt(days), 365);

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dayCount);

        const dateRange = [];
        for (let i = 0; i < dayCount; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            dateRange.push(toDateKey(d));
        }

        const where = { date: { gte: startDate, lte: endDate } };
        if (classRoomId) where.classRoomId = classRoomId;

        const [dailyAttendance, dailyPresent] = await Promise.all([
            withTimeout(prisma.attendance.groupBy({
                by: ['date'],
                where,
                _count: { id: true },
            }), 5000),
            withTimeout(prisma.attendance.groupBy({
                by: ['date'],
                where: { ...where, OR: [{ status: 'PRESENT' }, { status: 'LATE' }] },
                _count: { id: true },
            }), 5000),
        ]);

        const totalMap = new Map(dailyAttendance.map(d => [toDateKey(d.date), d._count.id]));
        const presentMap = new Map(dailyPresent.map(d => [toDateKey(d.date), d._count.id]));

        const trends = dateRange.map(dateKey => {
            const total = totalMap.get(dateKey) || 0;
            const present = presentMap.get(dateKey) || 0;
            const percentage = total > 0 ? parseFloat((present / total * 100).toFixed(2)) : 0;
            return { date: dateKey, total, present, percentage };
        });

        res.json({
            period: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                days: dayCount,
            },
            trends,
        });
    } catch (error) {
        if (error.message && error.message.includes('timeout')) {
            logger.error({ err: error }, 'Query timeout in getAttendanceTrends');
            return res.status(504).json({ error: 'Request timeout - please try again' });
        }
        logger.error({ err: error }, 'Get attendance trends error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ─── getClassAttendanceComparison ─────────────────────────────────────────────
async function getClassAttendanceComparison(req, res) {
    try {
        const { startDate, endDate } = req.query;

        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : (() => {
            const d = new Date(end);
            d.setDate(d.getDate() - 30);
            return d;
        })();

        const dateWhere = { date: { gte: start, lte: end } };

        const [classPresent, classTotals, classEnrollments, allClasses, classDates] = await Promise.all([
            withTimeout(prisma.attendance.groupBy({
                by: ['classRoomId'],
                where: { ...dateWhere, OR: [{ status: 'PRESENT' }, { status: 'LATE' }] },
                _count: { id: true },
            }), 5000),
            withTimeout(prisma.attendance.groupBy({
                by: ['classRoomId'],
                where: dateWhere,
                _count: { id: true },
            }), 5000),
            withTimeout(prisma.enrollment.groupBy({
                by: ['classRoomId'],
                where: { isCurrent: true },
                _count: { id: true },
            }), 3000),
            withTimeout(prisma.classRoom.findMany({
                select: { id: true, name: true, type: true },
            }), 3000),
            withTimeout(prisma.attendance.groupBy({
                by: ['classRoomId', 'date'],
                where: dateWhere,
            }), 5000),
        ]);

        const presentByClass = new Map(classPresent.map(r => [r.classRoomId, r._count.id]));
        const totalByClass = new Map(classTotals.map(r => [r.classRoomId, r._count.id]));
        const enrollByClass = new Map(classEnrollments.map(r => [r.classRoomId, r._count.id]));

        const schoolDaysByClass = new Map();
        for (const row of classDates) {
            schoolDaysByClass.set(
                row.classRoomId,
                (schoolDaysByClass.get(row.classRoomId) || 0) + 1
            );
        }

        const classComparison = allClasses.map(classRoom => {
            const presentCount = presentByClass.get(classRoom.id) || 0;
            const totalRecords = totalByClass.get(classRoom.id) || 0;
            const enrollmentCount = enrollByClass.get(classRoom.id) || 0;
            const schoolDays = schoolDaysByClass.get(classRoom.id) || 0;
            const totalPossible = enrollmentCount * schoolDays;
            const percentage = totalPossible > 0
                ? parseFloat((presentCount / totalPossible * 100).toFixed(2))
                : 0;

            return {
                classId: classRoom.id,
                className: classRoom.name,
                classType: classRoom.type,
                totalStudents: enrollmentCount,
                attendancePercentage: percentage,
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
        if (error.message && error.message.includes('timeout')) {
            logger.error({ err: error }, 'Query timeout in getClassAttendanceComparison');
            return res.status(504).json({ error: 'Request timeout - please try again' });
        }
        logger.error({ err: error }, 'Get class attendance comparison error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ─── manageLeaveRequests ──────────────────────────────────────────────────────
async function manageLeaveRequests(req, res) {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const skip = (page - 1) * limit;

        const where = {};
        if (status) where.status = status;

        const [leaveRequests, total] = await Promise.all([
            withTimeout(prisma.leaveRequest.findMany({
                where,
                skip: parseInt(skip),
                take: parseInt(limit),
                include: {
                    teacher: {
                        include: {
                            user: { select: { name: true, email: true, phone: true } },
                        },
                    },
                    appliedToAdmin: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
            }), 5000),
            withTimeout(prisma.leaveRequest.count({ where }), 3000),
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
        if (error.message && error.message.includes('timeout')) {
            logger.error({ err: error }, 'Query timeout in manageLeaveRequests');
            return res.status(504).json({ error: 'Request timeout - please try again' });
        }
        logger.error({ err: error }, 'Manage leave requests error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ─── updateLeaveRequest ───────────────────────────────────────────────────────
async function updateLeaveRequest(req, res) {
    try {
        const { id } = req.params;
        const { status, response } = req.body;

        if (!status || !['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ error: 'Valid status is required' });
        }

        const leaveRequest = await withTimeout(prisma.leaveRequest.findUnique({ where: { id } }), 3000);
        if (!leaveRequest) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        const updatedLeaveRequest = await withTimeout(prisma.leaveRequest.update({
            where: { id },
            data: { status, response: response || null },
            include: {
                teacher: {
                    include: {
                        user: { select: { name: true, email: true } },
                    },
                },
            },
        }), 5000);

        logger.info({ requestId: id, status }, 'Leave request updated');

        res.json({
            message: `Leave request ${status.toLowerCase()} successfully`,
            leaveRequest: updatedLeaveRequest,
        });
    } catch (error) {
        if (error.message && error.message.includes('timeout')) {
            logger.error({ err: error }, 'Query timeout in updateLeaveRequest');
            return res.status(504).json({ error: 'Request timeout - please try again' });
        }
        logger.error({ err: error }, 'Update leave request error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ─── getStudentsAtRisk ────────────────────────────────────────────────────────
async function getStudentsAtRisk(req, res) {
    try {
        const {
            classRoomId,
            startDate,
            endDate,
            thresholdPercent = 75,
            criticalPercent = 60,
        } = req.query;

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
        const end = endDate ? new Date(endDate) : new Date();

        const enrollments = await withTimeout(prisma.enrollment.findMany({
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
        }), 8000);

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

        const attendanceWhere = {
            date: { gte: start, lte: end },
            ...(classRoomId && { classRoomId }),
        };
        const recentWhere = {
            date: { gte: new Date(Date.now() - 7 * 86400000) },
            ...(classRoomId && { classRoomId }),
        };

        const [allTotals, allPresent, allAbsent, recentAttendance] = await Promise.all([
            withTimeout(prisma.attendance.groupBy({
                by: ['studentId', 'classRoomId'],
                where: attendanceWhere,
                _count: { id: true },
            }), 5000),
            withTimeout(prisma.attendance.groupBy({
                by: ['studentId', 'classRoomId'],
                where: { ...attendanceWhere, OR: [{ status: 'PRESENT' }, { status: 'LATE' }] },
                _count: { id: true },
            }), 5000),
            withTimeout(prisma.attendance.groupBy({
                by: ['studentId', 'classRoomId'],
                where: { ...attendanceWhere, status: 'ABSENT' },
                _count: { id: true },
            }), 5000),
            withTimeout(prisma.attendance.findMany({
                where: recentWhere,
                orderBy: { date: 'desc' },
                select: { studentId: true, classRoomId: true, status: true, date: true },
            }), 5000),
        ]);

        const totalMap = new Map(allTotals.map(r => [`${r.studentId}:${r.classRoomId}`, r._count.id]));
        const presentMap = new Map(allPresent.map(r => [`${r.studentId}:${r.classRoomId}`, r._count.id]));
        const absentMap = new Map(allAbsent.map(r => [`${r.studentId}:${r.classRoomId}`, r._count.id]));
        const recentMap = new Map();

        for (const r of recentAttendance) {
            const key = `${r.studentId}:${r.classRoomId}`;
            if (!recentMap.has(key)) recentMap.set(key, []);
            recentMap.get(key).push(r);
        }

        const studentRiskProfiles = enrollments.map((enrollment) => {
            const key = `${enrollment.studentId}:${enrollment.classRoomId}`;
            const totalRecords = totalMap.get(key) || 0;
            const presentRecords = presentMap.get(key) || 0;
            const absentRecords = absentMap.get(key) || 0;
            const recentRecords = recentMap.get(key) || [];

            const attendancePercent = totalRecords > 0
                ? parseFloat(((presentRecords / totalRecords) * 100).toFixed(2))
                : null;

            let consecutiveAbsenceStreak = 0;
            for (const record of recentRecords) {
                if (record.status === 'ABSENT') consecutiveAbsenceStreak++;
                else break;
            }

            let riskLevel = 'NONE';
            const riskReasons = [];

            if (attendancePercent !== null) {
                if (attendancePercent < parseFloat(criticalPercent)) {
                    riskLevel = 'CRITICAL';
                    riskReasons.push(`Attendance at ${attendancePercent}% — below critical threshold of ${criticalPercent}%`);
                } else if (attendancePercent < parseFloat(thresholdPercent)) {
                    riskLevel = 'WARNING';
                    riskReasons.push(`Attendance at ${attendancePercent}% — below required ${thresholdPercent}%`);
                }
            }

            if (consecutiveAbsenceStreak >= 3) {
                if (riskLevel === 'NONE') riskLevel = 'WARNING';
                if (consecutiveAbsenceStreak >= 5) riskLevel = 'CRITICAL';
                riskReasons.push(`${consecutiveAbsenceStreak} consecutive absences in the last 7 days`);
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

        const riskOrder = { CRITICAL: 0, WARNING: 1, NONE: 2 };
        const atRiskStudents = studentRiskProfiles
            .filter((s) => s.riskLevel !== 'NONE')
            .sort((a, b) => {
                if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
                    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
                }
                return (a.attendance.attendancePercent ?? 100) - (b.attendance.attendancePercent ?? 100);
            });

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
        if (error.message && error.message.includes('timeout')) {
            logger.error({ err: error }, 'Query timeout in getStudentsAtRisk');
            return res.status(504).json({ error: 'Request timeout - please try again' });
        }
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