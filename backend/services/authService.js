// services/authService.js — Business logic extracted from authController
// Controllers call these methods, keeping them thin request/response handlers.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db/prismaClient');
const config = require('../config/config');
const logger = require('../utils/logger');
const { invalidateUserCache } = require('../middlewares/auth');

const JWT_SECRET = config.JWT_SECRET;
const SALT_ROUNDS = 12;

/**
 * Common select fields for user profile (never includes passwordHash)
 */
const USER_PROFILE_SELECT = {
    id: true,
    email: true,
    name: true,
    phone: true,
    role: true,
    profileImage: true,
    status: true,
    isOnline: true,
    forcePasswordReset: true,
    passwordChangedAt: true,
    createdAt: true,
    updatedAt: true,
};

/**
 * Generate JWT token for a user
 */
function generateToken(user, expiresIn = '24h') {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        pwdChangedAt: user.passwordChangedAt
            ? Math.floor(new Date(user.passwordChangedAt).getTime() / 1000)
            : null,
        forceReset: user.forcePasswordReset || false,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Authenticate user by email and password.
 * Returns { user, token } on success.
 * Throws AppError on failure.
 */
async function authenticateUser(email, password) {
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            teacherProfile: true,
            studentProfile: {
                include: {
                    currentEnrollment: {
                        include: { classRoom: true }
                    }
                }
            },
            parentProfile: true,
        },
    });

    if (!user) {
        return { error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    if (user.status !== 'ACTIVE') {
        return {
            error: 'ACCOUNT_INACTIVE',
            message: `Account is ${user.status.toLowerCase()}. Please contact administrator.`,
            status: user.status,
        };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
        return { error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    // Update online status
    await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, updatedAt: new Date() },
    });

    const token = generateToken(user);

    // Build safe response (no passwordHash)
    const {
        passwordHash: _hash,
        passwordResetToken: _token,
        passwordResetExpires: _expires,
        ...safeUser
    } = user;

    return {
        user: { ...safeUser, isOnline: true },
        token,
        requiresPasswordChange: user.forcePasswordReset || false,
    };
}

/**
 * Hash a password with bcrypt
 */
async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Validate password strength
 */
function validatePasswordStrength(password) {
    const requirements = {
        minLength: 8,
        maxLength: 128,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumbers: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const valid =
        password.length >= requirements.minLength &&
        password.length <= requirements.maxLength &&
        requirements.hasUppercase &&
        requirements.hasLowercase &&
        requirements.hasNumbers;

    return { valid, requirements };
}

/**
 * Change user password, invalidates Redis cache.
 * Returns { success } or { error, message }.
 */
async function changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return { error: 'USER_NOT_FOUND', message: 'User not found' };
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
        return { error: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect' };
    }

    const isOld = await bcrypt.compare(newPassword, user.passwordHash);
    if (isOld) {
        return { error: 'PASSWORD_REUSE', message: 'New password cannot be the same as old password' };
    }

    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
        where: { id: userId },
        data: {
            passwordHash: newHash,
            passwordChangedAt: new Date(),
            forcePasswordReset: false,
            updatedAt: new Date(),
        },
    });

    await invalidateUserCache(userId);
    logger.info({ userId }, 'Password changed');

    return { success: true };
}

/**
 * Reset user password (admin action), invalidates Redis cache.
 */
async function resetPassword(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return { error: 'USER_NOT_FOUND', message: 'User not found' };
    }

    const { generateStrongPassword } = require('../utils/passwordGenerator');
    const newPassword = generateStrongPassword();
    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
        where: { id: userId },
        data: {
            passwordHash: newHash,
            passwordChangedAt: new Date(),
            forcePasswordReset: true,
        },
    });

    await invalidateUserCache(userId);
    logger.info({ userId, email: user.email }, 'Password reset by admin');

    return { email: user.email, newPassword };
}

/**
 * Terminate a user account, invalidates Redis cache.
 */
async function terminateAccount(userId, adminId, reason) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return { error: 'USER_NOT_FOUND', message: 'User not found' };
    }

    if (userId === adminId) {
        return { error: 'SELF_TERMINATION', message: 'Cannot terminate your own account' };
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            status: 'TERMINATED',
            isOnline: false,
            forcePasswordReset: true,
            updatedAt: new Date(),
        },
    });

    await invalidateUserCache(userId);
    logger.info({ userId, email: user.email, adminId, reason: reason || 'Not specified' }, 'User account terminated');

    return {
        terminatedUser: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
    };
}

/**
 * Reactivate a user account, invalidates Redis cache.
 */
async function reactivateAccount(userId, shouldResetPassword = false) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return { error: 'USER_NOT_FOUND', message: 'User not found' };
    }

    const updateData = { status: 'ACTIVE', updatedAt: new Date() };

    if (shouldResetPassword) {
        const { generateStrongPassword } = require('../utils/passwordGenerator');
        const newPassword = generateStrongPassword();
        updateData.passwordHash = await hashPassword(newPassword);
        updateData.passwordChangedAt = new Date();
        updateData.forcePasswordReset = true;
    }

    await prisma.user.update({ where: { id: userId }, data: updateData });
    await invalidateUserCache(userId);
    logger.info({ userId }, 'User account reactivated');

    return { success: true, passwordReset: shouldResetPassword };
}

module.exports = {
    authenticateUser,
    hashPassword,
    validatePasswordStrength,
    changePassword,
    resetPassword,
    terminateAccount,
    reactivateAccount,
    generateToken,
    USER_PROFILE_SELECT,
};
