/**
 * modules/weekly-progress/weeklyProgress.calculator.js
 * Pure calculation functions — builds WeeklyProgress data from DailyActivity records
 * No DB calls — receives raw data, returns computed object
 */


const calculateWeeklyProgress = (activities, totalWorkingDays) => {
  if (!activities || activities.length === 0) {
    return buildEmptyWeeklyProgress(totalWorkingDays);
  }

  // ── Attendance metrics ──────────────────────────────────────────────────────
  const attendance = countAttendance(activities);
  const totalDaysPresent = attendance.PRESENT + attendance.LATE + attendance.HALF_DAY;
  const totalDaysAbsent = attendance.ABSENT || 0;
  const totalDaysLate = attendance.LATE || 0;
  const totalDaysExcused = attendance.EXCUSED || 0;
  const attendancePercentage = totalWorkingDays > 0
    ? Math.round((totalDaysPresent / totalWorkingDays) * 100 * 100) / 100
    : 0;
  const punctualDays = activities.filter(a => a.punctuality).length;
  const punctualityPercentage = activities.length > 0
    ? Math.round((punctualDays / activities.length) * 100 * 100) / 100
    : 0;

  // ── Subject-wise progress ───────────────────────────────────────────────────
  const subjectWiseProgress = calculateSubjectProgress(activities);

  // ── Homework metrics ────────────────────────────────────────────────────────
  const homeworkMetrics = calculateHomeworkMetrics(activities);

  // ── Classwork metrics ───────────────────────────────────────────────────────
  const classworkMetrics = calculateClassworkMetrics(activities);

  // ── Assessment summary ──────────────────────────────────────────────────────
  const assessmentSummary = calculateAssessmentSummary(activities);

  // ── Behavioral metrics ──────────────────────────────────────────────────────
  const behavioral = calculateBehavioralMetrics(activities);

  // ── Skills development ──────────────────────────────────────────────────────
  const skills = calculateSkillsMetrics(activities);

  // ── Highlights ─────────────────────────────────────────────────────────────
  const { strengths, weaknesses } = identifySubjectStrengthsWeaknesses(subjectWiseProgress);

  return {
    // Attendance
    totalDaysPresent,
    totalDaysAbsent,
    totalDaysLate,
    totalDaysExcused,
    totalHolidays: totalWorkingDays > 7 ? 0 : 7 - totalWorkingDays,
    totalWorkingDays,
    attendancePercentage,
    punctualityPercentage,

    // Subjects
    subjectWiseProgress,

    // Homework
    homeworkAssignedCount: homeworkMetrics.assigned,
    homeworkCompletedCount: homeworkMetrics.completed,
    homeworkCompletionRate: homeworkMetrics.completionRate,
    averageHomeworkQuality: homeworkMetrics.avgQuality,

    // Classwork
    classworkCompletionRate: classworkMetrics.completionRate,
    averageClassworkQuality: classworkMetrics.avgQuality,

    // Assessments
    totalAssessments: assessmentSummary.total,
    assessmentResults: assessmentSummary.results,
    overallAverageScore: assessmentSummary.avgScore,

    // Behavioral
    averageBehaviorScore: behavioral.avgBehavior,
    averageParticipationScore: behavioral.avgParticipation,
    averageDisciplineScore: behavioral.avgDiscipline,
    uniformComplianceRate: behavioral.uniformRate,

    // Skills
    averageReadingSkill: skills.reading,
    averageWritingSkill: skills.writing,
    averageListeningSkill: skills.listening,
    averageSpeakingSkill: skills.speaking,
    averageCriticalThinking: skills.criticalThinking,

    // Highlights
    strengthSubjects: strengths,
    weakSubjects: weaknesses,
  };
};

// ── Private helpers ───────────────────────────────────────────────────────────

const countAttendance = (activities) => {
  return activities.reduce((acc, a) => {
    acc[a.attendanceStatus] = (acc[a.attendanceStatus] || 0) + 1;
    return acc;
  }, {});
};

const calculateSubjectProgress = (activities) => {
  const subjectMap = {};

  for (const activity of activities) {
    const subjects = Array.isArray(activity.subjectsStudied) ? activity.subjectsStudied : [];

    for (const s of subjects) {
      if (!s.subjectId) continue;

      if (!subjectMap[s.subjectId]) {
        subjectMap[s.subjectId] = {
          subjectId: s.subjectId,
          topicsCompleted: 0,
          understandingLevels: [],
          assessments: [],
          trend: 'STABLE',
        };
      }

      subjectMap[s.subjectId].topicsCompleted += (s.topicsCovered?.length || 0);
      if (s.understandingLevel) {
        subjectMap[s.subjectId].understandingLevels.push(s.understandingLevel);
      }
    }

    // Merge assessment data per subject
    const assessments = Array.isArray(activity.assessmentsTaken) ? activity.assessmentsTaken : [];
    for (const a of assessments) {
      if (!a.subjectId || !subjectMap[a.subjectId]) continue;
      subjectMap[a.subjectId].assessments.push({
        type: a.type,
        score: a.marksObtained,
        outOf: a.totalMarks,
        percentage: a.totalMarks > 0 ? Math.round((a.marksObtained / a.totalMarks) * 100) : 0,
      });
    }
  }

  // Finalize averages
  return Object.values(subjectMap).map(s => ({
    ...s,
    avgUnderstanding: s.understandingLevels.length > 0
      ? Math.round((s.understandingLevels.reduce((a, b) => a + b, 0) / s.understandingLevels.length) * 100) / 100
      : 0,
    understandingLevels: undefined, // Remove raw array from output
  }));
};

const calculateHomeworkMetrics = (activities) => {
  let assigned = 0;
  let completed = 0;
  let qualityScores = [];

  for (const activity of activities) {
    const hw = Array.isArray(activity.homeworkAssigned) ? activity.homeworkAssigned : [];
    assigned += hw.length;

    const hwDone = Array.isArray(activity.homeworkCompleted) ? activity.homeworkCompleted : [];
    const fullyDone = hwDone.filter(h => h.completionStatus === 'COMPLETE');
    completed += fullyDone.length;

    for (const h of hwDone) {
      if (h.quality) qualityScores.push(h.quality);
    }
  }

  const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100 * 100) / 100 : 0;
  const avgQuality = qualityScores.length > 0
    ? Math.round((qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) * 100) / 100
    : 0;

  return { assigned, completed, completionRate, avgQuality };
};

const calculateClassworkMetrics = (activities) => {
  let total = 0;
  let completed = 0;
  let qualityScores = [];

  for (const activity of activities) {
    const cw = Array.isArray(activity.classworkCompleted) ? activity.classworkCompleted : [];
    total += cw.length;
    completed += cw.filter(c => c.completionStatus === 'COMPLETE').length;
    for (const c of cw) {
      if (c.quality) qualityScores.push(c.quality);
    }
  }

  return {
    completionRate: total > 0 ? Math.round((completed / total) * 100 * 100) / 100 : 0,
    avgQuality: qualityScores.length > 0
      ? Math.round((qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) * 100) / 100
      : 0,
  };
};

const calculateAssessmentSummary = (activities) => {
  const subjectAssessments = {};
  let totalScore = 0;
  let totalOutOf = 0;
  let count = 0;

  for (const activity of activities) {
    const assessments = Array.isArray(activity.assessmentsTaken) ? activity.assessmentsTaken : [];
    for (const a of assessments) {
      count++;
      totalScore += a.marksObtained || 0;
      totalOutOf += a.totalMarks || 0;

      if (!subjectAssessments[a.subjectId]) {
        subjectAssessments[a.subjectId] = { subjectId: a.subjectId, count: 0, totalScore: 0, totalOutOf: 0 };
      }
      subjectAssessments[a.subjectId].count++;
      subjectAssessments[a.subjectId].totalScore += a.marksObtained || 0;
      subjectAssessments[a.subjectId].totalOutOf += a.totalMarks || 0;
    }
  }

  const results = Object.values(subjectAssessments).map(s => ({
    subjectId: s.subjectId,
    count: s.count,
    avgScore: s.count > 0 ? Math.round((s.totalScore / s.count) * 100) / 100 : 0,
    avgPercentage: s.totalOutOf > 0 ? Math.round((s.totalScore / s.totalOutOf) * 100 * 100) / 100 : 0,
  }));

  return {
    total: count,
    results,
    avgScore: totalOutOf > 0 ? Math.round((totalScore / totalOutOf) * 100 * 100) / 100 : 0,
  };
};

const calculateBehavioralMetrics = (activities) => {
  const avg = (arr) => arr.length > 0
    ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100
    : 0;

  const uniformCompliant = activities.filter(a => a.uniformCompliance).length;

  return {
    avgBehavior: avg(activities.map(a => a.behaviorRating).filter(Boolean)),
    avgParticipation: avg(activities.map(a => a.participationLevel).filter(Boolean)),
    avgDiscipline: avg(activities.map(a => a.disciplineScore).filter(Boolean)),
    uniformRate: activities.length > 0
      ? Math.round((uniformCompliant / activities.length) * 100 * 100) / 100
      : 0,
  };
};

const calculateSkillsMetrics = (activities) => {
  const skillKeys = ['reading', 'writing', 'listening', 'speaking', 'criticalThinking'];
  const sums = Object.fromEntries(skillKeys.map(k => [k, { total: 0, count: 0 }]));

  for (const activity of activities) {
    if (!activity.skillsSnapshot) continue;
    for (const key of skillKeys) {
      if (activity.skillsSnapshot[key]) {
        sums[key].total += activity.skillsSnapshot[key];
        sums[key].count++;
      }
    }
  }

  return Object.fromEntries(
    skillKeys.map(k => [k, sums[k].count > 0
      ? Math.round((sums[k].total / sums[k].count) * 100) / 100
      : 0])
  );
};

const identifySubjectStrengthsWeaknesses = (subjectProgress) => {
  const strengths = subjectProgress
    .filter(s => s.avgUnderstanding >= 4)
    .map(s => s.subjectId);
  const weaknesses = subjectProgress
    .filter(s => s.avgUnderstanding > 0 && s.avgUnderstanding < 3)
    .map(s => s.subjectId);
  return { strengths, weaknesses };
};

const buildEmptyWeeklyProgress = (totalWorkingDays) => ({
  totalDaysPresent: 0,
  totalDaysAbsent: 0,
  totalDaysLate: 0,
  totalDaysExcused: 0,
  totalHolidays: 0,
  totalWorkingDays,
  attendancePercentage: 0,
  punctualityPercentage: 0,
  subjectWiseProgress: [],
  homeworkAssignedCount: 0,
  homeworkCompletedCount: 0,
  homeworkCompletionRate: 0,
  averageHomeworkQuality: 0,
  classworkCompletionRate: 0,
  averageClassworkQuality: 0,
  totalAssessments: 0,
  assessmentResults: [],
  overallAverageScore: 0,
  averageBehaviorScore: 0,
  averageParticipationScore: 0,
  averageDisciplineScore: 0,
  uniformComplianceRate: 0,
  averageReadingSkill: 0,
  averageWritingSkill: 0,
  averageListeningSkill: 0,
  averageSpeakingSkill: 0,
  averageCriticalThinking: 0,
  strengthSubjects: [],
  weakSubjects: [],
});

module.exports = { calculateWeeklyProgress };