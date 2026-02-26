/**
 * modules/weekly-progress/weeklyProgress.validator.js
 */

const { z } = require('zod');

const generateSchema = {
  body: z.object({
    studentId: z.string().uuid('Invalid studentId'),
    classRoomId: z.string().uuid('Invalid classRoomId'),
    weekNumber: z.number().int().min(1).max(53).optional(),
    year: z.number().int().min(2020).max(2100).optional(),
  }),
};

const updateSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    weeklyHighlights: z.string().max(1000).optional().nullable(),
    areasOfImprovement: z.string().max(1000).optional().nullable(),
    teacherComments: z.string().max(1000).optional().nullable(),
    achievements: z.array(z.object({
      title: z.string(),
      description: z.string().optional(),
      date: z.string().optional(),
      category: z.string().optional(),
    })).optional().nullable(),
    incidents: z.array(z.object({
      type: z.enum(['POSITIVE', 'NEGATIVE']),
      description: z.string(),
      date: z.string().optional(),
      actionTaken: z.string().optional(),
    })).optional().nullable(),
    actionItems: z.array(z.object({
      category: z.string(),
      item: z.string(),
      priority: z.string().optional(),
      assignedTo: z.string().optional(),
    })).optional().nullable(),
    followUpRequired: z.boolean().optional(),
  }).refine(d => Object.keys(d).length > 0, { message: 'At least one field required' }),
};

const listSchema = {
  query: z.object({
    studentId: z.string().uuid().optional(),
    classRoomId: z.string().uuid().optional(),
    teacherId: z.string().uuid().optional(),
    year: z.string().regex(/^\d{4}$/).optional(),
    weekNumber: z.string().regex(/^\d{1,2}$/).optional(),
    followUpRequired: z.enum(['true', 'false']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
};

const weekParamsSchema = {
  params: z.object({
    studentId: z.string().uuid(),
    weekNumber: z.string().regex(/^\d{1,2}$/),
    year: z.string().regex(/^\d{4}$/),
  }),
};

module.exports = { generateSchema, updateSchema, listSchema, weekParamsSchema };