/**
 * modules/daily-activity/dailyActivity.validator.js
 * Zod schemas for all daily activity request validation
 */

const { z } = require('zod');

// ── Reusable sub-schemas ──────────────────────────────────────────────────────

const subjectStudiedSchema = z.object({
  subjectId: z.string().uuid('Invalid subjectId'),
  topicsCovered: z.array(z.string().min(1)).min(1, 'At least one topic required'),
  understandingLevel: z.number().int().min(1).max(5),
  notes: z.string().max(500).optional().nullable(),
});

const homeworkAssignedSchema = z.object({
  subjectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

const homeworkCompletedSchema = z.object({
  subjectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  completionStatus: z.enum(['COMPLETE', 'PARTIAL', 'NOT_DONE']),
  quality: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});

const classworkSchema = z.object({
  subjectId: z.string().uuid(),
  activity: z.string().min(1).max(200),
  completionStatus: z.enum(['COMPLETE', 'PARTIAL', 'NOT_DONE']),
  quality: z.number().int().min(1).max(5).optional().nullable(),
});

const assessmentTakenSchema = z.object({
  subjectId: z.string().uuid(),
  type: z.enum(['QUIZ', 'TEST', 'ORAL']),
  topic: z.string().min(1).max(200),
  marksObtained: z.number().min(0),
  totalMarks: z.number().min(1),
});

const skillsSnapshotSchema = z.object({
  reading: z.number().int().min(1).max(5).optional(),
  writing: z.number().int().min(1).max(5).optional(),
  listening: z.number().int().min(1).max(5).optional(),
  speaking: z.number().int().min(1).max(5).optional(),
  criticalThinking: z.number().int().min(1).max(5).optional(),
}).optional().nullable();

// ── Create Daily Activity ─────────────────────────────────────────────────────

const createActivitySchema = {
  body: z.object({
    studentId: z.string().uuid('Invalid studentId'),
    classRoomId: z.string().uuid('Invalid classRoomId'),
    subjectId: z.string().uuid('Invalid subjectId').optional().nullable(),
    date: z.string().datetime({ offset: true }).optional(), // defaults to now

    // Attendance link
    attendanceId: z.string().uuid().optional().nullable(),
    attendanceStatus: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY']).default('PRESENT'),

    totalHoursSpent: z.number().min(0).max(24).default(0),

    // Academic activities
    subjectsStudied: z.array(subjectStudiedSchema).min(1, 'At least one subject entry required'),

    // Homework
    homeworkAssigned: z.array(homeworkAssignedSchema).optional().nullable(),
    homeworkCompleted: z.array(homeworkCompletedSchema).optional().nullable(),

    // Classwork
    classworkCompleted: z.array(classworkSchema).optional().nullable(),
    participationLevel: z.number().int().min(1).max(5).default(3),

    // Assessments
    assessmentsTaken: z.array(assessmentTakenSchema).optional().nullable(),

    // Behavioral
    behaviorRating: z.number().int().min(1).max(5).default(3),
    disciplineScore: z.number().int().min(1).max(5).default(3),
    punctuality: z.boolean().default(true),
    uniformCompliance: z.boolean().default(true),

    // Skills
    skillsSnapshot: skillsSnapshotSchema,

    // Observations
    strengths: z.string().max(500).optional().nullable(),
    improvements: z.string().max(500).optional().nullable(),
    concerns: z.string().max(500).optional().nullable(),
    teacherRemarks: z.string().max(1000).optional().nullable(),
    parentNotes: z.string().max(500).optional().nullable(),
  }),
};

// ── Update Daily Activity ─────────────────────────────────────────────────────

const updateActivitySchema = {
  params: z.object({
    id: z.string().uuid('Invalid activity ID'),
  }),
  body: z.object({
    subjectId: z.string().uuid().optional().nullable(),
    attendanceId: z.string().uuid().optional().nullable(),
    attendanceStatus: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY']).optional(),
    totalHoursSpent: z.number().min(0).max(24).optional(),
    subjectsStudied: z.array(subjectStudiedSchema).min(1).optional(),
    homeworkAssigned: z.array(homeworkAssignedSchema).optional().nullable(),
    homeworkCompleted: z.array(homeworkCompletedSchema).optional().nullable(),
    classworkCompleted: z.array(classworkSchema).optional().nullable(),
    participationLevel: z.number().int().min(1).max(5).optional(),
    assessmentsTaken: z.array(assessmentTakenSchema).optional().nullable(),
    behaviorRating: z.number().int().min(1).max(5).optional(),
    disciplineScore: z.number().int().min(1).max(5).optional(),
    punctuality: z.boolean().optional(),
    uniformCompliance: z.boolean().optional(),
    skillsSnapshot: skillsSnapshotSchema,
    strengths: z.string().max(500).optional().nullable(),
    improvements: z.string().max(500).optional().nullable(),
    concerns: z.string().max(500).optional().nullable(),
    teacherRemarks: z.string().max(1000).optional().nullable(),
    parentNotes: z.string().max(500).optional().nullable(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  }),
};

// ── List Activities (query params) ────────────────────────────────────────────

const listActivitiesSchema = {
  query: z.object({
    studentId: z.string().uuid().optional(),
    classRoomId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    teacherId: z.string().uuid().optional(),
    startDate: z.string().datetime({ offset: true }).optional(),
    endDate: z.string().datetime({ offset: true }).optional(),
    attendanceStatus: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
};

// ── Get single by params ──────────────────────────────────────────────────────

const activityParamsSchema = {
  params: z.object({
    id: z.string().uuid('Invalid activity ID'),
  }),
};

const studentDateParamsSchema = {
  params: z.object({
    studentId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  }),
};

module.exports = {
  createActivitySchema,
  updateActivitySchema,
  listActivitiesSchema,
  activityParamsSchema,
  studentDateParamsSchema,
};