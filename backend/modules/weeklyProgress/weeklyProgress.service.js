const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

class WeeklyProgressService {

    // ────────────────────────────────────────────────
    // Generate weekly report from DailyActivity data
    // ────────────────────────────────────────────────
    async generateWeeklyReport(studentId, weekNumber, year, teacherId) {
        // Compute week boundaries
        const { startDate, endDate } = this._getWeekBoundaries(weekNumber, year);

        // Check if already exists
        const existing = await prisma.weeklyProgress.findUnique({
            where: {
                studentId_weekNumber_year: { studentId, weekNumber, year },
            },
        });
        if (existing) {
            return existing; // Already generated
        }

        // Get student enrollment for classroom
        const enrollment = await prisma.enrollment.findFirst({
            where: { studentId, isCurrent: true },
            select: { classRoomId: true },
        });
        if (!enrollment) {
            throw new Error('Student has no active enrollment');
        }

        // Fetch all daily activities for this student in the week
        const activities = await prisma.dailyActivity.findMany({
            where: {
                studentId,
                date: { gte: startDate, lte: endDate },
            },
            orderBy: { date: 'asc' },
        });

        // ─── Attendance Aggregation ───
        const attendanceCounts = {
            PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0,
        };
        let totalHours = 0;
        let punctualCount = 0;
        let uniformCount = 0;

        activities.forEach((a) => {
            attendanceCounts[a.attendanceStatus] = (attendanceCounts[a.attendanceStatus] || 0) + 1;
            totalHours += a.totalHoursSpent || 0;
            if (a.punctuality) punctualCount++;
            if (a.uniformCompliance) uniformCount++;
        });

        const totalWorkingDays = activities.length;
        const attendancePercentage = totalWorkingDays > 0
            ? ((attendanceCounts.PRESENT + attendanceCounts.LATE) / totalWorkingDays) * 100
            : 0;
        const punctualityPercentage = totalWorkingDays > 0
            ? (punctualCount / totalWorkingDays) * 100
            : 0;

        // ─── Subject-Wise Progress ───
        const subjectMap = {};
        activities.forEach((a) => {
            if (!Array.isArray(a.subjectsStudied)) return;
            a.subjectsStudied.forEach((s) => {
                const key = s.subjectId || 'unknown';
                if (!subjectMap[key]) {
                    subjectMap[key] = {
                        subjectId: s.subjectId,
                        name: s.subjectName || key,
                        topicsCompleted: 0,
                        understandingLevels: [],
                        assessments: [],
                    };
                }
                subjectMap[key].topicsCompleted += (s.topicsCovered?.length || 0);
                if (s.understandingLevel) {
                    subjectMap[key].understandingLevels.push(s.understandingLevel);
                }
            });
        });

        // Assessment aggregation
        activities.forEach((a) => {
            if (!Array.isArray(a.assessmentsTaken)) return;
            a.assessmentsTaken.forEach((assess) => {
                const key = assess.subjectId || 'unknown';
                if (!subjectMap[key]) {
                    subjectMap[key] = {
                        subjectId: assess.subjectId,
                        name: key,
                        topicsCompleted: 0,
                        understandingLevels: [],
                        assessments: [],
                    };
                }
                subjectMap[key].assessments.push({
                    type: assess.type,
                    score: assess.marksObtained,
                    outOf: assess.totalMarks,
                });
            });
        });

        const subjectWiseProgress = Object.values(subjectMap).map((s) => ({
            subjectId: s.subjectId,
            name: s.name,
            topicsCompleted: s.topicsCompleted,
            avgUnderstanding: s.understandingLevels.length > 0
                ? +(s.understandingLevels.reduce((a, b) => a + b, 0) / s.understandingLevels.length).toFixed(1)
                : 0,
            assessments: s.assessments,
            trend: 'STABLE', // Will be computed when historical data exists
        }));

        // ─── Homework Aggregation ───
        let hwAssigned = 0, hwCompleted = 0, hwQualitySum = 0, hwQualityCount = 0;
        activities.forEach((a) => {
            if (Array.isArray(a.homeworkAssigned)) hwAssigned += a.homeworkAssigned.length;
            if (Array.isArray(a.homeworkCompleted)) {
                a.homeworkCompleted.forEach((hw) => {
                    if (hw.completionStatus === 'COMPLETE') hwCompleted++;
                    if (hw.quality) { hwQualitySum += hw.quality; hwQualityCount++; }
                });
            }
        });

        // ─── Classwork Aggregation ───
        let cwTotal = 0, cwComplete = 0, cwQualitySum = 0, cwQualityCount = 0;
        activities.forEach((a) => {
            if (!Array.isArray(a.classworkCompleted)) return;
            a.classworkCompleted.forEach((cw) => {
                cwTotal++;
                if (cw.completionStatus === 'COMPLETE') cwComplete++;
                if (cw.quality) { cwQualitySum += cw.quality; cwQualityCount++; }
            });
        });

        // ─── Assessment Summary ───
        let totalAssessments = 0;
        let totalScore = 0, totalOutOf = 0;
        const assessmentBySubject = {};
        activities.forEach((a) => {
            if (!Array.isArray(a.assessmentsTaken)) return;
            a.assessmentsTaken.forEach((assess) => {
                totalAssessments++;
                totalScore += assess.marksObtained || 0;
                totalOutOf += assess.totalMarks || 0;
                const key = assess.subjectId || 'unknown';
                if (!assessmentBySubject[key]) {
                    assessmentBySubject[key] = { subjectId: key, count: 0, totalScore: 0, totalOutOf: 0 };
                }
                assessmentBySubject[key].count++;
                assessmentBySubject[key].totalScore += assess.marksObtained || 0;
                assessmentBySubject[key].totalOutOf += assess.totalMarks || 0;
            });
        });
        const assessmentResults = Object.values(assessmentBySubject).map((a) => ({
            subjectId: a.subjectId,
            count: a.count,
            avgScore: +(a.totalScore / Math.max(a.count, 1)).toFixed(1),
            avgPercentage: a.totalOutOf > 0 ? +((a.totalScore / a.totalOutOf) * 100).toFixed(1) : 0,
        }));

        // ─── Behavioral Averages ───
        const avg = (field) => {
            const vals = activities.map((a) => a[field]).filter((v) => v != null);
            return vals.length > 0 ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0;
        };

        // ─── Skills Averages ───
        const skillAvg = (skillKey) => {
            const vals = activities
                .filter((a) => a.skillsSnapshot && a.skillsSnapshot[skillKey] != null)
                .map((a) => a.skillsSnapshot[skillKey]);
            return vals.length > 0 ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0;
        };

        // ─── Strength/Weak Subjects ───
        const strengthSubjects = subjectWiseProgress
            .filter((s) => s.avgUnderstanding >= 4)
            .map((s) => s.name);
        const weakSubjects = subjectWiseProgress
            .filter((s) => s.avgUnderstanding > 0 && s.avgUnderstanding <= 2)
            .map((s) => s.name);

        // ─── Create Weekly Record ───
        const report = await prisma.weeklyProgress.create({
            data: {
                studentId,
                teacherId: teacherId || null,
                classRoomId: enrollment.classRoomId,
                weekNumber,
                year,
                startDate,
                endDate,
                // Attendance
                totalDaysPresent: attendanceCounts.PRESENT,
                totalDaysAbsent: attendanceCounts.ABSENT,
                totalDaysLate: attendanceCounts.LATE,
                totalDaysExcused: attendanceCounts.EXCUSED,
                totalWorkingDays,
                attendancePercentage: +attendancePercentage.toFixed(1),
                punctualityPercentage: +punctualityPercentage.toFixed(1),
                // Subject progress
                subjectWiseProgress,
                // Homework
                homeworkAssignedCount: hwAssigned,
                homeworkCompletedCount: hwCompleted,
                homeworkCompletionRate: hwAssigned > 0 ? +((hwCompleted / hwAssigned) * 100).toFixed(1) : 0,
                averageHomeworkQuality: hwQualityCount > 0 ? +(hwQualitySum / hwQualityCount).toFixed(1) : 0,
                // Classwork
                classworkCompletionRate: cwTotal > 0 ? +((cwComplete / cwTotal) * 100).toFixed(1) : 0,
                averageClassworkQuality: cwQualityCount > 0 ? +(cwQualitySum / cwQualityCount).toFixed(1) : 0,
                // Assessments
                totalAssessments,
                assessmentResults,
                overallAverageScore: totalOutOf > 0 ? +((totalScore / totalOutOf) * 100).toFixed(1) : 0,
                // Behavioral
                averageBehaviorScore: avg('behaviorRating'),
                averageParticipationScore: avg('participationLevel'),
                averageDisciplineScore: avg('disciplineScore'),
                uniformComplianceRate: totalWorkingDays > 0 ? +((uniformCount / totalWorkingDays) * 100).toFixed(1) : 0,
                // Skills
                averageReadingSkill: skillAvg('reading'),
                averageWritingSkill: skillAvg('writing'),
                averageListeningSkill: skillAvg('listening'),
                averageSpeakingSkill: skillAvg('speaking'),
                averageCriticalThinking: skillAvg('criticalThinking'),
                // Highlights
                strengthSubjects,
                weakSubjects,
                followUpRequired: weakSubjects.length > 0 || attendancePercentage < 70,
            },
        });

        logger.info({ studentId, weekNumber, year }, 'Weekly progress report generated');
        return report;
    }

    // ────────────────────────────────────────────────
    // Get weekly reports for a student
    // ────────────────────────────────────────────────
    async getByStudent(studentId, { page = 1, limit = 10, year } = {}) {
        const where = { studentId };
        if (year) where.year = parseInt(year);

        const [reports, total] = await Promise.all([
            prisma.weeklyProgress.findMany({
                where,
                orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
                skip: (page - 1) * limit,
                take: parseInt(limit),
            }),
            prisma.weeklyProgress.count({ where }),
        ]);

        return {
            reports,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    // ────────────────────────────────────────────────
    // Get weekly reports for a class
    // ────────────────────────────────────────────────
    async getByClass(classRoomId, weekNumber, year) {
        const reports = await prisma.weeklyProgress.findMany({
            where: {
                classRoomId,
                weekNumber: parseInt(weekNumber),
                year: parseInt(year),
            },
            include: {
                student: {
                    include: {
                        user: { select: { name: true, profileImage: true } },
                    },
                },
            },
            orderBy: { attendancePercentage: 'desc' },
        });
        return reports;
    }

    // ────────────────────────────────────────────────
    // Update teacher comments on a weekly report
    // ────────────────────────────────────────────────
    async updateComments(id, { teacherComments, weeklyHighlights, areasOfImprovement, actionItems, followUpRequired }) {
        const data = {};
        if (teacherComments !== undefined) data.teacherComments = teacherComments;
        if (weeklyHighlights !== undefined) data.weeklyHighlights = weeklyHighlights;
        if (areasOfImprovement !== undefined) data.areasOfImprovement = areasOfImprovement;
        if (actionItems !== undefined) data.actionItems = actionItems;
        if (followUpRequired !== undefined) data.followUpRequired = followUpRequired;

        return prisma.weeklyProgress.update({ where: { id }, data });
    }

    // ────────────────────────────────────────────────
    // Get at-risk students for a week
    // ────────────────────────────────────────────────
    async getAtRiskStudents({ classRoomId, weekNumber, year, page = 1, limit = 20 } = {}) {
        const where = {
            OR: [
                { attendancePercentage: { lt: 70 } },
                { homeworkCompletionRate: { lt: 50 } },
                { averageBehaviorScore: { lt: 2.5 } },
                { followUpRequired: true },
            ],
        };
        if (classRoomId) where.classRoomId = classRoomId;
        if (weekNumber) where.weekNumber = parseInt(weekNumber);
        if (year) where.year = parseInt(year);

        const [students, total] = await Promise.all([
            prisma.weeklyProgress.findMany({
                where,
                include: {
                    student: {
                        include: {
                            user: { select: { name: true, profileImage: true } },
                        },
                    },
                },
                orderBy: { attendancePercentage: 'asc' },
                skip: (page - 1) * limit,
                take: parseInt(limit),
            }),
            prisma.weeklyProgress.count({ where }),
        ]);

        return {
            students,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    // ────────────────────────────────────────────────
    // Bulk generate reports for entire class
    // ────────────────────────────────────────────────
    async bulkGenerate(classRoomId, weekNumber, year, teacherId) {
        const enrollments = await prisma.enrollment.findMany({
            where: { classRoomId, isCurrent: true },
            select: { studentId: true },
        });

        const results = [];
        for (const enrollment of enrollments) {
            try {
                const report = await this.generateWeeklyReport(
                    enrollment.studentId,
                    weekNumber,
                    year,
                    teacherId
                );
                results.push({ studentId: enrollment.studentId, success: true, report });
            } catch (error) {
                results.push({ studentId: enrollment.studentId, success: false, error: error.message });
            }
        }

        logger.info({ classRoomId, weekNumber, year, count: results.length }, 'Bulk weekly reports generated');
        return results;
    }

    // ────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────
    _getWeekBoundaries(weekNumber, year) {
        // ISO week: Week 1 contains Jan 4
        const jan4 = new Date(year, 0, 4);
        const dayOfWeek = jan4.getDay() || 7; // Mon=1 ... Sun=7
        const firstMonday = new Date(jan4);
        firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

        const startDate = new Date(firstMonday);
        startDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        return { startDate, endDate };
    }
}

module.exports = new WeeklyProgressService();
