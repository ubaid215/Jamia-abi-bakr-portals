/**
 * modules/student-goals/goals.validator.js
 */

const { z } = require('zod');

const createGoalSchema = {
  body: z.object({
    studentId: z.string().uuid(),
    goalType: z.string().min(1).max(50),
    category: z.string().max(50).optional().nullable(),
    title: z.string().min(1).max(200),
    description: z.string().max(500).optional().nullable(),
    metric: z.string().min(1).max(100),
    targetValue: z.number().positive(),
    currentValue: z.number().min(0).default(0),
    unit: z.string().min(1).max(50),
    startDate: z.string().datetime({ offset: true }),
    targetDate: z.string().datetime({ offset: true }),
    milestones: z.array(z.object({
      title: z.string(),
      targetValue: z.number(),
      targetDate: z.string().optional(),
    })).optional().nullable(),
    checkFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('WEEKLY'),
    visibleToStudent: z.boolean().default(true),
    visibleToParent: z.boolean().default(true),
    supportActions: z.array(z.string()).optional().nullable(),
  }),
};

const updateGoalSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    currentValue: z.number().min(0).optional(),
    targetValue: z.number().positive().optional(),
    status: z.enum(['IN_PROGRESS', 'ACHIEVED', 'AT_RISK', 'FAILED', 'CANCELLED']).optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(500).optional().nullable(),
    targetDate: z.string().datetime({ offset: true }).optional(),
    milestones: z.array(z.any()).optional().nullable(),
    supportActions: z.array(z.string()).optional().nullable(),
    visibleToStudent: z.boolean().optional(),
    visibleToParent: z.boolean().optional(),
  }).refine(d => Object.keys(d).length > 0, { message: 'At least one field required' }),
};

const listGoalsSchema = {
  query: z.object({
    studentId: z.string().uuid().optional(),
    teacherId: z.string().uuid().optional(),
    status: z.enum(['IN_PROGRESS', 'ACHIEVED', 'AT_RISK', 'FAILED', 'CANCELLED']).optional(),
    goalType: z.string().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
};

module.exports = { createGoalSchema, updateGoalSchema, listGoalsSchema };