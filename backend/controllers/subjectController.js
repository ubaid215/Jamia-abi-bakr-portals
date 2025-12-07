const prisma = require('../db/prismaClient');

class SubjectController {
  // Create new subject
  async createSubject(req, res) {
    try {
      const {
        name,
        code,
        classRoomId,
        teacherId,
      } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Prepare data object with correct field names
      const data = {
        name,
        code: code || null,
      };

      // Add classRoomId if provided
      if (classRoomId) {
        // Check if class exists
        const classRoom = await prisma.classRoom.findUnique({
          where: { id: classRoomId }
        });

        if (!classRoom) {
          return res.status(404).json({ error: 'Class room not found' });
        }

        data.classRoomId = classRoomId;
      }

      // Add teacherId if provided
      if (teacherId) {
        // Check if teacher exists
        const teacher = await prisma.teacher.findUnique({
          where: { id: teacherId }
        });

        if (!teacher) {
          return res.status(404).json({ error: 'Teacher not found' });
        }

        data.teacherId = teacherId;
      }

      console.log('Creating subject with data:', data);

      const subject = await prisma.subject.create({
        data,
        include: {
          classRoom: {
            select: {
              id: true,
              name: true,
              grade: true,
              type: true
            }
          },
          teacher: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      res.status(201).json({
        message: 'Subject created successfully',
        subject
      });

    } catch (error) {
      console.error('Create subject error:', error);
      
      // More detailed error logging
      if (error.code === 'P2003') {
        return res.status(400).json({ 
          error: 'Invalid foreign key. Check if class or teacher exists.' 
        });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all subjects with filtering
  async getSubjects(req, res) {
    try {
      const { 
        classRoomId, 
        teacherId,
        page = 1, 
        limit = 10,
        search 
      } = req.query;
      
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {};
      if (classRoomId) where.classRoomId = classRoomId;
      if (teacherId) where.teacherId = teacherId;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [subjects, total] = await Promise.all([
        prisma.subject.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            classRoom: {
              select: {
                id: true,
                name: true,
                grade: true,
                type: true
              }
            },
            teacher: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: { name: 'asc' }
        }),
        prisma.subject.count({ where })
      ]);

      res.json({
        subjects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get subjects error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get subjects for a specific class
  async getClassSubjects(req, res) {
    try {
      const { id } = req.params;

      // Check if class exists
      const classRoom = await prisma.classRoom.findUnique({
        where: { id }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class not found' });
      }

      const subjects = await prisma.subject.findMany({
        where: { classRoomId: id },
        include: {
          teacher: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      res.json({
        class: {
          id: classRoom.id,
          name: classRoom.name,
          grade: classRoom.grade,
          type: classRoom.type
        },
        subjects
      });

    } catch (error) {
      console.error('Get class subjects error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Assign teacher to subject
  async assignTeacherToSubject(req, res) {
    try {
      const { id } = req.params;
      const { teacherId } = req.body;

      if (!teacherId) {
        return res.status(400).json({ error: 'Teacher ID is required' });
      }

      // Check if subject exists
      const existingSubject = await prisma.subject.findUnique({
        where: { id }
      });

      if (!existingSubject) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      // Check if teacher exists
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }

      const updatedSubject = await prisma.subject.update({
        where: { id },
        data: { teacherId },
        include: {
          classRoom: {
            select: {
              id: true,
              name: true,
              grade: true
            }
          },
          teacher: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      res.json({
        message: 'Teacher assigned to subject successfully',
        subject: updatedSubject
      });

    } catch (error) {
      console.error('Assign teacher to subject error:', error);
      
      if (error.code === 'P2003') {
        return res.status(400).json({ 
          error: 'Invalid teacher ID. Teacher not found.' 
        });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update subject
  async updateSubject(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        code,
        teacherId,
        classRoomId
      } = req.body;

      // Check if subject exists
      const existingSubject = await prisma.subject.findUnique({
        where: { id }
      });

      if (!existingSubject) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      // Prepare update data
      const updateData = {};
      
      if (name !== undefined) updateData.name = name;
      if (code !== undefined) updateData.code = code;

      // Handle teacher update
      if (teacherId !== undefined) {
        if (teacherId) {
          // Check if teacher exists
          const teacher = await prisma.teacher.findUnique({
            where: { id: teacherId }
          });
          if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
          }
          updateData.teacherId = teacherId;
        } else {
          // Set to null to remove teacher assignment
          updateData.teacherId = null;
        }
      }

      // Handle class room update
      if (classRoomId !== undefined) {
        if (classRoomId) {
          // Check if class exists
          const classRoom = await prisma.classRoom.findUnique({
            where: { id: classRoomId }
          });
          if (!classRoom) {
            return res.status(404).json({ error: 'Class room not found' });
          }
          updateData.classRoomId = classRoomId;
        } else {
          // Set to null to remove class assignment
          updateData.classRoomId = null;
        }
      }

      const updatedSubject = await prisma.subject.update({
        where: { id },
        data: updateData,
        include: {
          classRoom: {
            select: {
              id: true,
              name: true,
              grade: true,
              type: true
            }
          },
          teacher: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      res.json({
        message: 'Subject updated successfully',
        subject: updatedSubject
      });

    } catch (error) {
      console.error('Update subject error:', error);
      
      if (error.code === 'P2003') {
        return res.status(400).json({ 
          error: 'Invalid foreign key. Check if class or teacher exists.' 
        });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete subject
  async deleteSubject(req, res) {
    try {
      const { id } = req.params;

      // Check if subject exists
      const existingSubject = await prisma.subject.findUnique({
        where: { id }
      });

      if (!existingSubject) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      await prisma.subject.delete({
        where: { id }
      });

      res.json({ message: 'Subject deleted successfully' });

    } catch (error) {
      console.error('Delete subject error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new SubjectController();