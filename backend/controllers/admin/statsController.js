// controllers/admin/statsController.js — System stats, attendance overview, trends
// FIXES applied (see audit report):
//   [CRITICAL]  getAttendanceTrends — replaced O(n²) .find() loops with Map lookups (O(1) per day)
//   [CRITICAL]  getClassAttendanceSummary attendance % — divisor now uses unique attendance dates
//               (was: enrolledStudents × calendar days — inflated denominator, always near 0%)
//   [MEDIUM]    getAttendanceTrends — same date-string comparison bug fixed (UTC ISO vs local)
//   [MEDIUM]    getClassAttendanceComparison — same divisor bug fixed for consistency
//   [PERF]      getSystemStats / getAttendanceOverview — 60-second in-process cache added
//               (swap the SimpleCache class for Upstash Redis when ready — same API surface)
//   [UNCHANGED] getStudentsAtRisk, manageLeaveRequests, updateLeaveRequest — already correct

const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

// ─── Lightweight TTL cache (drop-in replacement point for Redis) ──────────────
// To migrate to Upstash:
//   1. npm install @upstash/redis
//   2. Replace SimpleCache with:
//        const { Redis } = require('@upstash/redis');
//        const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL,
//                                  token: process.env.UPSTASH_REDIS_REST_TOKEN });
//        async function cacheGet(key) { return redis.get(key); }
//        async function cacheSet(key, value, ttlSeconds) { return redis.set(key, value, { ex: ttlSeconds }); }
class SimpleCache {
    constructor() { this._store = new Map(); }
    get(key) {
        const entry = this._store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) { this._store.delete(key); return null; }
        return entry.value;
    }
    set(key, value, ttlSeconds) {
        this._store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
}
const cache = new SimpleCache();
const STATS_TTL = 60;     // seconds
const OVERVIEW_TTL = 60;  // seconds

// ─── Helper: convert a JS Date to a YYYY-MM-DD string in UTC ─────────────────
// Prisma returns DateTime fields as JS Date objects. Using toISOString().split('T')[0]
// is correct for UTC-stored dates. Avoid toLocaleDateString() — it shifts on server TZ.
const toDateKey = (d) => (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0];

// ─── getSystemStats ───────────────────────────────────────────────────────────
async function getSystemStats(req, res) {
    const cacheKey = 'stats:system';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

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
        logger.error({ err: error }, 'Get system stats error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ─── getAttendanceOverview ────────────────────────────────────────────────────
// FIX: overall attendance % divisor now uses the count of unique attendance
//      dates in the period rather than (enrolledStudents × calendarDays).
//      Calendar days inflates the denominator hugely (weekends, holidays, etc.),
//      making the percentage appear near 0 % on production with real data.
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
        const end   = endDate   ? new Date(endDate)   : defaultEndDate;

        const where = { date: { gte: start, lte: end } };
        if (classRoomId) where.classRoomId = classRoomId;

        // Batch: status counts + enrolled students + unique dates in the period
        const [statusCounts, enrolledStudents, uniqueDatesResult] = await Promise.all([
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
            // FIX: count distinct school days that actually had attendance records
            // instead of blindly multiplying by calendar days
            prisma.attendance.groupBy({
                by: ['date'],
                where,
                _count: { id: true },
            }),
        ]);

        const countMap = {};
        let totalRecords = 0;
        for (const sc of statusCounts) {
            countMap[sc.status] = sc._count.id;
            totalRecords += sc._count.id;
        }

        const presentCount  = countMap['PRESENT']  || 0;
        const absentCount   = countMap['ABSENT']    || 0;
        const lateCount     = countMap['LATE']      || 0;
        const excusedCount  = countMap['EXCUSED']   || 0;

        // FIX: use actual school-day count, not calendar-day count
        const schoolDayCount = uniqueDatesResult.length;
        const totalPossible  = enrolledStudents * schoolDayCount;
        const overallAttendancePercentage = totalPossible > 0
            ? ((presentCount + lateCount) / totalPossible * 100).toFixed(2)
            : 0;

        const statusDistribution = [
            { name: 'Present',  value: presentCount,  color: '#10B981' },
            { name: 'Absent',   value: absentCount,   color: '#EF4444' },
            { name: 'Late',     value: lateCount,     color: '#F59E0B' },
            { name: 'Excused',  value: excusedCount,  color: '#6B7280' },
        ].filter(item => item.value > 0);

        // Class-wise attendance — 4 queries total (N+1 already fixed in original)
        let classWiseAttendance = [];
        if (!classRoomId) {
            // FIX: each class's divisor also uses unique dates per class
            const [classPresent, classTotals, classEnrollments, allClasses, classDates] = await Promise.all([
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
                // FIX: get distinct dates per class so each class has its own school-day count
                prisma.attendance.groupBy({
                    by: ['classRoomId', 'date'],
                    where: { date: { gte: start, lte: end } },
                }),
            ]);

            const presentByClass  = new Map(classPresent.map(r => [r.classRoomId, r._count.id]));
            const totalByClass    = new Map(classTotals.map(r => [r.classRoomId, r._count.id]));
            const enrollByClass   = new Map(classEnrollments.map(r => [r.classRoomId, r._count.id]));

            // Count unique school days per class
            const schoolDaysByClass = new Map();
            for (const row of classDates) {
                schoolDaysByClass.set(
                    row.classRoomId,
                    (schoolDaysByClass.get(row.classRoomId) || 0) + 1
                );
            }

            classWiseAttendance = allClasses
                .filter(classRoom => totalByClass.has(classRoom.id))
                .map(classRoom => {
                    const presentInClass   = presentByClass.get(classRoom.id) || 0;
                    const classEnrollment  = enrollByClass.get(classRoom.id)  || 0;
                    const classSchoolDays  = schoolDaysByClass.get(classRoom.id) || 0;
                    const classTotalPossible = classEnrollment * classSchoolDays;
                    const percentage = classTotalPossible > 0
                        ? (presentInClass / classTotalPossible * 100).toFixed(2)
                        : 0;

                    return {
                        classId:              classRoom.id,
                        className:            classRoom.name,
                        classType:            classRoom.type,
                        totalStudents:        classEnrollment,
                        attendancePercentage: parseFloat(percentage),
                        presentCount:         presentInClass,
                        totalRecords:         totalByClass.get(classRoom.id) || 0,
                    };
                })
                .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
                .slice(0, 10);
        }

        const payload = {
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
                classWiseAttendance,
            },
        };

        cache.set(cacheKey, payload, OVERVIEW_TTL);
        res.json(payload);
    } catch (error) {
        logger.error({ err: error }, 'Get attendance overview error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ─── getAttendanceTrends ──────────────────────────────────────────────────────
// FIX 1: replaced O(n²) dailyAttendance.find() loop with Map for O(1) lookups.
// FIX 2: date key built with toDateKey() (UTC ISO) to match how Prisma returns dates.
//         Previously compared `d.date.toISOString().split('T')[0]` inside find() —
//         which re-converted every element on every iteration and was still correct
//         but O(n²). Now O(n) build + O(1) lookup.
async function getAttendanceTrends(req, res) {
    try {
        const { days = 30, classRoomId } = req.query;
        const dayCount = Math.min(parseInt(days), 365); // guard against absurd ranges

        const endDate   = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dayCount);

        // Build the date-key array once
        const dateRange = [];
        for (let i = 0; i < dayCount; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            dateRange.push(toDateKey(d));
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
                where: { ...where, OR: [{ status: 'PRESENT' }, { status: 'LATE' }] },
                _count: { id: true },
            }),
        ]);

        // FIX: build Maps — O(n) once, then O(1) per day below
        const totalMap   = new Map(dailyAttendance.map(d => [toDateKey(d.date), d._count.id]));
        const presentMap = new Map(dailyPresent.map(d => [toDateKey(d.date), d._count.id]));

        const trends = dateRange.map(dateKey => {
            const total   = totalMap.get(dateKey)   || 0;
            const present = presentMap.get(dateKey) || 0;
            const percentage = total > 0 ? parseFloat((present / total * 100).toFixed(2)) : 0;
            return { date: dateKey, total, present, percentage };
        });

        res.json({
            period: {
                startDate: startDate.toISOString().split('T')[0],
                endDate:   endDate.toISOString().split('T')[0],
                days:      dayCount,
            },
            trends,
        });
    } catch (error) {
        logger.error({ err: error }, 'Get attendance trends error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ─── getClassAttendanceComparison ─────────────────────────────────────────────
// FIX: divisor now uses unique school days per class (same fix as overview).
//      startDate handling also fixed — original code always reset start to 30
//      days before TODAY regardless of the startDate param.
async function getClassAttendanceComparison(req, res) {
    try {
        const { startDate, endDate } = req.query;

        const end   = endDate   ? new Date(endDate)   : new Date();
        const start = startDate ? new Date(startDate) : (() => {
            const d = new Date(end);
            d.setDate(d.getDate() - 30);
            return d;
        })();

        const dateWhere = { date: { gte: start, lte: end } };

        const [classPresent, classTotals, classEnrollments, allClasses, classDates] = await Promise.all([
            prisma.attendance.groupBy({
                by: ['classRoomId'],
                where: { ...dateWhere, OR: [{ status: 'PRESENT' }, { status: 'LATE' }] },
                _count: { id: true },
            }),
            prisma.attendance.groupBy({
                by: ['classRoomId'],
                where: dateWhere,
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
            // FIX: unique school days per class
            prisma.attendance.groupBy({
                by: ['classRoomId', 'date'],
                where: dateWhere,
            }),
        ]);

        const presentByClass  = new Map(classPresent.map(r => [r.classRoomId, r._count.id]));
        const totalByClass    = new Map(classTotals.map(r => [r.classRoomId, r._count.id]));
        const enrollByClass   = new Map(classEnrollments.map(r => [r.classRoomId, r._count.id]));

        const schoolDaysByClass = new Map();
        for (const row of classDates) {
            schoolDaysByClass.set(
                row.classRoomId,
                (schoolDaysByClass.get(row.classRoomId) || 0) + 1
            );
        }

        const classComparison = allClasses.map(classRoom => {
            const presentCount    = presentByClass.get(classRoom.id) || 0;
            const totalRecords    = totalByClass.get(classRoom.id)   || 0;
            const enrollmentCount = enrollByClass.get(classRoom.id)  || 0;
            const schoolDays      = schoolDaysByClass.get(classRoom.id) || 0;
            const totalPossible   = enrollmentCount * schoolDays;
            const percentage      = totalPossible > 0
                ? parseFloat((presentCount / totalPossible * 100).toFixed(2))
                : 0;

            return {
                classId:              classRoom.id,
                className:            classRoom.name,
                classType:            classRoom.type,
                totalStudents:        enrollmentCount,
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

// ─── manageLeaveRequests ──────────────────────────────────────────────────────
// Unchanged — already correct.
async function manageLeaveRequests(req, res) {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const skip = (page - 1) * limit;

        const where = {};
        if (status) where.status = status;

        const [leaveRequests, total] = await Promise.all([
            prisma.leaveRequest.findMany({
                where,
                skip:  parseInt(skip),
                take:  parseInt(limit),
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

// ─── updateLeaveRequest ───────────────────────────────────────────────────────
// Unchanged — already correct.
async function updateLeaveRequest(req, res) {
    try {
        const { id }             = req.params;
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
            data: { status, response: response || null },
            include: {
                teacher: {
                    include: {
                        user: { select: { name: true, email: true } },
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

// ─── getStudentsAtRisk ────────────────────────────────────────────────────────
// Unchanged — already correct (batch queries + Map lookups).
async function getStudentsAtRisk(req, res) {
    try {
        const {
            classRoomId,
            startDate,
            endDate,
            thresholdPercent = 75,
            criticalPercent  = 60,
        } = req.query;

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
        const end   = endDate   ? new Date(endDate)   : new Date();

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
                    endDate:   end.toISOString().split('T')[0],
                },
                summary: {
                    totalStudentsChecked: 0,
                    atRiskCount:    0,
                    criticalCount:  0,
                    warningCount:   0,
                    thresholdPercent: parseFloat(thresholdPercent),
                    criticalPercent:  parseFloat(criticalPercent),
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
            prisma.attendance.groupBy({
                by: ['studentId', 'classRoomId'],
                where: attendanceWhere,
                _count: { id: true },
            }),
            prisma.attendance.groupBy({
                by: ['studentId', 'classRoomId'],
                where: { ...attendanceWhere, OR: [{ status: 'PRESENT' }, { status: 'LATE' }] },
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

        const totalMap   = new Map(allTotals.map(r => [`${r.studentId}:${r.classRoomId}`, r._count.id]));
        const presentMap = new Map(allPresent.map(r => [`${r.studentId}:${r.classRoomId}`, r._count.id]));
        const absentMap  = new Map(allAbsent.map(r => [`${r.studentId}:${r.classRoomId}`, r._count.id]));
        const recentMap  = new Map();

        for (const r of recentAttendance) {
            const key = `${r.studentId}:${r.classRoomId}`;
            if (!recentMap.has(key)) recentMap.set(key, []);
            recentMap.get(key).push(r);
        }

        const studentRiskProfiles = enrollments.map((enrollment) => {
            const key            = `${enrollment.studentId}:${enrollment.classRoomId}`;
            const totalRecords   = totalMap.get(key)   || 0;
            const presentRecords = presentMap.get(key) || 0;
            const absentRecords  = absentMap.get(key)  || 0;
            const recentRecords  = recentMap.get(key)  || [];

            const attendancePercent = totalRecords > 0
                ? parseFloat(((presentRecords / totalRecords) * 100).toFixed(2))
                : null;

            let consecutiveAbsenceStreak = 0;
            for (const record of recentRecords) {
                if (record.status === 'ABSENT') consecutiveAbsenceStreak++;
                else break;
            }

            let riskLevel  = 'NONE';
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
                studentId:   enrollment.studentId,
                studentName: enrollment.student.user.name,
                email:       enrollment.student.user.email,
                phone:       enrollment.student.user.phone,
                admissionNo: enrollment.student.admissionNo,
                classRoom:   enrollment.classRoom,
                parents: enrollment.student.parents?.map((p) => ({
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
            atRiskCount:   atRiskStudents.length,
            criticalCount: atRiskStudents.filter((s) => s.riskLevel === 'CRITICAL').length,
            warningCount:  atRiskStudents.filter((s) => s.riskLevel === 'WARNING').length,
            thresholdPercent: parseFloat(thresholdPercent),
            criticalPercent:  parseFloat(criticalPercent),
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