// controllers/admin/statsController.js — System stats, attendance overview, trends
const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

// Helper function to safely parse dates
const parseDate = (dateStr, fallbackDate) => {
    if (!dateStr) return fallbackDate;
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? fallbackDate : parsed;
};

// Helper to format date to YYYY-MM-DD
const formatDate = (date) => date.toISOString().split('T')[0];

// Helper to calculate days between dates
const daysBetween = (start, end) => Math.ceil((end - start) / (1000 * 60 * 60 * 24));

// Helper to safely get nested values
const safeGet = (obj, path, defaultValue = 0) => {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
        if (result === undefined || result === null) return defaultValue;
        result = result[key];
    }
    return result !== undefined && result !== null ? result : defaultValue;
};

// Get system statistics (optimized with single aggregation)
async function getSystemStats(req, res) {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Run all queries in parallel with optimized aggregations
        const [
            totalUsers,
            roleCounts,
            totalClasses,
            totalSubjects,
            classTypes,
            attendanceByStatus,
            recentUsers
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.groupBy({
                by: ['role'],
                where: { status: 'ACTIVE' },
                _count: { id: true }
            }),
            prisma.classRoom.count(),
            prisma.subject.count(),
            prisma.classRoom.groupBy({
                by: ['type'],
                _count: { id: true }
            }),
            prisma.attendance.groupBy({
                by: ['status'],
                where: { date: { gte: sevenDaysAgo } },
                _count: { id: true }
            }),
            prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true, name: true, role: true, createdAt: true }
            })
        ]);

        // Calculate attendance rate efficiently
        let totalAttendance = 0, presentCount = 0;
        for (const row of attendanceByStatus) {
            totalAttendance += row._count.id;
            if (row.status === 'PRESENT' || row.status === 'LATE') {
                presentCount += row._count.id;
            }
        }
        const weeklyAttendanceRate = totalAttendance > 0 
            ? Math.round((presentCount / totalAttendance) * 100) 
            : 0;

        // Build role counts map for quick lookup
        const roleMap = Object.fromEntries(
            roleCounts.map(r => [r.role, r._count.id])
        );

        res.json({
            stats: {
                totalUsers,
                totalTeachers: roleMap.TEACHER || 0,
                totalStudents: roleMap.STUDENT || 0,
                totalParents: roleMap.PARENT || 0,
                totalClasses,
                totalSubjects,
                activeStudents: roleMap.STUDENT || 0,
                activeTeachers: roleMap.TEACHER || 0,
                classTypes: classTypes.reduce((acc, ct) => {
                    acc[ct.type] = ct._count.id;
                    return acc;
                }, {}),
                weeklyAttendanceRate,
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
        
        const start = parseDate(startDate, (() => {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return d;
        })());
        const end = parseDate(endDate, new Date());

        const dateWhere = { date: { gte: start, lte: end } };
        if (classRoomId) dateWhere.classRoomId = classRoomId;

        // Run summary queries in parallel
        const [statusCounts, enrolledStudents] = await Promise.all([
            prisma.attendance.groupBy({
                by: ['status'],
                where: dateWhere,
                _count: { id: true }
            }),
            prisma.enrollment.count({
                where: {
                    isCurrent: true,
                    ...(classRoomId && { classRoomId })
                }
            })
        ]);

        // Calculate summary stats
        const countMap = statusCounts.reduce((acc, sc) => {
            acc[sc.status] = sc._count.id;
            return acc;
        }, {});
        
        const totalRecords = Object.values(countMap).reduce((a, b) => a + b, 0);
        const presentCount = (countMap.PRESENT || 0) + (countMap.LATE || 0);
        const absentCount = countMap.ABSENT || 0;
        const lateCount = countMap.LATE || 0;
        const excusedCount = countMap.EXCUSED || 0;

        const daySpan = daysBetween(start, end);
        const totalPossible = enrolledStudents * daySpan;
        const overallAttendancePercentage = totalPossible > 0
            ? ((presentCount / totalPossible) * 100).toFixed(2)
            : 0;

        const statusDistribution = [
            { name: 'Present', value: presentCount, color: '#10B981' },
            { name: 'Absent', value: absentCount, color: '#EF4444' },
            { name: 'Late', value: lateCount, color: '#F59E0B' },
            { name: 'Excused', value: excusedCount, color: '#6B7280' }
        ].filter(item => item.value > 0);

        // Class-wise attendance (only when no class filter)
        let classWiseAttendance = [];
        if (!classRoomId) {
            const [allClasses, presentByClass, totalByClass, enrollmentByClass] = await Promise.all([
                prisma.classRoom.findMany({ select: { id: true, name: true, type: true } }),
                prisma.attendance.groupBy({
                    by: ['classRoomId'],
                    where: { ...dateWhere, OR: [{ status: 'PRESENT' }, { status: 'LATE' }] },
                    _count: { id: true }
                }),
                prisma.attendance.groupBy({
                    by: ['classRoomId'],
                    where: dateWhere,
                    _count: { id: true }
                }),
                prisma.enrollment.groupBy({
                    by: ['classRoomId'],
                    where: { isCurrent: true },
                    _count: { id: true }
                })
            ]);

            const presentMap = Object.fromEntries(presentByClass.map(r => [r.classRoomId, r._count.id]));
            const totalMap = Object.fromEntries(totalByClass.map(r => [r.classRoomId, r._count.id]));
            const enrollmentMap = Object.fromEntries(enrollmentByClass.map(r => [r.classRoomId, r._count.id]));

            classWiseAttendance = allClasses
                .filter(c => totalMap[c.id])
                .map(c => {
                    const presentInClass = presentMap[c.id] || 0;
                    const enrolled = enrollmentMap[c.id] || 0;
                    const classTotalPossible = enrolled * daySpan;
                    const percentage = classTotalPossible > 0
                        ? parseFloat(((presentInClass / classTotalPossible) * 100).toFixed(2))
                        : 0;

                    return {
                        classId: c.id,
                        className: c.name,
                        classType: c.type,
                        totalStudents: enrolled,
                        attendancePercentage: percentage,
                        presentCount: presentInClass,
                        totalRecords: totalMap[c.id] || 0
                    };
                })
                .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
                .slice(0, 10);
        }

        res.json({
            period: {
                startDate: formatDate(start),
                endDate: formatDate(end)
            },
            summary: {
                totalRecords,
                presentCount,
                absentCount,
                lateCount,
                excusedCount,
                enrolledStudents,
                overallAttendancePercentage: parseFloat(overallAttendancePercentage)
            },
            charts: { statusDistribution, classWiseAttendance }
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
        const numDays = parseInt(days);
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - numDays);

        const where = { date: { gte: startDate, lte: endDate } };
        if (classRoomId) where.classRoomId = classRoomId;

        // Run both queries in parallel
        const [dailyAttendance, dailyPresent] = await Promise.all([
            prisma.attendance.groupBy({
                by: ['date'],
                where,
                _count: { id: true }
            }),
            prisma.attendance.groupBy({
                by: ['date'],
                where: {
                    ...where,
                    OR: [{ status: 'PRESENT' }, { status: 'LATE' }]
                },
                _count: { id: true }
            })
        ]);

        // Create lookup maps for O(1) access
        const attendanceMap = new Map(dailyAttendance.map(d => 
            [formatDate(d.date), d._count.id]
        ));
        const presentMap = new Map(dailyPresent.map(d => 
            [formatDate(d.date), d._count.id]
        ));

        // Generate trends array efficiently
        const trends = [];
        for (let i = 0; i < numDays; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = formatDate(date);
            
            const total = attendanceMap.get(dateStr) || 0;
            const present = presentMap.get(dateStr) || 0;
            const percentage = total > 0 ? parseFloat(((present / total) * 100).toFixed(2)) : 0;
            
            trends.push({ date: dateStr, total, present, percentage });
        }

        res.json({
            period: {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                days: numDays
            },
            trends
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
        
        const start = parseDate(startDate, (() => {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return d;
        })());
        const end = parseDate(endDate, new Date());

        // Run all 4 queries in parallel for maximum efficiency
        const [classes, presentByClass, totalByClass, enrollmentByClass] = await Promise.all([
            prisma.classRoom.findMany({ select: { id: true, name: true, type: true } }),
            prisma.attendance.groupBy({
                by: ['classRoomId'],
                where: { date: { gte: start, lte: end }, OR: [{ status: 'PRESENT' }, { status: 'LATE' }] },
                _count: { id: true }
            }),
            prisma.attendance.groupBy({
                by: ['classRoomId'],
                where: { date: { gte: start, lte: end } },
                _count: { id: true }
            }),
            prisma.enrollment.groupBy({
                by: ['classRoomId'],
                where: { isCurrent: true },
                _count: { id: true }
            })
        ]);

        // Create lookup maps
        const presentMap = Object.fromEntries(presentByClass.map(r => [r.classRoomId, r._count.id]));
        const totalMap = Object.fromEntries(totalByClass.map(r => [r.classRoomId, r._count.id]));
        const enrollmentMap = Object.fromEntries(enrollmentByClass.map(r => [r.classRoomId, r._count.id]));
        const daySpan = daysBetween(start, end);

        // Build comparison array
        const classComparison = classes.map(c => {
            const presentCount = presentMap[c.id] || 0;
            const enrolled = enrollmentMap[c.id] || 0;
            const totalPossible = enrolled * daySpan;
            const percentage = totalPossible > 0
                ? parseFloat(((presentCount / totalPossible) * 100).toFixed(2))
                : 0;

            return {
                classId: c.id,
                className: c.name,
                classType: c.type,
                totalStudents: enrolled,
                attendancePercentage: percentage,
                presentCount,
                totalRecords: totalMap[c.id] || 0
            };
        });

        classComparison.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

        res.json({
            period: {
                startDate: formatDate(start),
                endDate: formatDate(end)
            },
            classes: classComparison
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
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = status ? { status } : {};

        const [leaveRequests, total] = await Promise.all([
            prisma.leaveRequest.findMany({
                where,
                skip,
                take,
                include: {
                    teacher: {
                        include: {
                            user: { select: { name: true, email: true, phone: true } }
                        }
                    },
                    appliedToAdmin: { select: { name: true, email: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.leaveRequest.count({ where })
        ]);

        res.json({
            leaveRequests,
            pagination: {
                page: parseInt(page),
                limit: take,
                total,
                pages: Math.ceil(total / take)
            }
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
            data: { status, response: response || null },
            include: {
                teacher: {
                    include: { user: { select: { name: true, email: true } } }
                }
            }
        });

        logger.info({ requestId: id, status }, 'Leave request updated');
        res.json({
            message: `Leave request ${status.toLowerCase()} successfully`,
            leaveRequest: updatedLeaveRequest
        });
    } catch (error) {
        logger.error({ err: error }, 'Update leave request error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Get students at risk
async function getStudentsAtRisk(req, res) {
    try {
        const {
            classRoomId,
            startDate,
            endDate,
            thresholdPercent = 75,
            criticalPercent = 60
        } = req.query;

        const start = parseDate(startDate, new Date(Date.now() - 30 * 86400000));
        const end = parseDate(endDate, new Date());
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

        const threshold = parseFloat(thresholdPercent);
        const critical = parseFloat(criticalPercent);

        // Get all active enrollments with student details
        const enrollments = await prisma.enrollment.findMany({
            where: {
                isCurrent: true,
                ...(classRoomId && { classRoomId })
            },
            include: {
                student: {
                    include: {
                        user: { select: { id: true, name: true, email: true, phone: true } },
                        parents: {
                            include: {
                                user: { select: { name: true, email: true, phone: true } }
                            }
                        }
                    }
                },
                classRoom: { select: { id: true, name: true, type: true } }
            }
        });

        if (!enrollments.length) {
            return res.json({
                period: { startDate: formatDate(start), endDate: formatDate(end) },
                summary: {
                    totalStudentsChecked: 0,
                    atRiskCount: 0,
                    criticalCount: 0,
                    warningCount: 0,
                    thresholdPercent: threshold,
                    criticalPercent: critical
                },
                atRiskStudents: []
            });
        }

        const studentIds = [...new Set(enrollments.map(e => e.studentId))];
        const classIds = [...new Set(enrollments.map(e => e.classRoomId))];

        // Run both attendance queries in parallel
        const [periodCounts, recentRecords] = await Promise.all([
            prisma.attendance.groupBy({
                by: ['studentId', 'classRoomId', 'status'],
                where: {
                    studentId: { in: studentIds },
                    classRoomId: { in: classIds },
                    date: { gte: start, lte: end }
                },
                _count: { id: true }
            }),
            prisma.attendance.findMany({
                where: {
                    studentId: { in: studentIds },
                    classRoomId: { in: classIds },
                    date: { gte: sevenDaysAgo }
                },
                orderBy: { date: 'desc' },
                select: { studentId: true, classRoomId: true, status: true, date: true }
            })
        ]);

        // Build lookup maps
        const periodMap = new Map();
        for (const row of periodCounts) {
            const key = `${row.studentId}:${row.classRoomId}`;
            if (!periodMap.has(key)) periodMap.set(key, {});
            periodMap.get(key)[row.status] = row._count.id;
        }

        const recentMap = new Map();
        for (const row of recentRecords) {
            const key = `${row.studentId}:${row.classRoomId}`;
            if (!recentMap.has(key)) recentMap.set(key, []);
            recentMap.get(key).push(row);
        }

        // Process risk profiles
        const studentRiskProfiles = enrollments.map(enrollment => {
            const key = `${enrollment.studentId}:${enrollment.classRoomId}`;
            const counts = periodMap.get(key) || {};
            
            const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
            const presentRecords = (counts.PRESENT || 0) + (counts.LATE || 0);
            const attendancePercent = totalRecords > 0
                ? parseFloat(((presentRecords / totalRecords) * 100).toFixed(2))
                : null;

            // Calculate consecutive absences
            const recent = recentMap.get(key) || [];
            let consecutiveAbsenceStreak = 0;
            for (const record of recent) {
                if (record.status === 'ABSENT') consecutiveAbsenceStreak++;
                else break;
            }

            // Determine risk level
            let riskLevel = 'NONE';
            const riskReasons = [];

            if (attendancePercent !== null) {
                if (attendancePercent < critical) {
                    riskLevel = 'CRITICAL';
                    riskReasons.push(`Attendance at ${attendancePercent}% — below critical threshold of ${critical}%`);
                } else if (attendancePercent < threshold) {
                    riskLevel = 'WARNING';
                    riskReasons.push(`Attendance at ${attendancePercent}% — below required ${threshold}%`);
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
                parents: enrollment.student.parents?.map(p => ({
                    name: p.user.name,
                    email: p.user.email,
                    phone: p.user.phone
                })),
                attendance: {
                    totalRecords,
                    presentRecords,
                    absentRecords: counts.ABSENT || 0,
                    attendancePercent,
                    consecutiveAbsenceStreak
                },
                riskLevel,
                riskReasons
            };
        });

        // Filter and sort
        const riskOrder = { CRITICAL: 0, WARNING: 1, NONE: 2 };
        const atRiskStudents = studentRiskProfiles
            .filter(s => s.riskLevel !== 'NONE')
            .sort((a, b) => {
                if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
                    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
                }
                return (a.attendance.attendancePercent ?? 100) - (b.attendance.attendancePercent ?? 100);
            });

        res.json({
            period: { startDate: formatDate(start), endDate: formatDate(end) },
            summary: {
                totalStudentsChecked: studentRiskProfiles.length,
                atRiskCount: atRiskStudents.length,
                criticalCount: atRiskStudents.filter(s => s.riskLevel === 'CRITICAL').length,
                warningCount: atRiskStudents.filter(s => s.riskLevel === 'WARNING').length,
                thresholdPercent: threshold,
                criticalPercent: critical
            },
            atRiskStudents
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
    getStudentsAtRisk
};