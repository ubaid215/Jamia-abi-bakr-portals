/**
 * modules/progress-snapshot/snapshot.repository.js
 * All Prisma queries for StudentProgressSnapshot
 */

const prisma = require('../../db/prismaClient');

const snapshotSelect = {
  id: true,
  studentId: true,
  lastActivityDate: true,
  lastUpdated: true,
  currentAttendanceStreak: true,
  longestAttendanceStreak: true,
  currentHomeworkStreak: true,
  totalDaysAttended: true,
  totalDaysAbsent: true,
  totalHoursStudied: true,
  overallAttendanceRate: true,
  subjectWisePerformance: true,
  strongestSubjects: true,
  weakestSubjects: true,
  improvingSubjects: true,
  decliningSubjects: true,
  overallHomeworkCompletionRate: true,
  averageHomeworkQuality: true,
  pendingHomeworkCount: true,
  overdueHomeworkCount: true,
  averageBehaviorRating: true,
  averageParticipation: true,
  averageDiscipline: true,
  punctualityRate: true,
  currentReadingLevel: true,
  currentWritingLevel: true,
  currentListeningLevel: true,
  currentSpeakingLevel: true,
  currentCriticalThinking: true,
  classRank: true,
  classTotalStudents: true,
  gradeRank: true,
  percentileInClass: true,
  needsAttention: true,
  attentionReasons: true,
  flaggedSubjects: true,
  riskLevel: true,
  interventionRequired: true,
  lastCalculatedAt: true,
  nextCalculationDue: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      admissionNo: true,
      studentType: true,
      studentMode: true,
      user: { select: { name: true, profileImage: true, email: true } },
      currentEnrollment: {
        select: {
          classRoom: { select: { id: true, name: true, grade: true, section: true } },
        },
      },
    },
  },
};

const upsert = (studentId, data) =>
  prisma.studentProgressSnapshot.upsert({
    where: { studentId },
    create: { studentId, ...data },
    update: data,
    select: snapshotSelect,
  });

const findByStudentId = (studentId) =>
  prisma.studentProgressSnapshot.findUnique({
    where: { studentId },
    select: snapshotSelect,
  });

const findAtRisk = (classRoomId = null) => {
  const where = {
    needsAttention: true,
    student: { studentType: { in: ['REGULAR', 'REGULAR_HIFZ'] } },
  };
  if (classRoomId) {
    where.student.currentEnrollment = { classRoomId };
  }
  return prisma.studentProgressSnapshot.findMany({
    where,
    orderBy: [{ riskLevel: 'desc' }, { lastActivityDate: 'asc' }],
    select: snapshotSelect,
  });
};

const findNeedingRecalculation = () =>
  prisma.studentProgressSnapshot.findMany({
    where: {
      OR: [
        { nextCalculationDue: { lt: new Date() } },
        { nextCalculationDue: null },
      ],
    },
    select: { studentId: true },
  });

const countByRiskLevel = (classRoomId = null) => {
  const baseWhere = classRoomId
    ? { student: { currentEnrollment: { classRoomId }, studentType: { in: ['REGULAR', 'REGULAR_HIFZ'] } } }
    : { student: { studentType: { in: ['REGULAR', 'REGULAR_HIFZ'] } } };

  return prisma.studentProgressSnapshot.groupBy({
    by: ['riskLevel'],
    where: baseWhere,
    _count: { riskLevel: true },
  });
};

module.exports = {
  upsert,
  findByStudentId,
  findAtRisk,
  findNeedingRecalculation,
  countByRiskLevel,
  snapshotSelect,
};