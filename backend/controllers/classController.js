const prisma = require('../db/prismaClient');
const { generateRollNumber } = require('../utils/passwordGenerator');

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

  // ============================================
  // ROUTE CONFIGURATION (Add to your routes file):
  // router.post('/classes/enroll', classController.enrollStudent);
  // ============================================

  async enrollStudent(req, res) {
    try {
      console.log('🎓 [ENROLLMENT] Enroll student request received');
      console.log('📦 Full request body:', req.body);

      // Get both studentId and classId from request body
      const {
        studentId,  // ✅ Student ID from body (the student we're enrolling)
        classId,    // ✅ Class ID from body (the class we're enrolling them into)
        rollNumber,
        startDate,
        isCurrent = true,
        transferFromClassId
      } = req.body;

      console.log('➡️ Request Data:', {
        studentId,
        classId,
        rollNumber,
        startDate,
        isCurrent,
        transferFromClassId
      });

      // Validate required fields
      if (!studentId) {
        console.warn('⚠️ Student ID missing');
        return res.status(400).json({ error: 'Student ID is required' });
      }

      if (!classId) {
        console.warn('⚠️ Class ID missing');
        return res.status(400).json({ error: 'Class ID is required' });
      }

      // Check if student exists - try by student.id first
      console.log('🔍 Checking student existence...');
      let student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true
            }
          }
        }
      });

      // If not found by student.id, try by userId
      if (!student) {
        console.log('🔄 Trying to find student by userId...');
        student = await prisma.student.findFirst({
          where: { userId: studentId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true
              }
            }
          }
        });
      }

      if (!student) {
        console.warn(`❌ Student not found: ${studentId}`);
        return res.status(404).json({
          error: 'Student not found',
          studentId: studentId
        });
      }

      console.log('✅ Student found:', {
        id: student.id,
        userId: student.userId,
        name: student.user?.name,
        status: student.user?.status
      });

      // Check if class exists
      console.log('🔍 Checking class existence...');
      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classId }
      });

      if (!classRoom) {
        console.warn(`❌ Class not found: ${classId}`);
        return res.status(404).json({ error: 'Class not found' });
      }

      console.log('✅ Class found:', {
        id: classRoom.id,
        name: classRoom.name,
        grade: classRoom.grade,
        section: classRoom.section
      });

      // Check if student already enrolled in this class
      console.log('🔎 Checking existing enrollment...');
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: student.id,  // Use student.id, not the original studentId
          classRoomId: classId,
          isCurrent: true
        }
      });

      if (existingEnrollment) {
        console.warn('⚠️ Student already enrolled in this class');
        return res.status(400).json({
          error: 'Student is already enrolled in this class',
          enrollment: existingEnrollment
        });
      }

      // Handle transfer or previous enrollments
      if (transferFromClassId) {
        console.log('🔁 Transferring student from class:', transferFromClassId);
        await prisma.enrollment.updateMany({
          where: {
            studentId: student.id,
            classRoomId: transferFromClassId,
            isCurrent: true
          },
          data: {
            isCurrent: false,
            endDate: new Date()
          }
        });
      } else {
        console.log('🧹 Marking all previous enrollments as inactive');
        await prisma.enrollment.updateMany({
          where: {
            studentId: student.id,
            isCurrent: true
          },
          data: {
            isCurrent: false,
            endDate: new Date()
          }
        });
      }

      // Generate roll number if not provided
      let finalRollNumber = rollNumber;
      if (!finalRollNumber) {
        console.log('🔢 Generating roll number...');
        finalRollNumber = await generateRollNumber(classId);
        console.log('✅ Generated roll number:', finalRollNumber);
      }

      // Ensure roll number is an integer
      const rollNumberInt = Number(finalRollNumber);
      if (isNaN(rollNumberInt) || rollNumberInt <= 0) {
        console.error('❌ Invalid roll number:', finalRollNumber);
        return res.status(400).json({
          error: 'Invalid roll number generated',
          rollNumber: finalRollNumber
        });
      }

      // Create new enrollment
      console.log('📝 Creating enrollment...');
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: student.id,  // Use student.id
          classRoomId: classId,
          rollNumber: rollNumberInt,
          startDate: startDate ? new Date(startDate) : new Date(),
          isCurrent,
          endDate: null
        },
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
          },
          classRoom: {
            select: {
              id: true,
              name: true,
              grade: true,
              section: true,
              type: true
            }
          }
        }
      });

      console.log('✅ Enrollment created:', {
        enrollmentId: enrollment.id,
        rollNumber: enrollment.rollNumber,
        class: enrollment.classRoom?.name
      });

      // Update student's current enrollment reference
      console.log('🔗 Updating student current enrollment...');
      await prisma.student.update({
        where: { id: student.id },
        data: {
          currentEnrollmentId: enrollment.id
        }
      });

      // Update class lastRollNumber
      console.log('🔄 Updating class lastRollNumber...');
      await prisma.classRoom.update({
        where: { id: classId },
        data: {
          lastRollNumber: rollNumberInt
        }
      });

      console.log('🎉 Student enrolled successfully');

      res.status(201).json({
        message: 'Student enrolled successfully',
        enrollment,
        student: {
          id: student.id,
          userId: student.userId,
          name: student.user?.name,
          admissionNo: student.admissionNo
        }
      });

    } catch (error) {
      console.error('🔥 [ENROLLMENT ERROR]', {
        message: error.message,
        stack: error.stack
      });

      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
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

  // Get subjects in a class
  async getClassSubjects(req, res) {
    try {
      const { id } = req.params;

      // Check if class exists
      const classRoom = await prisma.classRoom.findUnique({
        where: { id },
        include: {
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
          }
        }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class not found' });
      }

      res.json({
        success: true,
        data: classRoom.subjects
      });

    } catch (error) {
      console.error('Get class subjects error:', error);
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

  // NEW ENDPOINT: Generate roll number for a class
  async generateRollNumber(req, res) {
    try {
      const { id } = req.params;

      // Check if class exists
      const classRoom = await prisma.classRoom.findUnique({
        where: { id }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class not found' });
      }

      // Use the imported generateRollNumber function
      const rollNumber = await generateRollNumber(id);

      res.json({
        success: true,
        message: 'Roll number generated successfully',
        classId: id,
        className: classRoom.name,
        rollNumber,
        rollNumberString: rollNumber.toString() // Return as string for consistency
      });

    } catch (error) {
      console.error('Generate roll number error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate roll number',
        details: error.message
      });
    }
  }

  // NEW ENDPOINT: Generate multiple roll numbers (for bulk operations)
  async generateMultipleRollNumbers(req, res) {
    try {
      const { classId, count = 1 } = req.body;

      if (!classId) {
        return res.status(400).json({ error: 'Class ID is required' });
      }

      // Check if class exists
      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classId }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class not found' });
      }

      const rollNumbers = [];

      // Generate multiple roll numbers in a transaction
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < count; i++) {
          const rollNumber = await generateRollNumber(classId, tx);
          rollNumbers.push(rollNumber);
        }
      });

      res.json({
        success: true,
        message: `${rollNumbers.length} roll numbers generated successfully`,
        classId,
        className: classRoom.name,
        rollNumbers,
        totalGenerated: rollNumbers.length
      });

    } catch (error) {
      console.error('Generate multiple roll numbers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate roll numbers',
        details: error.message
      });
    }
  }

  // NEW ENDPOINT: Get next available roll number for a class
  async getNextRollNumber(req, res) {
    try {
      const { id } = req.params;

      // Check if class exists
      const classRoom = await prisma.classRoom.findUnique({
        where: { id }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class not found' });
      }

      // Get ALL roll numbers ever used in this class
      const allEnrollments = await prisma.enrollment.findMany({
        where: {
          classRoomId: id,
          rollNumber: { not: null }
        },
        select: { rollNumber: true },
        orderBy: { rollNumber: 'asc' }
      });

      // Parse all roll numbers as integers
      const allRollNumbers = allEnrollments
        .map(e => {
          const num = Number(e.rollNumber);
          return isNaN(num) ? null : num;
        })
        .filter(num => num !== null && num > 0)
        .sort((a, b) => a - b);

      // Find the next available number
      let nextRollNumber = 1;

      if (allRollNumbers.length > 0) {
        // Find gaps in ALL used numbers
        for (let i = 0; i <= Math.max(...allRollNumbers); i++) {
          if (!allRollNumbers.includes(i + 1)) {
            nextRollNumber = i + 1;
            break;
          }
        }

        // If no gaps found, use next number after highest
        if (nextRollNumber === 1) {
          nextRollNumber = Math.max(...allRollNumbers) + 1;
        }
      }

      res.json({
        success: true,
        classId: id,
        className: classRoom.name,
        nextRollNumber,
        nextRollNumberString: nextRollNumber.toString(),
        totalEnrollments: allEnrollments.length,
        currentLastRollNumber: classRoom.lastRollNumber || 0,
        description: nextRollNumber === 1
          ? "No enrollments yet. Starting with roll number 1."
          : `Next available roll number is ${nextRollNumber}`
      });

    } catch (error) {
      console.error('Get next roll number error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get next roll number',
        details: error.message
      });
    }
  }
}

module.exports = new ClassController();