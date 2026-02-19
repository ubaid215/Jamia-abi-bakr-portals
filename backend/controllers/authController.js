const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db/prismaClient');
const config = require('../config/config');
const logger = require('../utils/logger');
const { invalidateUserCache } = require('../middlewares/auth');
const JWT_SECRET = config.JWT_SECRET;

const saltRounds = 12;

class AuthController {
  // Login user - Enhanced with password change tracking
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      // Find user with related profiles and security fields
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          teacherProfile: true,
          studentProfile: {
            include: {
              currentEnrollment: {
                include: {
                  classRoom: true
                }
              }
            }
          },
          parentProfile: true
        }
      });

      if (!user) {
        return res.status(401).json({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Check if user is active (BOTH active status and not terminated)
      if (user.status !== 'ACTIVE') {
        return res.status(403).json({
          error: `Account is ${user.status.toLowerCase()}. Please contact administrator.`,
          code: 'ACCOUNT_INACTIVE',
          status: user.status
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        // Optional: Track failed login attempts here
        return res.status(401).json({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Update online status and last login time
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isOnline: true,
          updatedAt: new Date()
        }
      });

      // Generate JWT token with additional security info
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        // Include password changed timestamp in token for validation
        pwdChangedAt: user.passwordChangedAt ? Math.floor(user.passwordChangedAt.getTime() / 1000) : null,
        // Include force password reset status
        forceReset: user.forcePasswordReset || false
      };

      const token = jwt.sign(
        tokenPayload,
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Prepare user data for response
      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage,
        status: user.status,
        isOnline: true,
        forcePasswordReset: user.forcePasswordReset || false,
        teacherProfile: user.teacherProfile,
        studentProfile: user.studentProfile,
        parentProfile: user.parentProfile,
        createdAt: user.createdAt
      };

      res.json({
        message: 'Login successful',
        token,
        user: userData,
        requiresPasswordChange: user.forcePasswordReset || false
      });
    } catch (error) {
      logger.error({ err: error }, 'Login error');
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Manual registration (for flexibility - uses provided credentials)
  async register(req, res) {
    try {
      const {
        email,
        password,
        name,
        phone,
        role,
        profileData
      } = req.body;

      // Validate required fields
      if (!email || !password || !name || !role) {
        return res.status(400).json({
          error: 'Email, password, name, and role are required',
          code: 'MISSING_FIELDS'
        });
      }

      // Validate role
      const validRoles = ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Invalid role specified',
          code: 'INVALID_ROLE',
          validRoles
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({
          error: 'User already exists with this email',
          code: 'USER_EXISTS'
        });
      }

      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          error: 'Password does not meet requirements',
          code: 'WEAK_PASSWORD',
          requirements: passwordValidation.requirements
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user with password change timestamp
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          phone: phone || null,
          role,
          profileImage: profileData?.profileImage || null,
          passwordChangedAt: new Date(),
          forcePasswordReset: role === 'STUDENT' || role === 'TEACHER'
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          profileImage: true,
          status: true,
          forcePasswordReset: true,
          passwordChangedAt: true,
          createdAt: true,
          teacherProfile: true,
          studentProfile: true,
          parentProfile: true,
        }
      });

      // Generate token for the new user
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        pwdChangedAt: user.passwordChangedAt ? Math.floor(user.passwordChangedAt.getTime() / 1000) : null,
        forceReset: user.forcePasswordReset || false
      };

      const token = jwt.sign(
        tokenPayload,
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // User data is already safe — passwordHash was never selected
      const userData = user;

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: userData,
        requiresPasswordChange: user.forcePasswordReset || false
      });

    } catch (error) {
      logger.error({ err: error }, 'Registration error');

      if (error.code === 'P2002') {
        return res.status(400).json({
          error: 'A user with this email already exists',
          code: 'DUPLICATE_EMAIL'
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Reset user password (admin function) - generates new password
  async resetUserPassword(req, res) {
    try {
      const { userId } = req.params;

      // Use optional chaining and default values
      const { forceLogout = true, notifyUser = false } = req.body || {};

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate new strong password
      const { generateStrongPassword } = require('../utils/passwordGenerator');
      const newPassword = generateStrongPassword();
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and invalidate cache
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          passwordChangedAt: new Date(),
          forcePasswordReset: true,
        }
      });

      // Invalidate Redis cache so stale auth data is not used
      await invalidateUserCache(userId);

      res.json({
        message: 'Password reset successfully',
        credentials: {
          email: user.email,
          newPassword // Show only once after reset
        }
      });

    } catch (error) {
      logger.error({ err: error }, 'Reset password error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Terminate user account (admin function)
  async terminateUserAccount(req, res) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Prevent terminating own account
      if (user.id === req.user.id) {
        return res.status(403).json({
          error: 'Cannot terminate your own account',
          code: 'SELF_TERMINATION_NOT_ALLOWED'
        });
      }

      // Prevent terminating super admin (only super admin can do this)
      if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          error: 'Only super admin can terminate another super admin',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Update user status to TERMINATED and force logout
      await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'TERMINATED',
          isOnline: false,
          forcePasswordReset: true, // Prevent any login attempts
          updatedAt: new Date()
        }
      });

      // Invalidate Redis cache immediately
      await invalidateUserCache(userId);

      logger.info(
        { userId, email: user.email, adminId: req.user.id, reason: reason || 'Not specified' },
        'User account terminated'
      );

      res.json({
        message: 'User account terminated successfully',
        code: 'ACCOUNT_TERMINATED',
        note: 'User can no longer login to the system',
        terminatedUser: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });

    } catch (error) {
      logger.error({ err: error }, 'Terminate user error');
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Reactivate user account (admin function)
  async reactivateUserAccount(req, res) {
    try {
      const { userId } = req.params;
      const { resetPassword = false } = req.body;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const updateData = {
        status: 'ACTIVE',
        updatedAt: new Date()
      };

      // If resetting password, generate new one
      if (resetPassword) {
        const { generateStrongPassword } = require('../utils/passwordGenerator');
        const newPassword = generateStrongPassword();
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        updateData.passwordHash = newPasswordHash;
        updateData.passwordChangedAt = new Date();
        updateData.forcePasswordReset = true;
      }

      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      // Invalidate Redis cache after status change
      await invalidateUserCache(userId);

      res.json({
        message: 'User account reactivated successfully',
        code: 'ACCOUNT_REACTIVATED',
        note: resetPassword ? 'User will need to reset password on next login' : 'User can login with existing credentials'
      });

    } catch (error) {
      logger.error({ err: error }, 'Reactivate user error');
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          isOnline: false,
          updatedAt: new Date()
        }
      });

      res.json({
        message: 'Logout successful',
        code: 'LOGOUT_SUCCESS'
      });
    } catch (error) {
      logger.error({ err: error }, 'Logout error');
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          profileImage: true,
          status: true,
          isOnline: true,
          forcePasswordReset: true,
          createdAt: true,
          updatedAt: true,
          teacherProfile: true,
          studentProfile: {
            include: {
              currentEnrollment: {
                include: {
                  classRoom: true
                }
              }
            }
          },
          parentProfile: true,
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // passwordHash was never fetched — safe by design
      res.json({
        user,
        code: 'PROFILE_FETCHED'
      });
    } catch (error) {
      logger.error({ err: error }, 'Get profile error');
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { name, phone, profileImage } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          name: name || undefined,
          phone: phone || undefined,
          profileImage: profileImage || undefined,
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          profileImage: true,
          status: true,
          isOnline: true,
          forcePasswordReset: true,
          createdAt: true,
          updatedAt: true,
          teacherProfile: true,
          studentProfile: {
            include: {
              currentEnrollment: {
                include: {
                  classRoom: true
                }
              }
            }
          },
          parentProfile: true,
        }
      });

      // passwordHash was never fetched — safe by design
      res.json({
        message: 'Profile updated successfully',
        user: updatedUser,
        code: 'PROFILE_UPDATED'
      });
    } catch (error) {
      logger.error({ err: error }, 'Update profile error');
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Enhanced Change Password (user changes own password)
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Current password and new password are required',
          code: 'MISSING_PASSWORDS'
        });
      }

      // Validate new password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          error: 'New password does not meet requirements',
          code: 'WEAK_PASSWORD',
          requirements: passwordValidation.requirements
        });
      }

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD'
        });
      }

      // Prevent reusing old passwords
      const isOldPassword = await bcrypt.compare(newPassword, user.passwordHash);
      if (isOldPassword) {
        return res.status(400).json({
          error: 'New password cannot be the same as old password',
          code: 'PASSWORD_REUSE_NOT_ALLOWED'
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password with timestamp and clear reset flag
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          passwordHash: newPasswordHash,
          passwordChangedAt: new Date(),
          forcePasswordReset: false,
          updatedAt: new Date()
        }
      });

      // Invalidate Redis cache so token validation picks up new passwordChangedAt
      await invalidateUserCache(req.user.id);

      res.json({
        message: 'Password changed successfully',
        code: 'PASSWORD_CHANGED',
        note: 'You may need to login again on other devices'
      });
    } catch (error) {
      logger.error({ err: error }, 'Change password error');
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Check session validity
  async checkSession(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          forcePasswordReset: true,
          isOnline: true,
          passwordChangedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'Session invalid - user not found',
          code: 'INVALID_SESSION'
        });
      }

      if (user.status !== 'ACTIVE') {
        return res.status(403).json({
          error: `Account is ${user.status.toLowerCase()}`,
          code: 'ACCOUNT_INACTIVE',
          status: user.status
        });
      }

      res.json({
        message: 'Session is valid',
        code: 'SESSION_VALID',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          forcePasswordReset: user.forcePasswordReset,
          isOnline: user.isOnline
        },
        requiresPasswordChange: user.forcePasswordReset || false
      });
    } catch (error) {
      logger.error({ err: error }, 'Check session error');
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Password strength validation helper
  validatePasswordStrength(password) {
    const requirements = {
      minLength: 8,
      maxLength: 128,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const valid = password.length >= requirements.minLength &&
      password.length <= requirements.maxLength &&
      requirements.hasUppercase &&
      requirements.hasLowercase &&
      requirements.hasNumbers;

    return {
      valid,
      requirements: {
        minLength: requirements.minLength,
        maxLength: requirements.maxLength,
        hasUppercase: requirements.hasUppercase,
        hasLowercase: requirements.hasLowercase,
        hasNumbers: requirements.hasNumbers,
        hasSpecialChar: requirements.hasSpecialChar
      }
    };
  }

  // Optional: Forgot password functionality
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email is required',
          code: 'MISSING_EMAIL'
        });
      }

      const user = await prisma.user.findUnique({
        where: { email }
      });

      // Always return success to prevent email enumeration attacks
      if (!user) {
        return res.json({
          message: 'If an account exists with this email, you will receive a password reset link',
          code: 'RESET_EMAIL_SENT'
        });
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        return res.status(403).json({
          error: `Account is ${user.status.toLowerCase()}. Please contact administrator.`,
          code: 'ACCOUNT_INACTIVE'
        });
      }

      // Generate reset token (expires in 1 hour)
      const resetToken = jwt.sign(
        { userId: user.id, action: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Save reset token to user (you would need to add this field to User model)
      // await prisma.user.update({
      //   where: { id: user.id },
      //   data: { 
      //     passwordResetToken: resetToken,
      //     passwordResetExpires: new Date(Date.now() + 3600000) // 1 hour
      //   }
      // });

      // Send email with reset link
      // await this.sendPasswordResetEmail(user.email, resetToken);

      res.json({
        message: 'If an account exists with this email, you will receive a password reset link',
        code: 'RESET_EMAIL_SENT'
      });

    } catch (error) {
      logger.error({ err: error }, 'Forgot password error');
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }
}

module.exports = new AuthController();