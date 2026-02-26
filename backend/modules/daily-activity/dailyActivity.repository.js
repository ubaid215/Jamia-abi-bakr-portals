/**
 * modules/daily-activity/dailyActivity.repository.js
 * All Prisma queries for DailyActivity — no business logic here
 */

const prisma = require('../../db/prismaClient');

// ── Select shape ──────────────────────────────────────────────────────────────
// Reusable select to avoid over-fetching

const activitySelect = {
  id: true,
  studentId: true,
  teacherId: true,
  classRoomId: true,
  subjectId: true,
  date: true,
  attendanceId: true,
  attendanceStatus: true,
  totalHoursSpent: true,
  subjectsStudied: true,
  homeworkAssigned: true,
  homeworkCompleted: true,
  classworkCompleted: true,
  participationLevel: true,
  assessmentsTaken: true,
  behaviorRating: true,
  disciplineScore: true,
  punctuality: true,
  uniformCompliance: true,
  skillsSnapshot: true,
  strengths: true,
  improvements: true,
  concerns: true,
  teacherRemarks: true,
  parentNotes: true,
  recordedBy: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      admissionNo: true,
      studentType: true,
      user: { select: { name: true, profileImage: true } },
    },
  },
  teacher: {
    select: {
      id: true,
      user: { select: { name: true } },
    },
  },
  classRoom: {
    select: { id: true, name: true, grade: true, section: true },
  },
  subject: {
    select: { id: true, name: true, code: true },
  },
};

// ── CRUD ──────────────────────────────────────────────────────────────────────

const create = (data) =>
  prisma.dailyActivity.create({
    data,
    select: activitySelect,
  });

const findById = (id) =>
  prisma.dailyActivity.findUnique({
    where: { id },
    select: activitySelect,
  });

const findByStudentAndDate = (studentId, date) =>
  prisma.dailyActivity.findUnique({
    where: { studentId_date: { studentId, date } },
    select: activitySelect,
  });

const update = (id, data) =>
  prisma.dailyActivity.update({
    where: { id },
    data,
    select: activitySelect,
  });

const remove = (id) =>
  prisma.dailyActivity.delete({ where: { id } });

// ── List with filters ─────────────────────────────────────────────────────────

const findMany = ({ where, skip, take, orderBy }) =>
  prisma.dailyActivity.findMany({
    where,
    skip,
    take,
    orderBy: orderBy || { date: 'desc' },
    select: activitySelect,
  });

const count = (where) =>
  prisma.dailyActivity.count({ where });

// ── Aggregation helpers ───────────────────────────────────────────────────────

/**
 * Get activities for a student within a date range (for weekly/snapshot calc)
 */
const findByStudentInRange = (studentId, startDate, endDate) =>
  prisma.dailyActivity.findMany({
    where: {
      studentId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      date: true,
      attendanceStatus: true,
      totalHoursSpent: true,
      subjectsStudied: true,
      homeworkAssigned: true,
      homeworkCompleted: true,
      classworkCompleted: true,
      participationLevel: true,
      assessmentsTaken: true,
      behaviorRating: true,
      disciplineScore: true,
      punctuality: true,
      uniformCompliance: true,
      skillsSnapshot: true,
      subjectId: true,
    },
  });

/**
 * Get activities for a classroom on a specific date
 */
const findByClassRoomAndDate = (classRoomId, date) =>
  prisma.dailyActivity.findMany({
    where: { classRoomId, date: { gte: date, lt: new Date(date.getTime() + 86400000) } },
    select: activitySelect,
  });

/**
 * Check if activity already exists for student on a date
 */
const existsForStudentAndDate = async (studentId, date) => {
  const count = await prisma.dailyActivity.count({
    where: { studentId_date: { studentId, date } },
  });
  return count > 0;
};

module.exports = {
  create,
  findById,
  findByStudentAndDate,
  update,
  remove,
  findMany,
  count,
  findByStudentInRange,
  findByClassRoomAndDate,
  existsForStudentAndDate,
  activitySelect,
};