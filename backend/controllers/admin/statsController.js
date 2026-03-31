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

// Get attendance overview
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

        // Use groupBy instead of loading all records into memory
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

        // Class-wise attendance (only if no specific class filter)
        let classWiseAttendance = [];
        if (!classRoomId) {
            const classAttendance = await prisma.attendance.groupBy({
                by: ['classRoomId'],
                where: { date: { gte: start, lte: end } },
                _count: { id: true },
            });

            classWiseAttendance = await Promise.all(
                classAttendance.map(async (classAtt) => {
                    const [classRoom, presentInClass, classEnrollment] = await Promise.all([
                        prisma.classRoom.findUnique({
                            where: { id: classAtt.classRoomId },
                            select: { id: true, name: true, type: true },
                        }),
                        prisma.attendance.count({
                            where: {
                                classRoomId: classAtt.classRoomId,
                                date: { gte: start, lte: end },
                                OR: [{ status: 'PRESENT' }, { status: 'LATE' }],
                            },
                        }),
                        prisma.enrollment.count({
                            where: { classRoomId: classAtt.classRoomId, isCurrent: true },
                        }),
                    ]);

                    const classTotalPossible = classEnrollment * Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                    const percentage = classTotalPossible > 0 ? (presentInClass / classTotalPossible * 100).toFixed(2) : 0;

                    return {
                        classId: classRoom?.id,
                        className: classRoom?.name,
                        classType: classRoom?.type,
                        totalStudents: classEnrollment,
                        attendancePercentage: parseFloat(percentage),
                        presentCount: presentInClass,
                        totalRecords: classAtt._count.id,
                    };
                })
            );

            classWiseAttendance.sort((a, b) => b.attendancePercentage - a.attendancePercentage);
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

// Get class attendance comparison
async function getClassAttendanceComparison(req, res) {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : new Date();
        start.setDate(start.getDate() - 30);
        const end = endDate ? new Date(endDate) : new Date();

        const classes = await prisma.classRoom.findMany({
            include: {
                _count: {
                    select: {
                        enrollments: { where: { isCurrent: true } },
                    },
                },
            },
        });

        const classComparison = await Promise.all(
            classes.map(async (classRoom) => {
                const [presentCount, totalRecords] = await Promise.all([
                    prisma.attendance.count({
                        where: {
                            classRoomId: classRoom.id,
                            date: { gte: start, lte: end },
                            OR: [{ status: 'PRESENT' }, { status: 'LATE' }],
                        },
                    }),
                    prisma.attendance.count({
                        where: {
                            classRoomId: classRoom.id,
                            date: { gte: start, lte: end },
                        },
                    }),
                ]);

                const totalPossible = classRoom._count.enrollments * Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                const percentage = totalPossible > 0 ? (presentCount / totalPossible * 100).toFixed(2) : 0;

                return {
                    classId: classRoom.id,
                    className: classRoom.name,
                    classType: classRoom.type,
                    totalStudents: classRoom._count.enrollments,
                    attendancePercentage: parseFloat(percentage),
                    presentCount,
                    totalRecords,
                };
            })
        );

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
async function getStudentsAtRisk(req, res) {
  try {
    const {
      classRoomId,
      startDate,
      endDate,
      thresholdPercent = 75,  // Industry standard minimum attendance
      criticalPercent = 60,   // Critical alert level
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

    // 2. For each enrolled student, calculate attendance in period
    const studentRiskProfiles = await Promise.all(
      enrollments.map(async (enrollment) => {
        const [totalRecords, presentRecords, absentRecords, consecutiveAbsences] =
          await Promise.all([
            prisma.attendance.count({
              where: {
                studentId: enrollment.studentId,
                classRoomId: enrollment.classRoomId,
                date: { gte: start, lte: end },
              },
            }),
            prisma.attendance.count({
              where: {
                studentId: enrollment.studentId,
                classRoomId: enrollment.classRoomId,
                date: { gte: start, lte: end },
                OR: [{ status: 'PRESENT' }, { status: 'LATE' }],
              },
            }),
            prisma.attendance.count({
              where: {
                studentId: enrollment.studentId,
                classRoomId: enrollment.classRoomId,
                date: { gte: start, lte: end },
                status: 'ABSENT',
              },
            }),
            // Get last 7 days to detect consecutive absences
            prisma.attendance.findMany({
              where: {
                studentId: enrollment.studentId,
                classRoomId: enrollment.classRoomId,
                date: { gte: new Date(Date.now() - 7 * 86400000) },
              },
              orderBy: { date: 'desc' },
              select: { status: true, date: true },
            }),
          ]);

        const attendancePercent =
          totalRecords > 0
            ? parseFloat(((presentRecords / totalRecords) * 100).toFixed(2))
            : null; // null = no data, different from 0%

        // Count current consecutive absences streak
        let consecutiveAbsenceStreak = 0;
        for (const record of consecutiveAbsences) {
          if (record.status === 'ABSENT') {
            consecutiveAbsenceStreak++;
          } else {
            break; // streak broken
          }
        }

        // 3. Determine risk level
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
          riskLevel,       // 'NONE' | 'WARNING' | 'CRITICAL'
          riskReasons,
        };
      })
    );

    // 4. Filter to only at-risk students and sort by severity
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

    // 5. Build summary metrics for dashboard cards
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
    getStudentsAtRisk
};
