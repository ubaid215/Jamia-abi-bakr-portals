// schemas/enrollment.schema.js — Zod validation schemas for enrollment routes

const { z } = require('zod');

const assignTeacherToClassSchema = {
    body: z.object({
        teacherId: z.string().uuid('Valid teacher ID is required'),
        classRoomId: z.string().uuid('Valid class ID is required'),
    }),
};

const assignStudentToClassSchema = {
    body: z.object({
        studentId: z.string().uuid('Valid student ID is required'),
        classRoomId: z.string().uuid('Valid class ID is required'),
    }),
};

const bulkAssignStudentsSchema = {
    body: z.object({
        studentIds: z.array(z.string().uuid()).min(1, 'At least one student ID is required'),
        classRoomId: z.string().uuid('Valid class ID is required'),
    }),
};

const promoteStudentsSchema = {
    body: z.object({
        studentIds: z.array(z.string().uuid()).min(1, 'At least one student ID is required'),
        targetClassRoomId: z.string().uuid('Valid target class ID is required'),
    }),
};

const removeStudentSchema = {
    params: z.object({
        enrollmentId: z.string().uuid('Valid enrollment ID is required'),
    }),
};

const removeTeacherFromClassSchema = {
    params: z.object({
        classRoomId: z.string().uuid('Valid class ID is required'),
    }),
};

module.exports = {
    assignTeacherToClassSchema,
    assignStudentToClassSchema,
    bulkAssignStudentsSchema,
    promoteStudentsSchema,
    removeStudentSchema,
    removeTeacherFromClassSchema,
};
