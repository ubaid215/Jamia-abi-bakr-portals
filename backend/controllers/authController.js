const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db/prismaClient');
const { JWT_SECRET } = require('../middlewares/auth');

const saltRounds = 12;

class AuthController {
  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user with related profiles
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
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        return res.status(401).json({ 
          error: `Account is ${user.status.toLowerCase()}. Please contact administrator.` 
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update online status
      await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true }
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Prepare user data for response (exclude password)
      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage,
        status: user.status,
        isOnline: user.isOnline,
        teacherProfile: user.teacherProfile,
        studentProfile: user.studentProfile,
        parentProfile: user.parentProfile,
        createdAt: user.createdAt
      };

      res.json({
        message: 'Login successful',
        token,
        user: userData
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
        return res.status(400).json({ error: 'Email, password, name, and role are required' });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          phone: phone || null,
          role,
          profileImage: profileData?.profileImage || null
        },
        include: {
          teacherProfile: true,
          studentProfile: true,
          parentProfile: true
        }
      });

      // Generate token for the new user
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Prepare response data (exclude password)
      const { passwordHash: _, ...userData } = user;

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: userData
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Reset user password (admin function) - generates new password
async resetUserPassword(req, res) {
  try {
    const { userId } = req.params;
    const { generateStrongPassword } = require('../utils/passwordGenerator');

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new strong password
    const newPassword = generateStrongPassword();
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    res.json({
      message: 'Password reset successfully',
      credentials: {
        email: user.email,
        newPassword // Show only once after reset
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

  // Logout user
  async logout(req, res) {
    try {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { isOnline: false }
      });

      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
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
        return res.status(404).json({ error: 'User not found' });
      }

      // Exclude password from response
      const { passwordHash, ...userData } = user;
      res.json({ user: userData });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
          profileImage: profileImage || undefined
        },
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

      // Exclude password from response
      const { passwordHash, ...userData } = updatedUser;
      res.json({ 
        message: 'Profile updated successfully', 
        user: userData 
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Change password (for users to change their own password)
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: req.user.id },
        data: { passwordHash: newPasswordHash }
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AuthController();