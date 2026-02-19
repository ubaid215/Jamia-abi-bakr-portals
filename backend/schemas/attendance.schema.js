// schemas/attendance.schema.js — Zod validation schemas for attendance routes

const { z } = require('zod');

const markAttendanceSchema = {
    body: z.object({
        classRoomId: z.string().uuid('Valid class ID is required'),
        date: z.string().min(1, 'Date is required'),
        subjectId: z.string().uuid().optional(),
        attendance: z.array(
            z.object({
                studentId: z.string().uuid('Valid student ID is required'),
                status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HALF_DAY'], {
                    errorMap: () => ({ message: 'Invalid attendance status' }),
                }),
                remarks: z.string().max(500).optional(),
            })
        ).min(1, 'At least one attendance record is required').optional(),
        // For single student marking
        studentId: z.string().uuid().optional(),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HALF_DAY']).optional(),
        remarks: z.string().max(500).optional(),
    }),
};

const markAttendanceWithExceptionsSchema = {
    body: z.object({
        classRoomId: z.string().uuid('Valid class ID is required'),
        date: z.string().min(1, 'Date is required'),
        subjectId: z.string().uuid().optional(),
        defaultStatus: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HALF_DAY']).default('PRESENT'),
        exceptions: z.array(
            z.object({
                studentId: z.string().uuid('Valid student ID is required'),
                status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HALF_DAY']),
                remarks: z.string().max(500).optional(),
            })
        ).optional().default([]),
    }),
};

const getAttendanceSchema = {
    query: z.object({
        classRoomId: z.string().uuid('Valid class ID is required'),
        date: z.string().min(1, 'Date is required'),
        subjectId: z.string().uuid().optional(),
    }),
};

const getStudentAttendanceSchema = {
    params: z.object({
        studentId: z.string().uuid('Valid student ID is required'),
    }),
    query: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        classRoomId: z.string().uuid().optional(),
        subjectId: z.string().uuid().optional(),
    }),
};

module.exports = {
    markAttendanceSchema,
    markAttendanceWithExceptionsSchema,
    getAttendanceSchema,
    getStudentAttendanceSchema,
};
