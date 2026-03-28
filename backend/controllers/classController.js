const prisma = require('../db/prismaClient');
const { generateRollNumber } = require('../utils/passwordGenerator');

// ─── Shared include fragments ─────────────────────────────────────────────────
// Keeps every query consistent and avoids copy-paste drift.

const teacherUserSelect = {
  select: { id: true, name: true, email: true }
};

const classTeachersInclude = {
  classTeachers: {
    include: {
      teacher: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } }
        }
      }
    },
    orderBy: { assignedAt: 'asc' }
  }
};

const classRoomFullInclude = {
  teacher: {
    include: { user: teacherUserSelect }
  },
  ...classTeachersInclude,
  subjects: true,
  enrollments: {
    include: {
      student: {
        include: { user: { select: { id: true, name: true, email: true } } }
      }
    }
  }
};

const classRoomListInclude = {
  teacher: {
    include: { user: teacherUserSelect }
  },
  ...classTeachersInclude,
  _count: {
    select: { enrollments: true, subjects: true }
  }
};

// ─── Valid class-teacher roles ────────────────────────────────────────────────
const VALID_CLASS_TEACHER_ROLES = ['CLASS_TEACHER', 'SUBJECT_TEACHER', 'CO_TEACHER'];

class ClassController {
  // ============================================================
  // CREATE CLASS
  // ============================================================
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

      if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
      }

      const validTypes = ['REGULAR', 'NAZRA', 'HIFZ'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid class type' });
      }

      if (teacherId) {
        const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
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
        include: classRoomFullInclude
      });

      // If a primary teacher is set, also add them to classTeachers as CLASS_TEACHER
      if (teacherId) {
        await prisma.classTeacher.upsert({
          where: { classRoomId_teacherId: { classRoomId: classRoom.id, teacherId } },
          create: {
            classRoomId: classRoom.id,
            teacherId,
            role: 'CLASS_TEACHER',
            assignedBy: req.user?.id
          },
          update: { role: 'CLASS_TEACHER' }
        });
      }

      res.status(201).json({ message: 'Class created successfully', class: classRoom });
    } catch (error) {
      console.error('Create class error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // GET ALL CLASSES
  // ============================================================
  async getClasses(req, res) {
    try {
      const { type, teacherId, page = 1, limit = 10, search } = req.query;
      const skip = (page - 1) * limit;

      const where = {};
      if (type) where.type = type;
      if (teacherId) {
        // Match either the primary teacher or any entry in classTeachers
        where.OR = [
          { teacherId },
          { classTeachers: { some: { teacherId } } }
        ];
      }
      if (search) {
        where.OR = [
          { name:    { contains: search, mode: 'insensitive' } },
          { grade:   { contains: search, mode: 'insensitive' } },
          { section: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [classes, total] = await Promise.all([
        prisma.classRoom.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          include: classRoomListInclude,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.classRoom.count({ where })
      ]);

      res.json({
        classes,
        pagination: {
          page:  parseInt(page),
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

  // ============================================================
  // GET CLASS BY ID
  // ============================================================
  async getClassById(req, res) {
    try {
      const { id } = req.params;

      const classRoom = await prisma.classRoom.findUnique({
        where: { id },
        include: {
          teacher: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } }
            }
          },
          ...classTeachersInclude,
          subjects: {
            include: {
              teacher: { include: { user: teacherUserSelect } }
            }
          },
          enrollments: {
            where: { isCurrent: true },
            include: {
              student: {
                include: {
                  user: { select: { id: true, name: true, email: true, phone: true } }
                }
              }
            },
            orderBy: { rollNumber: 'asc' }
          }
        }
      });

      if (!classRoom) return res.status(404).json({ error: 'Class not found' });

      res.json({ class: classRoom });
    } catch (error) {
      console.error('Get class error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // UPDATE CLASS
  // ============================================================
  async updateClass(req, res) {
    try {
      const { id } = req.params;
      const { name, grade, section, type, description, teacherId } = req.body;

      const existingClass = await prisma.classRoom.findUnique({ where: { id } });
      if (!existingClass) return res.status(404).json({ error: 'Class not found' });

      if (teacherId) {
        const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
      }

      const updatedClass = await prisma.classRoom.update({
        where: { id },
        data: {
          name:        name        || undefined,
          grade:       grade       || undefined,
          section:     section     || undefined,
          type:        type        || undefined,
          description: description || undefined,
          teacherId:   teacherId   || undefined
        },
        include: classRoomListInclude
      });

      // If primary teacher changed, reflect the change in classTeachers too
      if (teacherId && teacherId !== existingClass.teacherId) {
        await prisma.classTeacher.upsert({
          where: { classRoomId_teacherId: { classRoomId: id, teacherId } },
          create: {
            classRoomId: id,
            teacherId,
            role: 'CLASS_TEACHER',
            assignedBy: req.user?.id
          },
          update: { role: 'CLASS_TEACHER' }
        });
      }

      res.json({ message: 'Class updated successfully', class: updatedClass });
    } catch (error) {
      console.error('Update class error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // ASSIGN PRIMARY TEACHER (legacy single-teacher endpoint — kept for
  // backward compatibility; also syncs into classTeachers table)
  // ============================================================
  async assignTeacher(req, res) {
    try {
      const { id } = req.params;
      const { teacherId } = req.body;

      if (!teacherId) return res.status(400).json({ error: 'Teacher ID is required' });

      const existingClass = await prisma.classRoom.findUnique({ where: { id } });
      if (!existingClass) return res.status(404).json({ error: 'Class not found' });

      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        include: { user: teacherUserSelect }
      });
      if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

      // Update both the primary teacherId and classTeachers in one transaction
      const [updatedClass] = await prisma.$transaction([
        prisma.classRoom.update({
          where: { id },
          data: { teacherId },
          include: classRoomListInclude
        }),
        prisma.classTeacher.upsert({
          where: { classRoomId_teacherId: { classRoomId: id, teacherId } },
          create: {
            classRoomId: id,
            teacherId,
            role: 'CLASS_TEACHER',
            assignedBy: req.user?.id
          },
          update: { role: 'CLASS_TEACHER' }
        })
      ]);

      res.json({ message: 'Teacher assigned to class successfully', class: updatedClass });
    } catch (error) {
      console.error('Assign teacher error:', error);
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Invalid teacher ID. Teacher record not found.' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // ✅ NEW: ASSIGN MULTIPLE TEACHERS
  // Body: { teachers: [{ teacherId, role }] }
  // role must be one of: CLASS_TEACHER | SUBJECT_TEACHER | CO_TEACHER
  // Existing entries for teachers not in the list are left untouched.
  // ============================================================
  async assignTeachers(req, res) {
    try {
      const { id } = req.params;
      const { teachers } = req.body;

      if (!Array.isArray(teachers) || teachers.length === 0) {
        return res.status(400).json({ error: 'teachers must be a non-empty array' });
      }

      const classRoom = await prisma.classRoom.findUnique({ where: { id } });
      if (!classRoom) return res.status(404).json({ error: 'Class not found' });

      // Validate all roles and teacher IDs before writing anything
      const errors = [];
      const validatedTeachers = [];

      for (const entry of teachers) {
        const { teacherId, role = 'SUBJECT_TEACHER' } = entry;

        if (!teacherId) { errors.push('Every entry must have a teacherId'); continue; }

        if (!VALID_CLASS_TEACHER_ROLES.includes(role)) {
          errors.push(`Invalid role "${role}" for teacher ${teacherId}. Valid roles: ${VALID_CLASS_TEACHER_ROLES.join(', ')}`);
          continue;
        }

        const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
        if (!teacher) { errors.push(`Teacher not found: ${teacherId}`); continue; }

        validatedTeachers.push({ teacherId, role });
      }

      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }

      // Upsert each teacher in a transaction (skipDuplicates alone doesn't update role)
      await prisma.$transaction(
        validatedTeachers.map(({ teacherId, role }) =>
          prisma.classTeacher.upsert({
            where: { classRoomId_teacherId: { classRoomId: id, teacherId } },
            create: { classRoomId: id, teacherId, role, assignedBy: req.user?.id },
            update: { role, assignedBy: req.user?.id }
          })
        )
      );

      const updatedClass = await prisma.classRoom.findUnique({
        where: { id },
        include: classRoomListInclude
      });

      res.json({
        message: `${validatedTeachers.length} teacher(s) assigned successfully`,
        class: updatedClass
      });
    } catch (error) {
      console.error('Assign teachers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // ✅ NEW: GET ALL TEACHERS FOR A CLASS
  // Returns the classTeachers join table rows (not just the primary teacher)
  // ============================================================
  async getClassTeachers(req, res) {
    try {
      const { id } = req.params;

      const classRoom = await prisma.classRoom.findUnique({ where: { id } });
      if (!classRoom) return res.status(404).json({ error: 'Class not found' });

      const classTeachers = await prisma.classTeacher.findMany({
        where: { classRoomId: id },
        include: {
          teacher: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } }
            }
          }
        },
        orderBy: [
          { role: 'asc' },       // CLASS_TEACHER first alphabetically
          { assignedAt: 'asc' }
        ]
      });

      res.json({
        success: true,
        classId: id,
        totalTeachers: classTeachers.length,
        teachers: classTeachers
      });
    } catch (error) {
      console.error('Get class teachers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // ✅ NEW: UPDATE A SPECIFIC TEACHER'S ROLE IN A CLASS
  // PATCH /classes/:id/teachers/:teacherId
  // Body: { role }
  // ============================================================
  async updateClassTeacherRole(req, res) {
    try {
      const { id, teacherId } = req.params;
      const { role } = req.body;

      if (!role || !VALID_CLASS_TEACHER_ROLES.includes(role)) {
        return res.status(400).json({
          error: `Invalid role. Valid roles: ${VALID_CLASS_TEACHER_ROLES.join(', ')}`
        });
      }

      const existing = await prisma.classTeacher.findUnique({
        where: { classRoomId_teacherId: { classRoomId: id, teacherId } }
      });
      if (!existing) {
        return res.status(404).json({ error: 'Teacher is not assigned to this class' });
      }

      const updated = await prisma.classTeacher.update({
        where: { classRoomId_teacherId: { classRoomId: id, teacherId } },
        data: { role, assignedBy: req.user?.id },
        include: {
          teacher: { include: { user: teacherUserSelect } }
        }
      });

      res.json({ message: 'Teacher role updated successfully', classTeacher: updated });
    } catch (error) {
      console.error('Update class teacher role error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // ✅ NEW: REMOVE A TEACHER FROM A CLASS
  // DELETE /classes/:id/teachers/:teacherId
  // Removing the primary (CLASS_TEACHER) also clears ClassRoom.teacherId
  // ============================================================
  async removeClassTeacher(req, res) {
    try {
      const { id, teacherId } = req.params;

      const classRoom = await prisma.classRoom.findUnique({ where: { id } });
      if (!classRoom) return res.status(404).json({ error: 'Class not found' });

      const entry = await prisma.classTeacher.findUnique({
        where: { classRoomId_teacherId: { classRoomId: id, teacherId } }
      });
      if (!entry) {
        return res.status(404).json({ error: 'Teacher is not assigned to this class' });
      }

      const ops = [
        prisma.classTeacher.delete({
          where: { classRoomId_teacherId: { classRoomId: id, teacherId } }
        })
      ];

      // If this was the primary teacher, also clear ClassRoom.teacherId
      if (classRoom.teacherId === teacherId) {
        ops.push(
          prisma.classRoom.update({ where: { id }, data: { teacherId: null } })
        );
      }

      await prisma.$transaction(ops);

      res.json({ message: 'Teacher removed from class successfully' });
    } catch (error) {
      console.error('Remove class teacher error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // ENROLL STUDENT
  // ============================================================
  async enrollStudent(req, res) {
    try {
      console.log('🎓 [ENROLLMENT] Enroll student request received');
      console.log('📦 Full request body:', req.body);

      const {
        studentId,
        classId,
        rollNumber,
        startDate,
        isCurrent = true,
        transferFromClassId
      } = req.body;

      if (!studentId) return res.status(400).json({ error: 'Student ID is required' });
      if (!classId)   return res.status(400).json({ error: 'Class ID is required' });

      // Find student by student.id first, then by userId
      let student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { user: { select: { id: true, name: true, email: true, status: true } } }
      });

      if (!student) {
        student = await prisma.student.findFirst({
          where: { userId: studentId },
          include: { user: { select: { id: true, name: true, email: true, status: true } } }
        });
      }

      if (!student) {
        return res.status(404).json({ error: 'Student not found', studentId });
      }

      const classRoom = await prisma.classRoom.findUnique({ where: { id: classId } });
      if (!classRoom) return res.status(404).json({ error: 'Class not found' });

      const existingEnrollment = await prisma.enrollment.findFirst({
        where: { studentId: student.id, classRoomId: classId, isCurrent: true }
      });
      if (existingEnrollment) {
        return res.status(400).json({
          error: 'Student is already enrolled in this class',
          enrollment: existingEnrollment
        });
      }

      // Mark old enrollments inactive
      if (transferFromClassId) {
        await prisma.enrollment.updateMany({
          where: { studentId: student.id, classRoomId: transferFromClassId, isCurrent: true },
          data: { isCurrent: false, endDate: new Date() }
        });
      } else {
        await prisma.enrollment.updateMany({
          where: { studentId: student.id, isCurrent: true },
          data: { isCurrent: false, endDate: new Date() }
        });
      }

      let finalRollNumber = rollNumber;
      if (!finalRollNumber) finalRollNumber = await generateRollNumber(classId);

      const rollNumberInt = Number(finalRollNumber);
      if (isNaN(rollNumberInt) || rollNumberInt <= 0) {
        return res.status(400).json({ error: 'Invalid roll number generated', rollNumber: finalRollNumber });
      }

      const enrollment = await prisma.enrollment.create({
        data: {
          studentId:   student.id,
          classRoomId: classId,
          rollNumber:  rollNumberInt,
          startDate:   startDate ? new Date(startDate) : new Date(),
          isCurrent,
          endDate: null
        },
        include: {
          student: { include: { user: { select: { id: true, name: true, email: true } } } },
          classRoom: { select: { id: true, name: true, grade: true, section: true, type: true } }
        }
      });

      await prisma.student.update({
        where: { id: student.id },
        data: { currentEnrollmentId: enrollment.id }
      });

      await prisma.classRoom.update({
        where: { id: classId },
        data: { lastRollNumber: rollNumberInt }
      });

      res.status(201).json({
        message: 'Student enrolled successfully',
        enrollment,
        student: {
          id:          student.id,
          userId:      student.userId,
          name:        student.user?.name,
          admissionNo: student.admissionNo
        }
      });
    } catch (error) {
      console.error('🔥 [ENROLLMENT ERROR]', { message: error.message, stack: error.stack });
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  // ============================================================
  // GET CLASS STUDENTS
  // ============================================================
  async getClassStudents(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const classRoom = await prisma.classRoom.findUnique({ where: { id } });
      if (!classRoom) return res.status(404).json({ error: 'Class not found' });

      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where: { classRoomId: id, isCurrent: true },
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            student: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, phone: true, profileImage: true }
                }
              }
            }
          },
          orderBy: { rollNumber: 'asc' }
        }),
        prisma.enrollment.count({ where: { classRoomId: id, isCurrent: true } })
      ]);

      res.json({
        students: enrollments,
        class: { id: classRoom.id, name: classRoom.name, grade: classRoom.grade, section: classRoom.section, type: classRoom.type },
        pagination: {
          page:  parseInt(page),
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

  // ============================================================
  // GET CLASS SUBJECTS
  // ============================================================
  async getClassSubjects(req, res) {
    try {
      const { id } = req.params;

      const classRoom = await prisma.classRoom.findUnique({
        where: { id },
        include: {
          subjects: {
            include: {
              teacher: { include: { user: teacherUserSelect } }
            }
          }
        }
      });

      if (!classRoom) return res.status(404).json({ error: 'Class not found' });

      res.json({ success: true, data: classRoom.subjects });
    } catch (error) {
      console.error('Get class subjects error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // DELETE CLASS
  // ============================================================
  async deleteClass(req, res) {
    try {
      const { id } = req.params;

      const existingClass = await prisma.classRoom.findUnique({
        where: { id },
        include: { _count: { select: { enrollments: true, subjects: true } } }
      });

      if (!existingClass) return res.status(404).json({ error: 'Class not found' });

      if (existingClass._count.enrollments > 0) {
        return res.status(400).json({
          error: 'Cannot delete class with enrolled students. Please transfer students first.'
        });
      }

      await prisma.classRoom.delete({ where: { id } });

      res.json({ message: 'Class deleted successfully' });
    } catch (error) {
      console.error('Delete class error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // ROLL NUMBER UTILITIES
  // ============================================================
  async generateRollNumber(req, res) {
    try {
      const { id } = req.params;
      const classRoom = await prisma.classRoom.findUnique({ where: { id } });
      if (!classRoom) return res.status(404).json({ error: 'Class not found' });

      const rollNumber = await generateRollNumber(id);

      res.json({
        success: true,
        message: 'Roll number generated successfully',
        classId: id,
        className: classRoom.name,
        rollNumber,
        rollNumberString: rollNumber.toString()
      });
    } catch (error) {
      console.error('Generate roll number error:', error);
      res.status(500).json({ success: false, error: 'Failed to generate roll number', details: error.message });
    }
  }

  async generateMultipleRollNumbers(req, res) {
    try {
      const { classId, count = 1 } = req.body;
      if (!classId) return res.status(400).json({ error: 'Class ID is required' });

      const classRoom = await prisma.classRoom.findUnique({ where: { id: classId } });
      if (!classRoom) return res.status(404).json({ error: 'Class not found' });

      const rollNumbers = [];

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
      res.status(500).json({ success: false, error: 'Failed to generate roll numbers', details: error.message });
    }
  }

  async getNextRollNumber(req, res) {
    try {
      const { id } = req.params;
      const classRoom = await prisma.classRoom.findUnique({ where: { id } });
      if (!classRoom) return res.status(404).json({ error: 'Class not found' });

      const allEnrollments = await prisma.enrollment.findMany({
        where: { classRoomId: id, rollNumber: { not: null } },
        select: { rollNumber: true },
        orderBy: { rollNumber: 'asc' }
      });

      const allRollNumbers = allEnrollments
        .map(e => { const n = Number(e.rollNumber); return isNaN(n) ? null : n; })
        .filter(n => n !== null && n > 0)
        .sort((a, b) => a - b);

      let nextRollNumber = 1;

      if (allRollNumbers.length > 0) {
        for (let i = 0; i <= Math.max(...allRollNumbers); i++) {
          if (!allRollNumbers.includes(i + 1)) { nextRollNumber = i + 1; break; }
        }
        if (nextRollNumber === 1) nextRollNumber = Math.max(...allRollNumbers) + 1;
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
          ? 'No enrollments yet. Starting with roll number 1.'
          : `Next available roll number is ${nextRollNumber}`
      });
    } catch (error) {
      console.error('Get next roll number error:', error);
      res.status(500).json({ success: false, error: 'Failed to get next roll number', details: error.message });
    }
  }
}

module.exports = new ClassController();