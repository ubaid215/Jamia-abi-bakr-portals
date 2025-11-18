const bcrypt = require('bcryptjs');
const prisma = require('../db/prismaClient');

const saltRounds = 12;

class UserController {
  // Get all users (with filtering and pagination)
  async getUsers(req, res) {
    try {
      const { role, status, page = 1, limit = 10, search } = req.query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {};
      if (role) where.role = role;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Get users with pagination
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            phone: true,
            profileImage: true,
            isOnline: true,
            createdAt: true,
            updatedAt: true,
            teacherProfile: {
              select: {
                id: true,
                specialization: true,
                experience: true
              }
            },
            studentProfile: {
              select: {
                id: true,
                admissionNo: true
              }
            },
            parentProfile: {
              select: {
                id: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get user by ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
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

      // Exclude password
      const { passwordHash, ...userData } = user;
      res.json({ user: userData });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update user (admin only)
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, phone, role, profileImage, isOnline } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent role escalation (only super admin can create admins)
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        if (req.user.role !== 'SUPER_ADMIN') {
          return res.status(403).json({ error: 'Only Super Admin can assign admin roles' });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          name: name || undefined,
          phone: phone || undefined,
          role: role || undefined,
          profileImage: profileImage || undefined,
          isOnline: isOnline !== undefined ? isOnline : undefined
        },
        include: {
          teacherProfile: true,
          studentProfile: true,
          parentProfile: true
        }
      });

      // Exclude password
      const { passwordHash, ...userData } = updatedUser;
      res.json({ 
        message: 'User updated successfully', 
        user: userData 
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete user
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent deletion of super admins by non-super admins
      if (existingUser.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only Super Admin can delete other Super Admins' });
      }

      // Delete user (Prisma will handle cascading deletes based on schema)
      await prisma.user.delete({
        where: { id }
      });

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create user with specific role (admin function - for manual creation)
  async createUser(req, res) {
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

      // Check role permissions
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        if (req.user.role !== 'SUPER_ADMIN') {
          return res.status(403).json({ error: 'Only Super Admin can create admin users' });
        }
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

      // Exclude password from response
      const { passwordHash: _, ...userData } = user;

      res.status(201).json({
        message: 'User created successfully',
        user: userData
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new UserController();