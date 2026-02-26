/**
 * modules/progress-snapshot/snapshot.calculator.js
 * Computes StudentProgressSnapshot from WeeklyProgress history + DailyActivities
 */

/**
 * @param {Object[]} weeklyHistory - last N weeks of WeeklyProgress
 * @param {Object[]} recentActivities - last 30 days of DailyActivity
 * @param {Object} currentSnapshot - existing snapshot (for streak tracking)
 * @returns {Object} snapshot update payload
 */
const calculateSnapshot = (weeklyHistory, recentActivities, currentSnapshot = {}) => {
  // ── Attendance totals ───────────────────────────────────────────────────────
  const totalDaysAttended = weeklyHistory.reduce((s, w) => s + w.totalDaysPresent, 0);
  const totalDaysAbsent = weeklyHistory.reduce((s, w) => s + w.totalDaysAbsent, 0);
  const totalWorkingDays = weeklyHistory.reduce((s, w) => s + w.totalWorkingDays, 0);
  const overallAttendanceRate = totalWorkingDays > 0
    ? Math.round((totalDaysAttended / totalWorkingDays) * 100 * 100) / 100
    : 0;

  // ── Streaks ─────────────────────────────────────────────────────────────────
  const { currentAttendanceStreak, longestAttendanceStreak, currentHomeworkStreak } =
    calculateStreaks(recentActivities, currentSnapshot);

  // ── Academic performance per subject ────────────────────────────────────────
  const subjectWisePerformance = aggregateSubjectPerformance(weeklyHistory);
  const { strongest, weakest, improving, declining } = classifySubjects(subjectWisePerformance);

  // ── Homework overall ────────────────────────────────────────────────────────
  const totalAssigned = weeklyHistory.reduce((s, w) => s + w.homeworkAssignedCount, 0);
  const totalCompleted = weeklyHistory.reduce((s, w) => s + w.homeworkCompletedCount, 0);
  const overallHomeworkCompletionRate = totalAssigned > 0
    ? Math.round((totalCompleted / totalAssigned) * 100 * 100) / 100
    : 0;

  const avgHomeworkQuality = weeklyHistory.filter(w => w.averageHomeworkQuality > 0).length > 0
    ? avg(weeklyHistory.map(w => w.averageHomeworkQuality).filter(v => v > 0))
    : 0;

  // ── Behavioral ──────────────────────────────────────────────────────────────
  const averageBehaviorRating = avg(weeklyHistory.map(w => w.averageBehaviorScore).filter(v => v > 0));
  const averageParticipation = avg(weeklyHistory.map(w => w.averageParticipationScore).filter(v => v > 0));
  const averageDiscipline = avg(weeklyHistory.map(w => w.averageDisciplineScore).filter(v => v > 0));

  // ── Skills ──────────────────────────────────────────────────────────────────
  const currentReadingLevel = avg(weeklyHistory.map(w => w.averageReadingSkill).filter(v => v > 0));
  const currentWritingLevel = avg(weeklyHistory.map(w => w.averageWritingSkill).filter(v => v > 0));
  const currentListeningLevel = avg(weeklyHistory.map(w => w.averageListeningSkill).filter(v => v > 0));
  const currentSpeakingLevel = avg(weeklyHistory.map(w => w.averageSpeakingSkill).filter(v => v > 0));
  const currentCriticalThinking = avg(weeklyHistory.map(w => w.averageCriticalThinking).filter(v => v > 0));

  // ── Risk assessment ─────────────────────────────────────────────────────────
  const { riskLevel, needsAttention, attentionReasons, interventionRequired, flaggedSubjects } =
    assessRisk({
      overallAttendanceRate, overallHomeworkCompletionRate, averageBehaviorRating,
      subjectWisePerformance, currentAttendanceStreak,
    });

  return {
    // Totals
    totalDaysAttended,
    totalDaysAbsent,
    overallAttendanceRate,

    // Streaks
    currentAttendanceStreak,
    longestAttendanceStreak: Math.max(longestAttendanceStreak, currentSnapshot.longestAttendanceStreak || 0),
    currentHomeworkStreak,

    // Academic
    subjectWisePerformance,
    strongestSubjects: strongest,
    weakestSubjects: weakest,
    improvingSubjects: improving,
    decliningSubjects: declining,

    // Homework
    overallHomeworkCompletionRate,
    averageHomeworkQuality: avgHomeworkQuality,

    // Behavioral
    averageBehaviorRating,
    averageParticipation,
    averageDiscipline,

    // Skills
    currentReadingLevel,
    currentWritingLevel,
    currentListeningLevel,
    currentSpeakingLevel,
    currentCriticalThinking,

    // Risk
    riskLevel,
    needsAttention,
    attentionReasons,
    interventionRequired,
    flaggedSubjects,

    // Meta
    lastCalculatedAt: new Date(),
    nextCalculationDue: new Date(Date.now() + 24 * 60 * 60 * 1000), // recalculate in 24h
  };
};

// ── Private helpers ───────────────────────────────────────────────────────────

const avg = (arr) => arr.length > 0
  ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100
  : 0;

const calculateStreaks = (activities, currentSnapshot) => {
  const sorted = [...activities].sort((a, b) => new Date(b.date) - new Date(a.date));

  let currentAttendanceStreak = 0;
  let currentHomeworkStreak = 0;

  for (const a of sorted) {
    if (a.attendanceStatus === 'PRESENT' || a.attendanceStatus === 'LATE') {
      currentAttendanceStreak++;
    } else break;
  }

  for (const a of sorted) {
    const hw = Array.isArray(a.homeworkCompleted) ? a.homeworkCompleted : [];
    const allDone = hw.length > 0 && hw.every(h => h.completionStatus === 'COMPLETE');
    if (allDone) currentHomeworkStreak++;
    else break;
  }

  return {
    currentAttendanceStreak,
    longestAttendanceStreak: currentAttendanceStreak,
    currentHomeworkStreak,
  };
};

const aggregateSubjectPerformance = (weeklyHistory) => {
  const subjectMap = {};

  for (const week of weeklyHistory) {
    const subjects = Array.isArray(week.subjectWiseProgress) ? week.subjectWiseProgress : [];
    for (const s of subjects) {
      if (!subjectMap[s.subjectId]) {
        subjectMap[s.subjectId] = { subjectId: s.subjectId, understandings: [], assessmentPercentages: [] };
      }
      if (s.avgUnderstanding) subjectMap[s.subjectId].understandings.push(s.avgUnderstanding);
      for (const a of (s.assessments || [])) {
        if (a.percentage !== undefined) subjectMap[s.subjectId].assessmentPercentages.push(a.percentage);
      }
    }
  }

  return Object.values(subjectMap).map(s => ({
    subjectId: s.subjectId,
    percentage: avg(s.assessmentPercentages),
    avgUnderstanding: avg(s.understandings),
    trend: determineTrend(s.understandings),
  }));
};

const determineTrend = (values) => {
  if (values.length < 2) return 'STABLE';
  const recent = values.slice(-3);
  const older = values.slice(0, -3);
  if (older.length === 0) return 'STABLE';
  const recentAvg = avg(recent);
  const olderAvg = avg(older);
  if (recentAvg > olderAvg + 0.3) return 'UP';
  if (recentAvg < olderAvg - 0.3) return 'DOWN';
  return 'STABLE';
};

const classifySubjects = (subjectPerformance) => {
  const strongest = subjectPerformance.filter(s => s.avgUnderstanding >= 4).map(s => s.subjectId);
  const weakest = subjectPerformance.filter(s => s.avgUnderstanding > 0 && s.avgUnderstanding < 2.5).map(s => s.subjectId);
  const improving = subjectPerformance.filter(s => s.trend === 'UP').map(s => s.subjectId);
  const declining = subjectPerformance.filter(s => s.trend === 'DOWN').map(s => s.subjectId);
  return { strongest, weakest, improving, declining };
};

const assessRisk = ({ overallAttendanceRate, overallHomeworkCompletionRate, averageBehaviorRating, subjectWisePerformance, currentAttendanceStreak }) => {
  const reasons = [];
  let flaggedSubjects = [];

  if (overallAttendanceRate < 60) reasons.push('Critically low attendance');
  else if (overallAttendanceRate < 75) reasons.push('Low attendance');

  if (overallHomeworkCompletionRate < 50) reasons.push('Low homework completion');
  if (averageBehaviorRating < 2) reasons.push('Poor behavior score');
  if (currentAttendanceStreak === 0) reasons.push('Recent absence');

  const weakSubjects = subjectWisePerformance.filter(s => s.avgUnderstanding > 0 && s.avgUnderstanding < 2.5);
  if (weakSubjects.length > 0) {
    reasons.push(`Struggling in ${weakSubjects.length} subject(s)`);
    flaggedSubjects = weakSubjects.map(s => s.subjectId);
  }

  let riskLevel = 'LOW';
  if (reasons.length >= 3 || overallAttendanceRate < 60) riskLevel = 'CRITICAL';
  else if (reasons.length === 2 || overallAttendanceRate < 75) riskLevel = 'HIGH';
  else if (reasons.length === 1) riskLevel = 'MEDIUM';

  return {
    riskLevel,
    needsAttention: riskLevel !== 'LOW',
    attentionReasons: reasons,
    interventionRequired: riskLevel === 'CRITICAL' || riskLevel === 'HIGH',
    flaggedSubjects,
  };
};

module.exports = { calculateSnapshot };