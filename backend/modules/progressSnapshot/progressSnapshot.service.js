const prisma = require('../../db/prismaClient');
const logger = require('../../utils/logger');

class ProgressSnapshotService {

    // ────────────────────────────────────────────────
    // Get or create snapshot for a student
    // ────────────────────────────────────────────────
    async getSnapshot(studentId) {
        let snapshot = await prisma.studentProgressSnapshot.findUnique({
            where: { studentId },
        });

        if (!snapshot) {
            snapshot = await this.recalculate(studentId);
        }

        return snapshot;
    }

    // ────────────────────────────────────────────────
    // Full recalculation from DailyActivity data
    // ────────────────────────────────────────────────
    async recalculate(studentId) {
        // Get all activities for the student
        const activities = await prisma.dailyActivity.findMany({
            where: { studentId },
            orderBy: { date: 'desc' },
        });

        if (activities.length === 0) {
            return this._upsertSnapshot(studentId, {
                lastActivityDate: null,
                riskLevel: 'LOW',
                needsAttention: false,
                lastCalculatedAt: new Date(),
            });
        }

        const lastActivity = activities[0];

        // ─── Attendance Metrics ───
        const totalPresent = activities.filter((a) => a.attendanceStatus === 'PRESENT' || a.attendanceStatus === 'LATE').length;
        const totalAbsent = activities.filter((a) => a.attendanceStatus === 'ABSENT').length;
        const totalHours = activities.reduce((sum, a) => sum + (a.totalHoursSpent || 0), 0);
        const attendanceRate = activities.length > 0 ? +((totalPresent / activities.length) * 100).toFixed(1) : 0;

        // ─── Streaks ───
        const streaks = this._calculateStreaks(activities);

        // ─── Homework Metrics ───
        let hwTotal = 0, hwComplete = 0, hwQualitySum = 0, hwQualityCount = 0;
        let pendingHw = 0, overdueHw = 0;
        const now = new Date();

        activities.forEach((a) => {
            if (Array.isArray(a.homeworkAssigned)) {
                hwTotal += a.homeworkAssigned.length;
                a.homeworkAssigned.forEach((hw) => {
                    if (hw.dueDate && new Date(hw.dueDate) > now) pendingHw++;
                    if (hw.dueDate && new Date(hw.dueDate) < now) overdueHw++;
                });
            }
            if (Array.isArray(a.homeworkCompleted)) {
                a.homeworkCompleted.forEach((hw) => {
                    if (hw.completionStatus === 'COMPLETE') hwComplete++;
                    if (hw.quality) { hwQualitySum += hw.quality; hwQualityCount++; }
                });
            }
        });

        // ─── Behavioral Profile ───
        const behaviorAvg = this._avg(activities, 'behaviorRating');
        const participationAvg = this._avg(activities, 'participationLevel');
        const disciplineAvg = this._avg(activities, 'disciplineScore');
        const punctualCount = activities.filter((a) => a.punctuality).length;
        const punctualityRate = activities.length > 0 ? +((punctualCount / activities.length) * 100).toFixed(1) : 0;

        // ─── Skills Assessment ───
        const skillAvg = (key) => {
            const vals = activities
                .filter((a) => a.skillsSnapshot && a.skillsSnapshot[key] != null)
                .map((a) => a.skillsSnapshot[key]);
            return vals.length > 0 ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0;
        };

        // ─── Subject Performance ───
        const subjectPerformance = this._calculateSubjectPerformance(activities);

        const strongestSubjects = subjectPerformance
            .filter((s) => s.percentage >= 80)
            .map((s) => s.name);
        const weakestSubjects = subjectPerformance
            .filter((s) => s.percentage > 0 && s.percentage < 50)
            .map((s) => s.name);

        // ─── Risk Level ───
        const hwCompletionRate = hwTotal > 0 ? +((hwComplete / hwTotal) * 100).toFixed(1) : 100;
        const { riskLevel, needsAttention, attentionReasons } = this._calculateRiskLevel({
            attendanceRate,
            hwCompletionRate,
            behaviorAvg,
            weakestSubjects,
        });

        // ─── Upsert Snapshot ───
        const snapshot = await this._upsertSnapshot(studentId, {
            lastActivityDate: lastActivity.date,
            // Streaks
            currentAttendanceStreak: streaks.currentAttendance,
            longestAttendanceStreak: streaks.longestAttendance,
            currentHomeworkStreak: streaks.currentHomework,
            // Overall
            totalDaysAttended: totalPresent,
            totalDaysAbsent: totalAbsent,
            totalHoursStudied: +totalHours.toFixed(1),
            overallAttendanceRate: attendanceRate,
            // Subject
            subjectWisePerformance: subjectPerformance,
            strongestSubjects,
            weakestSubjects,
            improvingSubjects: [],
            decliningSubjects: [],
            // Homework
            overallHomeworkCompletionRate: hwCompletionRate,
            averageHomeworkQuality: hwQualityCount > 0 ? +(hwQualitySum / hwQualityCount).toFixed(1) : 0,
            pendingHomeworkCount: pendingHw,
            overdueHomeworkCount: overdueHw,
            // Behavioral
            averageBehaviorRating: behaviorAvg,
            averageParticipation: participationAvg,
            averageDiscipline: disciplineAvg,
            punctualityRate,
            // Skills
            currentReadingLevel: skillAvg('reading'),
            currentWritingLevel: skillAvg('writing'),
            currentListeningLevel: skillAvg('listening'),
            currentSpeakingLevel: skillAvg('speaking'),
            currentCriticalThinking: skillAvg('criticalThinking'),
            // Alerts
            needsAttention,
            attentionReasons,
            flaggedSubjects: weakestSubjects,
            riskLevel,
            interventionRequired: riskLevel === 'CRITICAL',
            // Cache
            lastCalculatedAt: new Date(),
        });

        logger.info({ studentId, riskLevel }, 'Student progress snapshot recalculated');
        return snapshot;
    }

    // ────────────────────────────────────────────────
    // Bulk recalculate for a class
    // ────────────────────────────────────────────────
    async bulkRecalculate(classRoomId) {
        const enrollments = await prisma.enrollment.findMany({
            where: { classRoomId, isCurrent: true },
            select: { studentId: true },
        });

        const results = [];
        for (const e of enrollments) {
            try {
                const snap = await this.recalculate(e.studentId);
                results.push({ studentId: e.studentId, success: true, riskLevel: snap.riskLevel });
            } catch (error) {
                results.push({ studentId: e.studentId, success: false, error: error.message });
            }
        }

        return results;
    }

    // ────────────────────────────────────────────────
    // Get at-risk students
    // ────────────────────────────────────────────────
    async getAtRiskStudents({ riskLevel, page = 1, limit = 20 } = {}) {
        const where = { needsAttention: true };
        if (riskLevel) where.riskLevel = riskLevel;

        const [students, total] = await Promise.all([
            prisma.studentProgressSnapshot.findMany({
                where,
                include: {
                    student: {
                        include: {
                            user: { select: { name: true, profileImage: true } },
                            enrollments: {
                                where: { isCurrent: true },
                                include: { classRoom: { select: { name: true } } },
                                take: 1,
                            },
                        },
                    },
                },
                orderBy: [
                    { riskLevel: 'desc' },
                    { overallAttendanceRate: 'asc' },
                ],
                skip: (page - 1) * limit,
                take: parseInt(limit),
            }),
            prisma.studentProgressSnapshot.count({ where }),
        ]);

        return {
            students,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        };
    }

    // ────────────────────────────────────────────────
    // Private helpers
    // ────────────────────────────────────────────────

    async _upsertSnapshot(studentId, data) {
        return prisma.studentProgressSnapshot.upsert({
            where: { studentId },
            create: { studentId, ...data },
            update: data,
        });
    }

    _avg(activities, field) {
        const vals = activities.map((a) => a[field]).filter((v) => v != null);
        return vals.length > 0 ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0;
    }

    _calculateStreaks(activities) {
        // Sort by date ascending
        const sorted = [...activities].sort((a, b) => new Date(a.date) - new Date(b.date));

        let currentAttendance = 0, longestAttendance = 0, streak = 0;
        let currentHomework = 0, hwStreak = 0;

        sorted.forEach((a) => {
            // Attendance streak
            if (a.attendanceStatus === 'PRESENT' || a.attendanceStatus === 'LATE') {
                streak++;
                if (streak > longestAttendance) longestAttendance = streak;
            } else {
                streak = 0;
            }

            // Homework streak
            if (Array.isArray(a.homeworkCompleted) && a.homeworkCompleted.length > 0) {
                const allDone = a.homeworkCompleted.every((hw) => hw.completionStatus === 'COMPLETE');
                if (allDone) {
                    hwStreak++;
                } else {
                    hwStreak = 0;
                }
            }
        });

        currentAttendance = streak;
        currentHomework = hwStreak;

        return { currentAttendance, longestAttendance, currentHomework };
    }

    _calculateSubjectPerformance(activities) {
        const subjectMap = {};

        activities.forEach((a) => {
            // Subjects studied
            if (Array.isArray(a.subjectsStudied)) {
                a.subjectsStudied.forEach((s) => {
                    const key = s.subjectId || 'unknown';
                    if (!subjectMap[key]) {
                        subjectMap[key] = { subjectId: s.subjectId, name: s.subjectName || key, scores: [], understandings: [] };
                    }
                    if (s.understandingLevel) subjectMap[key].understandings.push(s.understandingLevel);
                });
            }

            // Assessments
            if (Array.isArray(a.assessmentsTaken)) {
                a.assessmentsTaken.forEach((assess) => {
                    const key = assess.subjectId || 'unknown';
                    if (!subjectMap[key]) {
                        subjectMap[key] = { subjectId: assess.subjectId, name: key, scores: [], understandings: [] };
                    }
                    if (assess.totalMarks > 0) {
                        subjectMap[key].scores.push((assess.marksObtained / assess.totalMarks) * 100);
                    }
                });
            }
        });

        return Object.values(subjectMap).map((s) => {
            const allScores = [...s.scores, ...s.understandings.map((u) => u * 20)]; // Convert 1-5 to 0-100
            const percentage = allScores.length > 0 ? +(allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : 0;
            return {
                subjectId: s.subjectId,
                name: s.name,
                percentage,
                trend: 'STABLE',
            };
        });
    }

    _calculateRiskLevel({ attendanceRate, hwCompletionRate, behaviorAvg, weakestSubjects }) {
        const reasons = [];
        let score = 0;

        if (attendanceRate < 60) { score += 3; reasons.push('Attendance below 60%'); }
        else if (attendanceRate < 75) { score += 2; reasons.push('Attendance below 75%'); }
        else if (attendanceRate < 85) { score += 1; reasons.push('Attendance below 85%'); }

        if (hwCompletionRate < 40) { score += 3; reasons.push('Homework completion below 40%'); }
        else if (hwCompletionRate < 60) { score += 2; reasons.push('Homework completion below 60%'); }
        else if (hwCompletionRate < 75) { score += 1; reasons.push('Homework completion below 75%'); }

        if (behaviorAvg > 0 && behaviorAvg < 2) { score += 2; reasons.push('Poor behavior rating'); }
        else if (behaviorAvg >= 2 && behaviorAvg < 3) { score += 1; reasons.push('Below average behavior'); }

        if (weakestSubjects.length >= 3) { score += 2; reasons.push(`${weakestSubjects.length} weak subjects`); }
        else if (weakestSubjects.length >= 1) { score += 1; reasons.push(`${weakestSubjects.length} weak subject(s)`); }

        let riskLevel = 'LOW';
        if (score >= 7) riskLevel = 'CRITICAL';
        else if (score >= 4) riskLevel = 'HIGH';
        else if (score >= 2) riskLevel = 'MEDIUM';

        return {
            riskLevel,
            needsAttention: riskLevel !== 'LOW',
            attentionReasons: reasons,
        };
    }
}

module.exports = new ProgressSnapshotService();
