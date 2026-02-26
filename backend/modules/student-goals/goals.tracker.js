/**
 * modules/student-goals/goals.tracker.js
 * Automatic goal progress evaluator — runs on cron and on activity creation
 * Reads DailyActivity / WeeklyProgress / Attendance data to auto-update goal currentValue
 */

const prisma = require('../../db/prismaClient');
const goalRepo = require('./goals.repository');
const { emit } = require('../notifications/notifications.emitter');
const logger = require('../../utils/logger');

/**
 * Goal type → auto-evaluation strategy map
 * Each strategy receives (studentId, goal, context) and returns a currentValue number
 */
const GOAL_EVALUATORS = {

  ATTENDANCE_RATE: async (studentId, goal) => {
    // Calculate attendance % over the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [present, total] = await Promise.all([
      prisma.attendance.count({
        where: {
          studentId,
          date: { gte: thirtyDaysAgo },
          status: { in: ['PRESENT', 'LATE', 'HALF_DAY'] },
        },
      }),
      prisma.attendance.count({
        where: { studentId, date: { gte: thirtyDaysAgo } },
      }),
    ]);

    return total > 0 ? Math.round((present / total) * 100 * 100) / 100 : 0;
  },

  HOMEWORK_COMPLETION: async (studentId) => {
    const snapshot = await prisma.studentProgressSnapshot.findUnique({
      where: { studentId },
      select: { overallHomeworkCompletionRate: true },
    });
    return snapshot?.overallHomeworkCompletionRate || 0;
  },

  BEHAVIOR_SCORE: async (studentId) => {
    const snapshot = await prisma.studentProgressSnapshot.findUnique({
      where: { studentId },
      select: { averageBehaviorRating: true },
    });
    return snapshot?.averageBehaviorRating || 0;
  },

  SUBJECT_UNDERSTANDING: async (studentId, goal) => {
    // goal.metric should be subjectId
    const subjectId = goal.metric;
    const recent = await prisma.dailyActivity.findMany({
      where: {
        studentId,
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        subjectsStudied: { not: null },
      },
      select: { subjectsStudied: true },
      orderBy: { date: 'desc' },
      take: 20,
    });

    const levels = [];
    for (const activity of recent) {
      const subjects = Array.isArray(activity.subjectsStudied) ? activity.subjectsStudied : [];
      const match = subjects.find(s => s.subjectId === subjectId);
      if (match?.understandingLevel) levels.push(match.understandingLevel);
    }

    return levels.length > 0
      ? Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 100) / 100
      : 0;
  },

  READING_SKILL: async (studentId) => {
    const snapshot = await prisma.studentProgressSnapshot.findUnique({
      where: { studentId },
      select: { currentReadingLevel: true },
    });
    return snapshot?.currentReadingLevel || 0;
  },

  WRITING_SKILL: async (studentId) => {
    const snapshot = await prisma.studentProgressSnapshot.findUnique({
      where: { studentId },
      select: { currentWritingLevel: true },
    });
    return snapshot?.currentWritingLevel || 0;
  },

  // Fallback — manual goals don't auto-evaluate
  MANUAL: async () => null,
};

/**
 * Evaluate and update a single goal's currentValue and progress
 * @param {Object} goal - StudentGoal record
 * @returns {Object|null} updated goal or null if no change
 */
const evaluateGoal = async (goal) => {
  try {
    const evaluator = GOAL_EVALUATORS[goal.goalType] || GOAL_EVALUATORS.MANUAL;
    const currentValue = await evaluator(goal.studentId, goal);

    if (currentValue === null) return null; // Manual goal — skip

    const targetValue = goal.targetValue;
    const progress = targetValue > 0
      ? Math.min(Math.round((currentValue / targetValue) * 100 * 100) / 100, 100)
      : 0;

    const now = new Date();
    const daysLeft = Math.ceil((new Date(goal.targetDate) - now) / (1000 * 60 * 60 * 24));
    const timeUsedPercent = ((now - new Date(goal.startDate)) /
      (new Date(goal.targetDate) - new Date(goal.startDate))) * 100;

    // Determine new status
    let newStatus = goal.status;
    let achievedAt = goal.achievedAt;

    if (progress >= 100 && goal.status === 'IN_PROGRESS') {
      newStatus = 'ACHIEVED';
      achievedAt = now;
    } else if (daysLeft < 0 && goal.status === 'IN_PROGRESS') {
      newStatus = 'FAILED';
    } else if (goal.status === 'IN_PROGRESS' && progress < 30 && timeUsedPercent > 70) {
      newStatus = 'AT_RISK';
    }

    // Only update if something changed
    const hasChange = (
      Math.abs(currentValue - goal.currentValue) > 0.01 ||
      newStatus !== goal.status
    );

    if (!hasChange) {
      await goalRepo.update(goal.id, { lastChecked: now });
      return null;
    }

    const updated = await goalRepo.update(goal.id, {
      currentValue,
      progress,
      status: newStatus,
      achievedAt,
      lastChecked: now,
    });

    // Send notifications on status change
    if (newStatus !== goal.status) {
      await handleStatusChange(goal, newStatus, progress, daysLeft);
    }

    return updated;
  } catch (err) {
    logger.error({ err, goalId: goal.id }, 'GoalTracker: evaluation failed');
    return null;
  }
};

/**
 * Handle goal status change notifications
 */
const handleStatusChange = async (goal, newStatus, progress, daysLeft) => {
  const student = await prisma.student.findUnique({
    where: { id: goal.studentId },
    select: { user: { select: { name: true } } },
  });

  const studentName = student?.user?.name || 'Student';

  const notifMap = {
    ACHIEVED: {
      title: `🎉 Goal Achieved: ${goal.title}`,
      message: `${studentName} has achieved their goal "${goal.title}" with ${progress}% completion!`,
      priority: 'HIGH',
    },
    AT_RISK: {
      title: `⚠️ Goal At Risk: ${goal.title}`,
      message: `Goal "${goal.title}" is at risk. Only ${progress.toFixed(1)}% complete with ${daysLeft} days remaining.`,
      priority: 'HIGH',
    },
    FAILED: {
      title: `❌ Goal Failed: ${goal.title}`,
      message: `Goal "${goal.title}" was not achieved by the target date.`,
      priority: 'NORMAL',
    },
  };

  const notif = notifMap[newStatus];
  if (!notif) return;

  const recipients = [goal.teacherId].filter(Boolean);
  if (goal.visibleToStudent) recipients.push(goal.studentId); // We'll use studentId as userId here — adapt if needed

  await emit({
    studentId: goal.studentId,
    recipientIds: recipients,
    recipientTypes: recipients.map(() => 'TEACHER'),
    notificationType: `GOAL_${newStatus}`,
    category: 'GOALS',
    ...notif,
    data: { goalId: goal.id, progress, daysLeft },
  });
};

/**
 * Run evaluations for all IN_PROGRESS goals for a specific student
 * Called after a daily activity is created
 * @param {string} studentId
 */
const evaluateStudentGoals = async (studentId) => {
  const goals = await goalRepo.findMany({
    where: { studentId, status: { in: ['IN_PROGRESS', 'AT_RISK'] } },
    skip: 0,
    take: 50,
  });

  let updated = 0;
  for (const goal of goals) {
    const result = await evaluateGoal(goal);
    if (result) updated++;
  }

  logger.info({ studentId, total: goals.length, updated }, 'GoalTracker: student evaluation done');
  return { total: goals.length, updated };
};

/**
 * Run evaluations for ALL active goals — called by daily cron job
 */
const runBatchEvaluation = async () => {
  const goals = await goalRepo.findDueForCheck();
  logger.info({ count: goals.length }, 'GoalTracker: batch evaluation started');

  let updated = 0;
  let errors = 0;

  // Process in batches
  const BATCH_SIZE = 25;
  for (let i = 0; i < goals.length; i += BATCH_SIZE) {
    const batch = goals.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(g => evaluateGoal(g)));
    updated += results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
    errors += results.filter(r => r.status === 'rejected').length;

    if (i + BATCH_SIZE < goals.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  logger.info({ total: goals.length, updated, errors }, 'GoalTracker: batch evaluation complete');
  return { total: goals.length, updated, errors };
};

module.exports = {
  evaluateGoal,
  evaluateStudentGoals,
  runBatchEvaluation,
  GOAL_EVALUATORS,
};