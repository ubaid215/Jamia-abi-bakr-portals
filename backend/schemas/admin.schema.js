// schemas/admin.schema.js — Zod validation schemas for admin routes

const { z } = require('zod');

const createAdminSchema = {
    body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters').max(100),
        phone: z.string().optional(),
    }),
};

const updateUserStatusSchema = {
    params: z.object({
        id: z.string().uuid('Valid user ID is required'),
    }),
    body: z.object({
        status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED'], {
            errorMap: () => ({ message: 'Status must be ACTIVE, INACTIVE, or TERMINATED' }),
        }),
    }),
};

const updateTeacherSchema = {
    params: z.object({
        id: z.string().min(1, 'Teacher ID is required'),
    }),
    body: z.object({
        name: z.string().min(2).max(100).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
        bio: z.string().max(1000).optional(),
        specialization: z.string().max(200).optional(),
        qualification: z.string().max(200).optional(),
        cnic: z.string().optional(),
        experience: z.coerce.number().min(0).optional(),
        joiningDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
        salary: z.coerce.number().min(0).optional(),
        employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT']).optional(),
    }),
};

const updateStudentSchema = {
    params: z.object({
        id: z.string().min(1, 'Student ID is required'),
    }),
    body: z.object({
        name: z.string().min(2).max(100).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
        dateOfBirth: z.string().optional(),
        gender: z.enum(['MALE', 'FEMALE']).optional(),
        guardianName: z.string().max(100).optional(),
        guardianPhone: z.string().optional(),
        address: z.string().max(500).optional(),
        city: z.string().max(100).optional(),
        province: z.string().max(100).optional(),
    }),
};

const paginationSchema = {
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(10),
        search: z.string().optional(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
    }),
};

const studentListSchema = {
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(10),
        search: z.string().optional(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
        classRoomId: z.string().uuid().optional(),
        classType: z.string().optional(),
    }),
};

const idParamSchema = {
    params: z.object({
        id: z.string().min(1, 'ID is required'),
    }),
};

module.exports = {
    createAdminSchema,
    updateUserStatusSchema,
    updateTeacherSchema,
    updateStudentSchema,
    paginationSchema,
    studentListSchema,
    idParamSchema,
};
