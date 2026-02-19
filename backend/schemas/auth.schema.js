// schemas/auth.schema.js — Zod validation schemas for auth routes

const { z } = require('zod');

const loginSchema = {
    body: z.object({
        email: z.string().email('Valid email is required'),
        password: z.string().min(1, 'Password is required'),
    }),
};

const registerSchema = {
    body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters').max(100),
        email: z.string().email('Valid email is required'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        phone: z.string().optional(),
        role: z.enum(['TEACHER', 'STUDENT', 'PARENT', 'ADMIN']).optional(),
    }),
};

const changePasswordSchema = {
    body: z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z
            .string()
            .min(8, 'New password must be at least 8 characters')
            .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
            .regex(/[a-z]/, 'Must contain at least one lowercase letter')
            .regex(/[0-9]/, 'Must contain at least one number')
            .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    }),
};

const resetPasswordSchema = {
    params: z.object({
        userId: z.string().uuid('Valid user ID is required'),
    }),
};

const forgotPasswordSchema = {
    body: z.object({
        email: z.string().email('Valid email is required'),
    }),
};

module.exports = {
    loginSchema,
    registerSchema,
    changePasswordSchema,
    resetPasswordSchema,
    forgotPasswordSchema,
};
