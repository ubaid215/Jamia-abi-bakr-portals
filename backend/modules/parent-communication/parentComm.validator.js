/**
 * modules/parent-communication/parentComm.validator.js
 */

const { z } = require('zod');

const createCommSchema = {
  body: z.object({
    studentId: z.string().uuid(),
    parentId: z.string().uuid().optional().nullable(),
    communicationType: z.string().min(1).max(50),
    subject: z.string().min(1).max(200),
    message: z.string().min(1).max(2000),
    relatedActivity: z.record(z.any()).optional().nullable(),
    meetingRequested: z.boolean().default(false),
    meetingScheduled: z.string().datetime({ offset: true }).optional().nullable(),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
    sentVia: z.array(z.string()).default(['IN_APP']),
  }),
};

const updateCommSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    meetingScheduled: z.string().datetime({ offset: true }).optional().nullable(),
    meetingCompleted: z.boolean().optional(),
    meetingNotes: z.string().max(1000).optional().nullable(),
    isActive: z.boolean().optional(),
  }),
};

const acknowledgeSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    parentResponse: z.string().max(1000).optional().nullable(),
  }),
};

const listCommSchema = {
  query: z.object({
    studentId: z.string().uuid().optional(),
    teacherId: z.string().uuid().optional(),
    parentId: z.string().uuid().optional(),
    communicationType: z.string().optional(),
    acknowledged: z.enum(['true', 'false']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
};

module.exports = { createCommSchema, updateCommSchema, acknowledgeSchema, listCommSchema };