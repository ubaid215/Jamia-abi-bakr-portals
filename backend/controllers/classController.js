const prisma = require('../db/prismaClient');

class ClassController {
  // Create new class
  async createClass(req, res) {
    try {
      const {
        name,
        grade,
        section,
        type,
        description,
        teacherId,
        capacity = 40
      } = req.body;

      // Validate required fields
      if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
      }

      // Validate class type
      const validTypes = ['REGULAR', 'NAZRA', 'HIFZ'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid class type' });
      }

      // Check if teacher exists (if provided)
      if (teacherId) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId }
  });
  if (!teacher) {
    return res.status(404).json({ error: 'Teacher not found' });
  }
}

      const classRoom = await prisma.classRoom.create({
        data: {
          name,
          grade,
          section,
          type,
          description,
          teacherId,
          lastRollNumber: 0
        },
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
          },
          subjects: true,
          enrollments: {
            include: {
              student: {
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
          }
        }
      });

      res.status(201).json({
        message: 'Class created successfully',
        class: classRoom
      });

    } catch (error) {
      console.error('Create class error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all classes with filtering
  async getClasses(req, res) {
    try {
      const { 
        type, 
        teacherId, 
        page = 1, 
        limit = 10,
        search 
      } = req.query;
      
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {};
      if (type) where.type = type;
      if (teacherId) where.teacherId = teacherId;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { grade: { contains: search, mode: 'insensitive' } },
          { section: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [classes, total] = await Promise.all([
        prisma.classRoom.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
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
            },
            _count: {
              select: {
                enrollments: true,
                subjects: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.classRoom.count({ where })
      ]);

      res.json({
        classes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get classes error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get class by ID with details
  async getClassById(req, res) {
    try {
      const { id } = req.params;

      const classRoom = await prisma.classRoom.findUnique({
        where: { id },
        include: {
          teacher: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          subjects: {
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
            }
          },
          enrollments: {
            where: { isCurrent: true },
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      phone: true
                    }
                  }
                }
              }
            },
            orderBy: { rollNumber: 'asc' }
          }
        }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class not found' });
      }

      res.json({ class: classRoom });

    } catch (error) {
      console.error('Get class error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update class information
  async updateClass(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        grade,
        section,
        type,
        description,
        teacherId
      } = req.body;

      // Check if class exists
      const existingClass = await prisma.classRoom.findUnique({
        where: { id }
      });

      if (!existingClass) {
        return res.status(404).json({ error: 'Class not found' });
      }

      // Check if teacher exists (if provided)
      if (teacherId) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId }
  });
  if (!teacher) {
    return res.status(404).json({ error: 'Teacher not found' });
  }
}

      const updatedClass = await prisma.classRoom.update({
        where: { id },
        data: {
          name: name || undefined,
          grade: grade || undefined,
          section: section || undefined,
          type: type || undefined,
          description: description || undefined,
          teacherId: teacherId || undefined
        },
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
          },
          subjects: true,
          _count: {
            select: {
              enrollments: true,
              subjects: true
            }
          }
        }
      });

      res.json({
        message: 'Class updated successfully',
        class: updatedClass
      });

    } catch (error) {
      console.error('Update class error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Assign teacher to class
async assignTeacher(req, res) {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }

    // Check if class exists
    const existingClass = await prisma.classRoom.findUnique({
      where: { id }
    });

    if (!existingClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check if teacher exists in Teacher table (not User table)
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Update class with Teacher.id (this matches the schema)
    const updatedClass = await prisma.classRoom.update({
      where: { id },
      data: { teacherId },
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
        },
        subjects: true,
        _count: {
          select: {
            enrollments: true,
            subjects: true
          }
        }
      }
    });

    res.json({
      message: 'Teacher assigned to class successfully',
      class: updatedClass
    });

  } catch (error) {
    console.error('Assign teacher error:', error);
    
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        error: 'Invalid teacher ID. Teacher record not found.' 
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}

  // Get students in a class
  async getClassStudents(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      // Check if class exists
      const classRoom = await prisma.classRoom.findUnique({
        where: { id }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class not found' });
      }

      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where: { 
            classRoomId: id,
            isCurrent: true 
          },
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    profileImage: true
                  }
                }
              }
            }
          },
          orderBy: { rollNumber: 'asc' }
        }),
        prisma.enrollment.count({
          where: { 
            classRoomId: id,
            isCurrent: true 
          }
        })
      ]);

      res.json({
        students: enrollments,
        class: {
          id: classRoom.id,
          name: classRoom.name,
          grade: classRoom.grade,
          section: classRoom.section,
          type: classRoom.type
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get class students error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete class (with safety checks)
  async deleteClass(req, res) {
    try {
      const { id } = req.params;

      // Check if class exists
      const existingClass = await prisma.classRoom.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              enrollments: true,
              subjects: true
            }
          }
        }
      });

      if (!existingClass) {
        return res.status(404).json({ error: 'Class not found' });
      }

      // Prevent deletion if class has students
      if (existingClass._count.enrollments > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete class with enrolled students. Please transfer students first.' 
        });
      }

      // Delete class (subjects will be handled by cascade delete in schema)
      await prisma.classRoom.delete({
        where: { id }
      });

      res.json({ message: 'Class deleted successfully' });

    } catch (error) {
      console.error('Delete class error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new ClassController();