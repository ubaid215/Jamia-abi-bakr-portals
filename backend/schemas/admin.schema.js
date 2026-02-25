// schemas/admin.schema.js

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

// admin.schema.js — fix all nullable enums to accept empty string too

const updateTeacherSchema = {
    params: z.object({
        id: z.string().min(1, 'Teacher ID is required'),
    }),
    body: z.object({
        // User fields
        name: z.string().min(2).max(100).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),

        // Professional info
        bio: z.string().max(1000).optional().nullable(),
        specialization: z.string().max(200).optional().nullable(),
        qualification: z.string().max(200).optional().nullable(),
        cnic: z.string().optional().nullable(),
        experience: z.coerce.number().min(0).optional().nullable(),
        salary: z.coerce.number().min(0).optional().nullable(),

        // ← Empty string from frontend becomes null before enum check
        employmentType: z.preprocess(
            val => (val === '' ? null : val),
            z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT']).optional().nullable()
        ),
        joiningDate: z.string().optional().nullable(),

        // Personal info
        dateOfBirth: z.string().optional().nullable(),

        // ← Same fix for gender
        gender: z.preprocess(
            val => (val === '' ? null : val),
            z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable()
        ),
        phoneSecondary: z.string().optional().nullable(),
        address: z.string().max(500).optional().nullable(),

        // ← Same fix for bloodGroup
        bloodGroup: z.preprocess(
            val => (val === '' ? null : val),
            z.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).optional().nullable()
        ),
        medicalConditions: z.string().max(1000).optional().nullable(),

        // Emergency contact
        emergencyContactName: z.string().max(100).optional().nullable(),
        emergencyContactPhone: z.string().optional().nullable(),
        emergencyContactRelation: z.string().max(100).optional().nullable(),

        // Bank details
        bankName: z.string().max(200).optional().nullable(),
        accountNumber: z.string().optional().nullable(),
        iban: z.string().optional().nullable(),
    }),
};

const updateStudentSchema = {
    params: z.object({
        id: z.string().min(1, 'Student ID is required'),
    }),
    body: z.object({
        // User fields
        name: z.string().min(2).max(100).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),

        // Personal info
        dateOfBirth: z.string().optional().nullable(),
        gender: z.preprocess(
            val => (val === '' ? null : val),
            z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable()
        ),
        placeOfBirth: z.string().max(200).optional().nullable(),
        nationality: z.string().max(100).optional().nullable(),
        religion: z.string().max(100).optional().nullable(),
        bloodGroup: z.preprocess(
            val => (val === '' ? null : val),
            z.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).optional().nullable()
        ),

        // Guardian info
        guardianName: z.string().max(100).optional(),
        guardianPhone: z.string().optional(),
        guardianRelation: z.string().max(100).optional().nullable(),
        guardianEmail: z.string().email().optional().nullable(),
        guardianOccupation: z.string().max(200).optional().nullable(),
        guardianCNIC: z.string().optional().nullable(),

        // Contact info
        address: z.string().max(500).optional(),
        city: z.string().max(100).optional(),
        province: z.string().max(100).optional(),
        postalCode: z.string().max(20).optional().nullable(),

        // Medical info
        medicalConditions: z.string().max(1000).optional().nullable(),
        allergies: z.string().max(1000).optional().nullable(),
        medication: z.string().max(1000).optional().nullable(),
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