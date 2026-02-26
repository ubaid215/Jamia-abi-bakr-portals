/**
 * modules/weekly-progress/weeklyProgress.repository.js
 * Prisma queries for WeeklyProgress
 */

const prisma = require('../../db/prismaClient');

const progressSelect = {
  id: true,
  studentId: true,
  teacherId: true,
  classRoomId: true,
  weekNumber: true,
  year: true,
  startDate: true,
  endDate: true,
  totalDaysPresent: true,
  totalDaysAbsent: true,
  totalDaysLate: true,
  totalDaysExcused: true,
  totalHolidays: true,
  totalWorkingDays: true,
  attendancePercentage: true,
  punctualityPercentage: true,
  subjectWiseProgress: true,
  homeworkAssignedCount: true,
  homeworkCompletedCount: true,
  homeworkCompletionRate: true,
  averageHomeworkQuality: true,
  classworkCompletionRate: true,
  averageClassworkQuality: true,
  totalAssessments: true,
  assessmentResults: true,
  overallAverageScore: true,
  averageBehaviorScore: true,
  averageParticipationScore: true,
  averageDisciplineScore: true,
  uniformComplianceRate: true,
  averageReadingSkill: true,
  averageWritingSkill: true,
  averageListeningSkill: true,
  averageSpeakingSkill: true,
  averageCriticalThinking: true,
  weeklyHighlights: true,
  areasOfImprovement: true,
  strengthSubjects: true,
  weakSubjects: true,
  teacherComments: true,
  achievements: true,
  incidents: true,
  actionItems: true,
  followUpRequired: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      admissionNo: true,
      user: { select: { name: true, profileImage: true } },
    },
  },
  classRoom: {
    select: { id: true, name: true, grade: true, section: true },
  },
};

const upsert = (studentId, weekNumber, year, data) =>
  prisma.weeklyProgress.upsert({
    where: { studentId_weekNumber_year: { studentId, weekNumber, year } },
    create: { studentId, weekNumber, year, ...data },
    update: data,
    select: progressSelect,
  });

const findByStudentAndWeek = (studentId, weekNumber, year) =>
  prisma.weeklyProgress.findUnique({
    where: { studentId_weekNumber_year: { studentId, weekNumber, year } },
    select: progressSelect,
  });

const findById = (id) =>
  prisma.weeklyProgress.findUnique({ where: { id }, select: progressSelect });

const update = (id, data) =>
  prisma.weeklyProgress.update({ where: { id }, data, select: progressSelect });

const findMany = ({ where, skip, take, orderBy }) =>
  prisma.weeklyProgress.findMany({
    where,
    skip,
    take,
    orderBy: orderBy || [{ year: 'desc' }, { weekNumber: 'desc' }],
    select: progressSelect,
  });

const count = (where) => prisma.weeklyProgress.count({ where });

const findFollowUpRequired = (classRoomId, year) =>
  prisma.weeklyProgress.findMany({
    where: { classRoomId, year, followUpRequired: true },
    select: progressSelect,
    orderBy: { weekNumber: 'desc' },
  });

module.exports = {
  upsert,
  findByStudentAndWeek,
  findById,
  update,
  findMany,
  count,
  findFollowUpRequired,
};