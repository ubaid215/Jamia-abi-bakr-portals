const bcrypt = require('bcryptjs');
const prisma = require('../db/prismaClient');
const { generateStrongPassword, generateEmail, generateRollNumber } = require('../utils/passwordGenerator');
const fs = require('fs');
const path = require('path');


const saltRounds = 12;

class AdminController {
  // Create new admin (Super Admin only)
  async createAdmin(req, res) {
    try {
      const {
        name,
        phone
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Generate email and strong password
      const email = generateEmail(name, 'admin');
      const password = generateStrongPassword();

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return this.createAdmin(req, res);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create admin user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          phone: phone || null,
          role: 'ADMIN'
        }
      });

      // Exclude password from response
      const { passwordHash: _, ...userData } = user;

      res.status(201).json({
        message: 'Admin created successfully',
        credentials: {
          email: user.email,
          password // Show only once during creation
        },
        user: userData
      });

    } catch (error) {
      console.error('Create admin error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update user status (Super Admin only)
  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(status)) {
        return res.status(400).json({ error: 'Valid status is required' });
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent self-status change
      if (id === req.user.id) {
        return res.status(400).json({ error: 'Cannot change your own status' });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { status }
      });

      // Exclude password
      const { passwordHash, ...userData } = updatedUser;

      res.json({
        message: `User status updated to ${status} successfully`,
        user: userData
      });

    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get system statistics (Super Admin only)
  async getSystemStats(req, res) {
    try {
      const [
        totalUsers,
        totalTeachers,
        totalStudents,
        totalParents,
        activeUsers,
        inactiveUsers,
        terminatedUsers,
        totalClasses,
        totalSubjects,
        todayAttendance
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'TEACHER' } }),
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.user.count({ where: { role: 'PARENT' } }),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { status: 'INACTIVE' } }),
        prisma.user.count({ where: { status: 'TERMINATED' } }),
        prisma.classRoom.count(),
        prisma.subject.count(),
        // Today's attendance count
        (async () => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return await prisma.attendance.count({
            where: {
              date: {
                gte: today,
                lt: tomorrow
              }
            }
          });
        })()
      ]);

      // Get class type distribution
      const classTypeStats = await prisma.classRoom.groupBy({
        by: ['type'],
        _count: {
          id: true
        }
      });

      // Get recent activities
      const recentActivities = await prisma.attendance.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          },
          teacher: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          },
          classRoom: {
            select: {
              name: true
            }
          }
        }
      });

      res.json({
        stats: {
          totalUsers,
          byRole: {
            teachers: totalTeachers,
            students: totalStudents,
            parents: totalParents,
            admins: await prisma.user.count({ where: { role: 'ADMIN' } }),
            superAdmins: await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })
          },
          byStatus: {
            active: activeUsers,
            inactive: inactiveUsers,
            terminated: terminatedUsers
          },
          academic: {
            totalClasses,
            totalSubjects,
            classTypeDistribution: classTypeStats.reduce((acc, stat) => {
              acc[stat.type] = stat._count.id;
              return acc;
            }, {}),
            todayAttendance
          }
        },
        recentActivities: recentActivities.map(activity => ({
          type: 'ATTENDANCE',
          description: `${activity.teacher.user.name} marked ${activity.student.user.name} as ${activity.status} in ${activity.classRoom.name}`,
          timestamp: activity.createdAt
        }))
      });
    } catch (error) {
      console.error('Get system stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all teachers with details
  async getAllTeachers(req, res) {
    try {
      const { page = 1, limit = 10, search, status } = req.query;
      const skip = (page - 1) * limit;

      const where = {
        role: 'TEACHER'
      };

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [teachers, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            teacherProfile: {
              include: {
                classes: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                subjects: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                _count: {
                  select: {
                    leaveRequests: true,
                    attendances: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        teachers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get all teachers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get teacher details by ID
  async getTeacherDetails(req, res) {
    try {
      const { id } = req.params;

      const teacher = await prisma.teacher.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profileImage: true,
              status: true,
              createdAt: true
            }
          },
          classes: {
            include: {
              _count: {
                select: {
                  enrollments: {
                    where: { isCurrent: true }
                  }
                }
              }
            }
          },
          subjects: {
            include: {
              classRoom: {
                select: {
                  name: true
                }
              }
            }
          },
          leaveRequests: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          attendances: {
            orderBy: { date: 'desc' },
            take: 10,
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      name: true
                    }
                  }
                }
              },
              classRoom: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }

      // Calculate teacher statistics
      const totalStudents = teacher.classes.reduce((sum, cls) => sum + cls._count.enrollments, 0);
      const totalAttendanceMarked = await prisma.attendance.count({
        where: { teacherId: teacher.id }
      });

      const pendingLeaveRequests = teacher.leaveRequests.filter(lr => lr.status === 'PENDING').length;

      res.json({
        teacher: teacher.user,
        profile: {
          bio: teacher.bio,
          specialization: teacher.specialization,
          experience: teacher.experience,
          qualification: teacher.qualification,
          joiningDate: teacher.joiningDate,
          salary: teacher.salary,
          employmentType: teacher.employmentType
        },
        assignments: {
          classes: teacher.classes,
          subjects: teacher.subjects
        },
        statistics: {
          totalClasses: teacher.classes.length,
          totalSubjects: teacher.subjects.length,
          totalStudents,
          totalAttendanceMarked,
          pendingLeaveRequests
        },
        recentActivities: {
          leaveRequests: teacher.leaveRequests,
          attendanceMarked: teacher.attendances
        }
      });

    } catch (error) {
      console.error('Get teacher details error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update teacher details
  async updateTeacher(req, res) {
    try {
      const { id } = req.params; // This can be teacherId or userId
      const {
        name,
        email,
        phone,
        status,
        bio,
        specialization,
        qualification,
        cnic,
        experience,
        joiningDate,
        salary,
        employmentType
      } = req.body;

      console.log(`✏️ [Update Teacher] Request for ID: ${id}`);

      // Find teacher
      let teacher = await prisma.teacher.findFirst({
        where: { userId: id },
        include: {
          user: true
        }
      });

      // If not found by userId, try by teacher.id
      if (!teacher) {
        console.log(`🔍 Not found by userId, trying teacher.id: ${id}`);
        teacher = await prisma.teacher.findUnique({
          where: { id },
          include: {
            user: true
          }
        });
      }

      if (!teacher) {
        console.log(`❌ Teacher not found with ID: ${id}`);
        return res.status(404).json({ error: 'Teacher not found' });
      }

      console.log(`✅ Teacher found: ${teacher.user.name}`);

      // Prepare update data for User
      const userUpdateData = {};
      if (name) userUpdateData.name = name;
      if (email) {
        // Check if email is already taken by another user
        const existingUser = await prisma.user.findFirst({
          where: {
            email,
            NOT: { id: teacher.userId }
          }
        });
        if (existingUser) {
          return res.status(400).json({ error: 'Email already in use' });
        }
        userUpdateData.email = email;
      }
      if (phone) userUpdateData.phone = phone;
      if (status && ['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(status)) {
        userUpdateData.status = status;
      }

      // Prepare update data for Teacher
      const teacherUpdateData = {};
      if (bio !== undefined) teacherUpdateData.bio = bio;
      if (specialization) teacherUpdateData.specialization = specialization;
      if (qualification) teacherUpdateData.qualification = qualification;
      if (cnic) teacherUpdateData.cnic = cnic;
      if (experience !== undefined) teacherUpdateData.experience = parseFloat(experience);
      if (joiningDate) teacherUpdateData.joiningDate = new Date(joiningDate);
      if (salary !== undefined) teacherUpdateData.salary = parseFloat(salary);
      if (employmentType && ['FULL_TIME', 'PART_TIME', 'CONTRACT'].includes(employmentType)) {
        teacherUpdateData.employmentType = employmentType;
      }

      // Update in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update User
        let updatedUser = teacher.user;
        if (Object.keys(userUpdateData).length > 0) {
          updatedUser = await tx.user.update({
            where: { id: teacher.userId },
            data: userUpdateData
          });
        }

        // Update Teacher
        let updatedTeacher = teacher;
        if (Object.keys(teacherUpdateData).length > 0) {
          updatedTeacher = await tx.teacher.update({
            where: { id: teacher.id },
            data: teacherUpdateData
          });
        }

        return {
          user: updatedUser,
          teacher: updatedTeacher
        };
      });

      // Exclude password hash from response
      const { passwordHash, ...userWithoutPassword } = result.user;

      console.log(`✅ Teacher updated successfully: ${result.user.name}`);

      res.json({
        message: 'Teacher updated successfully',
        teacher: {
          ...userWithoutPassword,
          profile: {
            bio: result.teacher.bio,
            specialization: result.teacher.specialization,
            qualification: result.teacher.qualification,
            cnic: result.teacher.cnic,
            experience: result.teacher.experience,
            joiningDate: result.teacher.joiningDate,
            salary: result.teacher.salary,
            employmentType: result.teacher.employmentType
          }
        }
      });

    } catch (error) {
      console.error('❌ Update teacher error:', error);
      res.status(500).json({
        error: 'Failed to update teacher',
        details: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }

  // Get all students with details
  async getAllStudents(req, res) {
    try {
      const { page = 1, limit = 10, search, status, classRoomId, classType } = req.query;
      const skip = (page - 1) * limit;

      const where = {
        role: 'STUDENT'
      };

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [students, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            studentProfile: {
              include: {
                currentEnrollment: {
                  include: {
                    classRoom: {
                      select: {
                        id: true,
                        name: true,
                        grade: true,
                        type: true
                      }
                    }
                  }
                },
                parents: {
                  include: {
                    user: {
                      select: {
                        name: true,
                        email: true
                      }
                    }
                  }
                },
                _count: {
                  select: {
                    attendances: true,
                    hifzProgress: true,
                    nazraProgress: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      // Filter by class room if specified
      let filteredStudents = students;
      if (classRoomId) {
        filteredStudents = students.filter(student =>
          student.studentProfile?.currentEnrollment?.classRoomId === classRoomId
        );
      }

      if (classType) {
        filteredStudents = filteredStudents.filter(student =>
          student.studentProfile?.currentEnrollment?.classRoom?.type === classType
        );
      }

      res.json({
        students: filteredStudents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredStudents.length,
          pages: Math.ceil(filteredStudents.length / limit)
        }
      });

    } catch (error) {
      console.error('Get all students error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }


  // Update student details
  async updateStudent(req, res) {
    try {
      const { id } = req.params; // This can be studentId or userId
      const {
        name,
        email,
        phone,
        status,
        dateOfBirth,
        gender,
        guardianName,
        guardianPhone,
        address,
        city,
        province
      } = req.body;

      console.log(`✏️ [Update Student] Request for ID: ${id}`);

      // Find student
      let student = await prisma.student.findFirst({
        where: { userId: id },
        include: {
          user: true
        }
      });

      // If not found by userId, try by student.id
      if (!student) {
        console.log(`🔍 Not found by userId, trying student.id: ${id}`);
        student = await prisma.student.findUnique({
          where: { id },
          include: {
            user: true
          }
        });
      }

      if (!student) {
        console.log(`❌ Student not found with ID: ${id}`);
        return res.status(404).json({ error: 'Student not found' });
      }

      console.log(`✅ Student found: ${student.user.name} (Admission No: ${student.admissionNo})`);

      // Prepare update data for User
      const userUpdateData = {};
      if (name) userUpdateData.name = name;
      if (email) {
        // Check if email is already taken by another user
        const existingUser = await prisma.user.findFirst({
          where: {
            email,
            NOT: { id: student.userId }
          }
        });
        if (existingUser) {
          return res.status(400).json({ error: 'Email already in use' });
        }
        userUpdateData.email = email;
      }
      if (phone) userUpdateData.phone = phone;
      if (status && ['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(status)) {
        userUpdateData.status = status;
      }

      // Prepare update data for Student
      const studentUpdateData = {};
      if (dateOfBirth) studentUpdateData.dob = new Date(dateOfBirth);
      if (gender && ['MALE', 'FEMALE', 'OTHER'].includes(gender)) studentUpdateData.gender = gender;
      if (guardianName) studentUpdateData.guardianName = guardianName;
      if (guardianPhone) studentUpdateData.guardianPhone = guardianPhone;
      if (address) studentUpdateData.address = address;
      if (city) studentUpdateData.city = city;
      if (province) studentUpdateData.province = province;

      // Update in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update User
        let updatedUser = student.user;
        if (Object.keys(userUpdateData).length > 0) {
          updatedUser = await tx.user.update({
            where: { id: student.userId },
            data: userUpdateData
          });
        }

        // Update Student
        let updatedStudent = student;
        if (Object.keys(studentUpdateData).length > 0) {
          updatedStudent = await tx.student.update({
            where: { id: student.id },
            data: studentUpdateData
          });
        }

        return {
          user: updatedUser,
          student: updatedStudent
        };
      });

      // Exclude password hash from response
      const { passwordHash, ...userWithoutPassword } = result.user;

      console.log(`✅ Student updated successfully: ${result.user.name}`);

      res.json({
        message: 'Student updated successfully',
        student: {
          ...userWithoutPassword,
          profile: {
            admissionNo: result.student.admissionNo,
            dateOfBirth: result.student.dob,
            gender: result.student.gender,
            guardianName: result.student.guardianName,
            guardianPhone: result.student.guardianPhone,
            address: result.student.address,
            city: result.student.city,
            province: result.student.province
          }
        }
      });

    } catch (error) {
      console.error('❌ Update student error:', error);
      res.status(500).json({
        error: 'Failed to update student',
        details: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }

  // Get student details by ID
 async getStudentDetails(req, res) {
  try {
    console.log('👤 [STUDENT DETAILS] Request received');

    const { id } = req.params;
    console.log('➡️ Requested ID:', id);

    console.log('🔍 Fetching student by ID...');
    const student = await prisma.student.findUnique({
      where: { userId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profileImage: true,
            status: true,
            createdAt: true
          }
        },
        currentEnrollment: {
          include: {
            classRoom: {
              include: {
                teacher: {
                  include: {
                    user: {
                      select: {
                        name: true,
                        email: true
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
                            name: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        enrollments: {
          include: {
            classRoom: {
              select: {
                id: true,
                name: true,
                grade: true,
                type: true
              }
            }
          },
          orderBy: { startDate: 'desc' }
        },
        parents: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        attendances: {
          orderBy: { date: 'desc' },
          take: 20,
          include: {
            subject: { select: { name: true } },
            classRoom: { select: { name: true } },
            teacher: {
              include: {
                user: { select: { name: true } }
              }
            }
          }
        }
      }
    });

    if (!student) {
      console.warn('❌ Student not found for ID:', id);
      console.warn('💡 Possible cause: USER ID sent instead of STUDENT ID');
      return res.status(404).json({ error: 'Student not found' });
    }

    console.log('✅ Student found:', {
      studentId: student.id,
      userId: student.user?.id,
      name: student.user?.name
    });

    // =========================
    // Progress Handling
    // =========================
    let progressData = {};

    if (student.currentEnrollment) {
      const classType = student.currentEnrollment.classRoom.type;
      console.log('📘 Current class type:', classType);

      if (classType === 'HIFZ') {
        console.log('📖 Fetching HIFZ progress...');
        const hifzProgress = await prisma.hifzProgress.findMany({
          where: { studentId: student.id },
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            teacher: {
              include: {
                user: { select: { name: true } }
              }
            }
          }
        });

        const completionStats = await this.calculateHifzCompletion(student.id);

        console.log('✅ HIFZ progress fetched:', {
          records: hifzProgress.length
        });

        progressData = {
          type: 'HIFZ',
          progress: hifzProgress,
          completionStats
        };

      } else if (classType === 'NAZRA') {
        console.log('📖 Fetching NAZRA progress...');
        const nazraProgress = await prisma.nazraProgress.findMany({
          where: { studentId: student.id },
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            teacher: {
              include: {
                user: { select: { name: true } }
              }
            }
          }
        });

        const completionStats = await this.calculateNazraCompletion(student.id);

        console.log('✅ NAZRA progress fetched:', {
          records: nazraProgress.length
        });

        progressData = {
          type: 'NAZRA',
          progress: nazraProgress,
          completionStats
        };

      } else if (classType === 'REGULAR') {
        console.log('📖 Fetching REGULAR assessments...');
        const assessments = await prisma.subjectProgress.findMany({
          where: { studentId: student.id },
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            subject: { select: { name: true } },
            teacher: {
              include: {
                user: { select: { name: true } }
              }
            }
          }
        });

        const averageResult = await prisma.subjectProgress.aggregate({
          where: { studentId: student.id },
          _avg: { percentage: true }
        });

        console.log('✅ REGULAR progress fetched:', {
          records: assessments.length,
          average: averageResult._avg.percentage
        });

        progressData = {
          type: 'REGULAR',
          assessments,
          averagePercentage: Math.round((averageResult._avg.percentage || 0) * 100) / 100
        };
      }
    } else {
      console.warn('⚠️ Student has no current enrollment');
    }

    // =========================
    // Attendance Stats
    // =========================
    const totalAttendance = student.attendances.length;
    const presentAttendance = student.attendances.filter(
      a => a.status === 'PRESENT' || a.status === 'LATE'
    ).length;

    const attendancePercentage = totalAttendance > 0
      ? (presentAttendance / totalAttendance) * 100
      : 0;

    console.log('📊 Attendance stats:', {
      total: totalAttendance,
      present: presentAttendance,
      percentage: attendancePercentage
    });

    console.log('📤 Sending student details response');

    res.json({
      student: student.user,
      profile: {
        admissionNo: student.admissionNo,
        dateOfBirth: student.dob,
        gender: student.gender,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        address: student.address
      },
      academic: {
        currentEnrollment: student.currentEnrollment,
        classHistory: student.enrollments,
        attendance: {
          total: totalAttendance,
          present: presentAttendance,
          percentage: Math.round(attendancePercentage * 100) / 100,
          recent: student.attendances
        }
      },
      progress: progressData,
      parents: student.parents
    });

  } catch (error) {
    console.error('🔥 [GET STUDENT DETAILS ERROR]', {
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({ error: 'Internal server error' });
  }
}

  // ============================================
  // CLASS ASSIGNMENT METHODS
  // ============================================

  // Assign teacher to class
  async assignTeacherToClass(req, res) {
    try {
      const { teacherId, classRoomId } = req.body;

      if (!teacherId || !classRoomId) {
        return res.status(400).json({ error: 'Teacher ID and Class Room ID are required' });
      }

      // Check if teacher exists
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

      // Check if class exists
      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class not found' });
      }

      // Update class with teacher
      const updatedClass = await prisma.classRoom.update({
        where: { id: classRoomId },
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
          _count: {
            select: {
              enrollments: true,
              subjects: true
            }
          }
        }
      });

      res.json({
        message: `Teacher ${teacher.user.name} assigned to ${classRoom.name} successfully`,
        class: updatedClass
      });

    } catch (error) {
      console.error('Assign teacher to class error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Assign student to class (enroll student)
  async assignStudentToClass(req, res) {
    try {
      const { studentId, classRoomId, startDate } = req.body;

      console.log('📝 Assigning student to class:', { studentId, classRoomId });

      if (!studentId || !classRoomId) {
        return res.status(400).json({ error: 'Student ID and Class Room ID are required' });
      }

      // Find student by userId or studentId
      let student = await prisma.student.findFirst({
        where: { userId: studentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          currentEnrollment: {
            include: {
              classRoom: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!student) {
        student = await prisma.student.findUnique({
          where: { id: studentId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            currentEnrollment: {
              include: {
                classRoom: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        });
      }

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Check if class exists
      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class not found' });
      }

      // Check if student already has a current enrollment
      if (student.currentEnrollment) {
        // If already enrolled in the same class
        if (student.currentEnrollment.classRoomId === classRoomId) {
          return res.status(400).json({
            error: 'Student is already enrolled in this class',
            currentEnrollment: student.currentEnrollment
          });
        }

        // End current enrollment
        await prisma.enrollment.update({
          where: { id: student.currentEnrollment.id },
          data: {
            isCurrent: false,
            endDate: new Date()
          }
        });

        console.log('✅ Ended previous enrollment');
      }

      // Generate new roll number
      const newRollNumber = await generateRollNumber(classRoomId, prisma);
      const rollNumberInt = Number(newRollNumber);

      console.log('🔢 Generated roll number:', rollNumberInt);

      // Create new enrollment
      const newEnrollment = await prisma.enrollment.create({
        data: {
          studentId: student.id,
          classRoomId: classRoomId,
          rollNumber: rollNumberInt,
          isCurrent: true,
          startDate: startDate ? new Date(startDate) : new Date()
        },
        include: {
          classRoom: {
            select: {
              id: true,
              name: true,
              grade: true,
              section: true,
              type: true
            }
          },
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
      });

      // Update student's current enrollment
      await prisma.student.update({
        where: { id: student.id },
        data: { currentEnrollmentId: newEnrollment.id }
      });

      console.log('✅ Student assigned to class successfully');

      res.json({
        message: `Student ${student.user.name} assigned to ${classRoom.name} successfully`,
        enrollment: newEnrollment,
        student: {
          id: student.id,
          name: student.user.name,
          admissionNo: student.admissionNo
        }
      });

    } catch (error) {
      console.error('❌ Assign student to class error:', error);
      res.status(500).json({
        error: 'Failed to assign student to class',
        details: error.message
      });
    }
  }

  // Remove teacher from class
  async removeTeacherFromClass(req, res) {
    try {
      const { classRoomId } = req.params;

      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId },
        include: {
          teacher: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class not found' });
      }

      if (!classRoom.teacherId) {
        return res.status(400).json({ error: 'No teacher assigned to this class' });
      }

      const teacherName = classRoom.teacher?.user?.name || 'Unknown';

      const updatedClass = await prisma.classRoom.update({
        where: { id: classRoomId },
        data: { teacherId: null },
        include: {
          _count: {
            select: {
              enrollments: true,
              subjects: true
            }
          }
        }
      });

      res.json({
        message: `Teacher ${teacherName} removed from ${classRoom.name} successfully`,
        class: updatedClass
      });

    } catch (error) {
      console.error('Remove teacher from class error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Remove student from class (end enrollment)
  async removeStudentFromClass(req, res) {
    try {
      const { enrollmentId } = req.params;
      const { reason } = req.body;

      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          student: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          },
          classRoom: {
            select: {
              name: true
            }
          }
        }
      });

      if (!enrollment) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }

      if (!enrollment.isCurrent) {
        return res.status(400).json({ error: 'Enrollment is already ended' });
      }

      // End enrollment
      const updatedEnrollment = await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          isCurrent: false,
          endDate: new Date(),
          promotedTo: reason || 'Removed from class'
        }
      });

      // Update student's current enrollment to null
      await prisma.student.update({
        where: { id: enrollment.studentId },
        data: { currentEnrollmentId: null }
      });

      res.json({
        message: `Student ${enrollment.student.user.name} removed from ${enrollment.classRoom.name} successfully`,
        enrollment: updatedEnrollment
      });

    } catch (error) {
      console.error('Remove student from class error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Bulk assign students to class
  async bulkAssignStudentsToClass(req, res) {
    try {
      const { studentIds, classRoomId, startDate } = req.body;

      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ error: 'Student IDs array is required' });
      }

      if (!classRoomId) {
        return res.status(400).json({ error: 'Class Room ID is required' });
      }

      // Check if class exists
      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class not found' });
      }

      const results = await prisma.$transaction(async (tx) => {
        const assigned = [];
        const errors = [];

        for (const studentRequestedId of studentIds) {
          try {
            // Find student
            let student = await tx.student.findFirst({
              where: { userId: studentRequestedId },
              include: {
                user: { select: { name: true } },
                currentEnrollment: true
              }
            });

            if (!student) {
              student = await tx.student.findUnique({
                where: { id: studentRequestedId },
                include: {
                  user: { select: { name: true } },
                  currentEnrollment: true
                }
              });
            }

            if (!student) {
              errors.push({ studentId: studentRequestedId, error: 'Student not found' });
              continue;
            }

            // Check if already in target class
            if (student.currentEnrollment?.classRoomId === classRoomId) {
              errors.push({
                studentId: student.id,
                studentName: student.user.name,
                error: 'Already enrolled in this class'
              });
              continue;
            }

            // End current enrollment if exists
            if (student.currentEnrollment) {
              await tx.enrollment.update({
                where: { id: student.currentEnrollment.id },
                data: {
                  isCurrent: false,
                  endDate: new Date()
                }
              });
            }

            // Generate new roll number
            const newRollNumber = await generateRollNumber(classRoomId, tx);
            const rollNumberInt = Number(newRollNumber);

            // Create new enrollment
            const newEnrollment = await tx.enrollment.create({
              data: {
                studentId: student.id,
                classRoomId: classRoomId,
                rollNumber: rollNumberInt,
                isCurrent: true,
                startDate: startDate ? new Date(startDate) : new Date()
              }
            });

            // Update student's current enrollment
            await tx.student.update({
              where: { id: student.id },
              data: { currentEnrollmentId: newEnrollment.id }
            });

            assigned.push({
              studentId: student.id,
              studentName: student.user.name,
              rollNumber: rollNumberInt
            });

          } catch (err) {
            errors.push({
              studentId: studentRequestedId,
              error: err.message
            });
          }
        }

        return { assigned, errors };
      });

      res.json({
        message: `Successfully assigned ${results.assigned.length} student(s) to ${classRoom.name}`,
        assigned: results.assigned,
        errors: results.errors,
        summary: {
          total: studentIds.length,
          successful: results.assigned.length,
          failed: results.errors.length
        }
      });

    } catch (error) {
      console.error('Bulk assign students error:', error);
      res.status(500).json({
        error: 'Failed to assign students',
        details: error.message
      });
    }
  }

  // Manage leave requests
  async manageLeaveRequests(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const skip = (page - 1) * limit;

      const where = {};
      if (status) {
        where.status = status;
      }

      const [leaveRequests, total] = await Promise.all([
        prisma.leaveRequest.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true
                  }
                }
              }
            },
            appliedToAdmin: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.leaveRequest.count({ where })
      ]);

      res.json({
        leaveRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Manage leave requests error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update leave request status
  async updateLeaveRequest(req, res) {
    try {
      const { id } = req.params;
      const { status, response } = req.body;

      if (!status || !['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ error: 'Valid status is required' });
      }

      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id }
      });

      if (!leaveRequest) {
        return res.status(404).json({ error: 'Leave request not found' });
      }

      const updatedLeaveRequest = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status,
          response: response || null
        },
        include: {
          teacher: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      res.json({
        message: `Leave request ${status.toLowerCase()} successfully`,
        leaveRequest: updatedLeaveRequest
      });

    } catch (error) {
      console.error('Update leave request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get attendance overview
  async getAttendanceOverview(req, res) {
    try {
      const { startDate, endDate, classRoomId } = req.query;

      // Default to last 30 days if no date range provided
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);

      const start = startDate ? new Date(startDate) : defaultStartDate;
      const end = endDate ? new Date(endDate) : defaultEndDate;

      // Build where clause
      const where = {
        date: {
          gte: start,
          lte: end
        }
      };

      if (classRoomId) {
        where.classRoomId = classRoomId;
      }

      // Get total attendance records
      const attendanceRecords = await prisma.attendance.findMany({
        where,
        include: {
          classRoom: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          student: {
            select: {
              id: true
            }
          }
        }
      });

      // Get total enrolled students
      const enrolledStudents = await prisma.enrollment.count({
        where: {
          isCurrent: true,
          ...(classRoomId && { classRoomId })
        }
      });

      // Calculate statistics
      const totalRecords = attendanceRecords.length;
      const presentCount = attendanceRecords.filter(a => a.status === 'PRESENT').length;
      const absentCount = attendanceRecords.filter(a => a.status === 'ABSENT').length;
      const lateCount = attendanceRecords.filter(a => a.status === 'LATE').length;
      const excusedCount = attendanceRecords.filter(a => a.status === 'EXCUSED').length;

      // Calculate attendance percentage
      const totalPossibleAttendance = enrolledStudents * Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const overallAttendancePercentage = totalPossibleAttendance > 0
        ? ((presentCount + lateCount) / totalPossibleAttendance * 100).toFixed(2)
        : 0;

      // Get status distribution for pie chart
      const statusDistribution = [
        { name: 'Present', value: presentCount, color: '#10B981' },
        { name: 'Absent', value: absentCount, color: '#EF4444' },
        { name: 'Late', value: lateCount, color: '#F59E0B' },
        { name: 'Excused', value: excusedCount, color: '#6B7280' }
      ].filter(item => item.value > 0);

      // Get class-wise attendance (if no specific class filter)
      let classWiseAttendance = [];
      if (!classRoomId) {
        const classAttendance = await prisma.attendance.groupBy({
          by: ['classRoomId'],
          where: {
            date: {
              gte: start,
              lte: end
            }
          },
          _count: {
            id: true
          }
        });

        // Get class details and calculate percentages
        classWiseAttendance = await Promise.all(
          classAttendance.map(async (classAtt) => {
            const classRoom = await prisma.classRoom.findUnique({
              where: { id: classAtt.classRoomId },
              select: { id: true, name: true, type: true }
            });

            const presentInClass = await prisma.attendance.count({
              where: {
                classRoomId: classAtt.classRoomId,
                date: { gte: start, lte: end },
                OR: [
                  { status: 'PRESENT' },
                  { status: 'LATE' }
                ]
              }
            });

            const classEnrollment = await prisma.enrollment.count({
              where: {
                classRoomId: classAtt.classRoomId,
                isCurrent: true
              }
            });

            const totalPossible = classEnrollment * Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            const percentage = totalPossible > 0 ? (presentInClass / totalPossible * 100).toFixed(2) : 0;

            return {
              classId: classRoom.id,
              className: classRoom.name,
              classType: classRoom.type,
              totalStudents: classEnrollment,
              attendancePercentage: parseFloat(percentage),
              presentCount: presentInClass,
              totalRecords: classAtt._count.id
            };
          })
        );

        // Sort by attendance percentage (descending)
        classWiseAttendance.sort((a, b) => b.attendancePercentage - a.attendancePercentage);
      }

      res.json({
        period: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        },
        summary: {
          totalRecords,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          enrolledStudents,
          overallAttendancePercentage: parseFloat(overallAttendancePercentage)
        },
        charts: {
          statusDistribution,
          classWiseAttendance: classWiseAttendance.slice(0, 10) // Top 10 classes
        }
      });

    } catch (error) {
      console.error('Get attendance overview error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get attendance trends over time
  async getAttendanceTrends(req, res) {
    try {
      const { days = 30, classRoomId } = req.query;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Generate date range
      const dateRange = [];
      for (let i = 0; i < parseInt(days); i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        dateRange.push(date.toISOString().split('T')[0]);
      }

      const where = {
        date: {
          gte: startDate,
          lte: endDate
        }
      };

      if (classRoomId) {
        where.classRoomId = classRoomId;
      }

      // Get daily attendance counts
      const dailyAttendance = await prisma.attendance.groupBy({
        by: ['date'],
        where,
        _count: {
          id: true
        }
      });

      // Get daily present counts
      const dailyPresent = await prisma.attendance.groupBy({
        by: ['date'],
        where: {
          ...where,
          OR: [
            { status: 'PRESENT' },
            { status: 'LATE' }
          ]
        },
        _count: {
          id: true
        }
      });

      // Create trends data
      const trends = dateRange.map(date => {
        const dayAttendance = dailyAttendance.find(d => d.date.toISOString().split('T')[0] === date);
        const dayPresent = dailyPresent.find(d => d.date.toISOString().split('T')[0] === date);

        const total = dayAttendance?._count.id || 0;
        const present = dayPresent?._count.id || 0;
        const percentage = total > 0 ? (present / total * 100).toFixed(2) : 0;

        return {
          date,
          total,
          present,
          percentage: parseFloat(percentage)
        };
      });

      res.json({
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days: parseInt(days)
        },
        trends
      });

    } catch (error) {
      console.error('Get attendance trends error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get class attendance comparison
  async getClassAttendanceComparison(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date();
      start.setDate(start.getDate() - 30);
      const end = endDate ? new Date(endDate) : new Date();

      // Get all classes with their attendance data
      const classes = await prisma.classRoom.findMany({
        include: {
          _count: {
            select: {
              enrollments: {
                where: { isCurrent: true }
              }
            }
          }
        }
      });

      const classComparison = await Promise.all(
        classes.map(async (classRoom) => {
          const presentCount = await prisma.attendance.count({
            where: {
              classRoomId: classRoom.id,
              date: { gte: start, lte: end },
              OR: [
                { status: 'PRESENT' },
                { status: 'LATE' }
              ]
            }
          });

          const totalRecords = await prisma.attendance.count({
            where: {
              classRoomId: classRoom.id,
              date: { gte: start, lte: end }
            }
          });

          const totalPossible = classRoom._count.enrollments * Math.ceil((end - start) / (1000 * 60 * 60 * 24));
          const percentage = totalPossible > 0 ? (presentCount / totalPossible * 100).toFixed(2) : 0;

          return {
            classId: classRoom.id,
            className: classRoom.name,
            classType: classRoom.type,
            totalStudents: classRoom._count.enrollments,
            attendancePercentage: parseFloat(percentage),
            presentCount,
            totalRecords
          };
        })
      );

      // Sort by attendance percentage
      classComparison.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

      res.json({
        period: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        },
        classes: classComparison
      });

    } catch (error) {
      console.error('Get class attendance comparison error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get student enrollment history (Admin access)
  async getStudentEnrollmentHistory(req, res) {
    try {
      const { studentId } = req.params; // This is actually a userId
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      console.log('Getting enrollment history for ID:', studentId);

      // First, try to find the student by userId (since the frontend is passing user ID)
      const student = await prisma.student.findFirst({
        where: {
          userId: studentId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
              status: true
            }
          }
        }
      });

      // If not found by userId, try by student.id
      if (!student) {
        const studentById = await prisma.student.findUnique({
          where: { id: studentId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
                status: true
              }
            }
          }
        });

        if (studentById) {
          student = studentById;
        }
      }

      if (!student) {
        console.error('Student not found with ID:', studentId);
        return res.status(404).json({ error: 'Student not found' });
      }

      console.log('Found student:', student.id, 'User ID:', student.userId);

      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where: { studentId: student.id }, // Use the student.id, not the user.id
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            classRoom: {
              select: {
                id: true,
                name: true,
                grade: true,
                section: true,
                type: true,
                teacher: {
                  include: {
                    user: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: { startDate: 'desc' }
        }),
        prisma.enrollment.count({
          where: { studentId: student.id } // Use the student.id
        })
      ]);

      // Calculate duration for each enrollment
      const enrichedEnrollments = enrollments.map(enrollment => {
        const startDate = new Date(enrollment.startDate);
        const endDate = enrollment.endDate ? new Date(enrollment.endDate) : new Date();
        const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const durationMonths = Math.floor(durationDays / 30);

        return {
          ...enrollment,
          duration: {
            days: durationDays,
            months: durationMonths,
            formatted: durationMonths > 0
              ? `${durationMonths} month${durationMonths > 1 ? 's' : ''}`
              : `${durationDays} day${durationDays > 1 ? 's' : ''}`
          }
        };
      });

      res.json({
        student: {
          id: student.id,
          userId: student.userId, // Include userId for reference
          name: student.user.name,
          email: student.user.email,
          admissionNo: student.admissionNo,
          profileImage: student.user.profileImage,
          status: student.user.status
        },
        enrollments: enrichedEnrollments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalEnrollments: total,
          currentEnrollment: enrichedEnrollments.find(e => e.isCurrent),
          totalClassesAttended: total
        }
      });

    } catch (error) {
      console.error('Get student enrollment history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete teacher and related data
  async deleteTeacher(req, res) {
    try {
      const { id } = req.params; // This can be teacherId or userId

      console.log(`🗑️ [Delete Teacher] Request for ID: ${id}`);

      // First try to find teacher by userId
      let teacher = await prisma.teacher.findFirst({
        where: { userId: id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true
            }
          }
        }
      });

      // If not found by userId, try by teacher.id
      if (!teacher) {
        console.log(`🔍 Not found by userId, trying teacher.id: ${id}`);
        teacher = await prisma.teacher.findUnique({
          where: { id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true
              }
            }
          }
        });
      }

      if (!teacher) {
        console.log(`❌ Teacher not found with ID: ${id}`);
        return res.status(404).json({ error: 'Teacher not found' });
      }

      // Prevent deleting super admin or admin roles
      if (teacher.user.role === 'SUPER_ADMIN' || teacher.user.role === 'ADMIN') {
        console.log(`❌ Cannot delete ${teacher.user.role} account`);
        return res.status(403).json({
          error: `Cannot delete ${teacher.user.role} account. Use user management instead.`
        });
      }

      // REMOVED: Active class assignment check (no longer restricting deletion)
      // Check if teacher has any pending leave requests (still check this)
      const pendingLeaveRequests = await prisma.leaveRequest.count({
        where: {
          teacherId: teacher.id,
          status: 'PENDING'
        }
      });

      if (pendingLeaveRequests > 0) {
        console.log(`⚠️ Teacher has ${pendingLeaveRequests} pending leave requests`);
        return res.status(400).json({
          error: 'Cannot delete teacher with pending leave requests',
          pendingRequests: pendingLeaveRequests,
          message: 'Please resolve all pending leave requests before deleting teacher.'
        });
      }

      console.log(`✅ Teacher found: ${teacher.user.name} (User ID: ${teacher.userId})`);
      console.log(`🔄 Starting deletion process...`);

      // Store teacher info for response
      const teacherInfo = {
        id: teacher.id,
        userId: teacher.userId,
        name: teacher.user.name,
        email: teacher.user.email,
        status: teacher.user.status
      };

      // Delete teacher and related data in transaction
      const result = await prisma.$transaction(async (tx) => {
        console.log('🔄 TX: Starting transaction for teacher deletion...');

        // 1. First, remove teacher from all subjects they teach
        console.log('📚 TX: Removing teacher from subjects...');
        await tx.subject.updateMany({
          where: { teacherId: teacher.id },
          data: { teacherId: null }
        });

        // 2. Remove teacher from all classes they're assigned to
        console.log('🏫 TX: Removing teacher from classes...');
        await tx.classRoom.updateMany({
          where: { teacherId: teacher.id },
          data: { teacherId: null }
        });

        // 3. Remove teacher's attendance records (they were the one marking attendance)
        console.log('📝 TX: Removing attendance records marked by teacher...');
        await tx.attendance.deleteMany({
          where: { teacherId: teacher.id }
        });

        // 4. Remove teacher's progress records (Hifz/Nazra progress they recorded)
        console.log('📊 TX: Removing progress records...');
        await Promise.all([
          tx.hifzProgress.deleteMany({
            where: { teacherId: teacher.id }
          }),
          tx.nazraProgress.deleteMany({
            where: { teacherId: teacher.id }
          }),
          tx.subjectProgress.deleteMany({
            where: { teacherId: teacher.id }
          })
        ]);

        // 5. Remove teacher's leave requests
        console.log('🏖️ TX: Removing leave requests...');
        await tx.leaveRequest.deleteMany({
          where: { teacherId: teacher.id }
        });

        // 6. Delete teacher profile
        console.log('👤 TX: Deleting teacher profile...');
        await tx.teacher.delete({
          where: { id: teacher.id }
        });

        // 7. Delete user account
        console.log('👥 TX: Deleting user account...');
        await tx.user.delete({
          where: { id: teacher.userId }
        });

        console.log('✅ TX: Teacher deletion completed successfully');
        return teacherInfo;
      });

      // Clean up uploaded files
      try {
        console.log('🗑️ Cleaning up uploaded files...');
        const filesToDelete = [
          teacher.profileImage,
          teacher.cnicFront,
          teacher.cnicBack
        ].filter(file => file && fs.existsSync(file));

        // Parse JSON arrays
        const degreeDocs = teacher.degreeDocuments ? JSON.parse(teacher.degreeDocuments) : [];
        const otherDocs = teacher.otherDocuments ? JSON.parse(teacher.otherDocuments) : [];

        filesToDelete.push(...degreeDocs, ...otherDocs);

        for (const filePath of filesToDelete) {
          if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ Deleted file: ${filePath}`);
          }
        }
      } catch (fileError) {
        console.error('⚠️ Error cleaning up files:', fileError);
        // Continue even if file cleanup fails
      }

      console.log(`✅ Teacher deleted successfully: ${teacherInfo.name}`);

      res.json({
        message: 'Teacher deleted successfully',
        deletedTeacher: result,
        summary: {
          name: teacherInfo.name,
          email: teacherInfo.email,
          deletedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Delete teacher error:', error);
      res.status(500).json({
        error: 'Failed to delete teacher',
        details: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }

  // Delete student and related data
  async deleteStudent(req, res) {
    try {
      const { id } = req.params; // This can be studentId or userId

      console.log(`🗑️ [Delete Student] Request for ID: ${id}`);

      // First try to find student by userId
      let student = await prisma.student.findFirst({
        where: { userId: id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true
            }
          },
          currentEnrollment: {
            include: {
              classRoom: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // If not found by userId, try by student.id
      if (!student) {
        console.log(`🔍 Not found by userId, trying student.id: ${id}`);
        student = await prisma.student.findUnique({
          where: { id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true
              }
            },
            currentEnrollment: {
              include: {
                classRoom: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        });
      }

      if (!student) {
        console.log(`❌ Student not found with ID: ${id}`);
        return res.status(404).json({ error: 'Student not found' });
      }

      // REMOVED: Active enrollment check (no longer restricting deletion)

      console.log(`✅ Student found: ${student.user.name} (Admission No: ${student.admissionNo})`);
      console.log(`🔄 Starting deletion process...`);

      // Store student info for response
      const studentInfo = {
        id: student.id,
        userId: student.userId,
        name: student.user.name,
        email: student.user.email,
        admissionNo: student.admissionNo,
        status: student.user.status
      };

      // Delete student and related data in transaction
      const result = await prisma.$transaction(async (tx) => {
        console.log('🔄 TX: Starting transaction for student deletion...');

        // 1️⃣ Enrollments
        await tx.enrollment.deleteMany({
          where: { studentId: student.id }
        });

        // 2️⃣ Disconnect parents
        await tx.student.update({
          where: { id: student.id },
          data: {
            parents: { set: [] }
          }
        });

        // 3️⃣ Attendance
        await tx.attendance.deleteMany({
          where: { studentId: student.id }
        });

        // 4️⃣ Progress
        await Promise.all([
          tx.hifzProgress.deleteMany({ where: { studentId: student.id } }),
          tx.nazraProgress.deleteMany({ where: { studentId: student.id } }),
          tx.subjectProgress.deleteMany({ where: { studentId: student.id } })
        ]);

        // 🔥 4.5️⃣ DELETE HIFZ STATUS (THIS WAS MISSING)
        await tx.studentHifzStatus.deleteMany({
          where: { studentId: student.id }
        });

        // 5️⃣ Student
        await tx.student.delete({
          where: { id: student.id }
        });

        // 6️⃣ User
        await tx.user.delete({
          where: { id: student.userId }
        });

        return studentInfo;
      });



      // Clean up uploaded files
      try {
        console.log('🗑️ Cleaning up uploaded files...');
        const filesToDelete = [
          student.profileImage,
          student.birthCertificate,
          student.cnicOrBForm,
          student.previousSchoolCertificate
        ].filter(file => file && fs.existsSync(file));

        // Parse JSON arrays
        const otherDocs = student.otherDocuments ? JSON.parse(student.otherDocuments) : [];
        filesToDelete.push(...otherDocs);

        for (const filePath of filesToDelete) {
          if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ Deleted file: ${filePath}`);
          }
        }
      } catch (fileError) {
        console.error('⚠️ Error cleaning up files:', fileError);
        // Continue even if file cleanup fails
      }

      console.log(`✅ Student deleted successfully: ${studentInfo.name}`);

      res.json({
        message: 'Student deleted successfully',
        deletedStudent: result,
        summary: {
          name: studentInfo.name,
          admissionNo: studentInfo.admissionNo,
          deletedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Delete student error:', error);
      res.status(500).json({
        error: 'Failed to delete student',
        details: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }

  // -------------------------------
  // 🎓 Promote multiple students to new class (with roll number recycling)
  // -------------------------------
  async promoteStudents(req, res) {
    try {
      const { studentIds, newClassRoomId, reason } = req.body;

      console.log("🔵 [PROMOTE START] Incoming request payload:", {
        studentIds,
        newClassRoomId,
        reason
      });

      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        console.log("❌ Invalid studentIds array");
        return res.status(400).json({ error: 'Student IDs array is required' });
      }

      if (!newClassRoomId) {
        console.log("❌ No classRoomId provided");
        return res.status(400).json({ error: 'New class room ID is required' });
      }

      console.log("📩 Promote request validated. Starting transaction...");

      const results = await prisma.$transaction(async (tx) => {

        console.log("🔄 TX: Fetching target class room...");
        const newClassRoom = await tx.classRoom.findUnique({
          where: { id: newClassRoomId }
        });

        if (!newClassRoom) {
          console.log("❌ TX: Target class not found:", newClassRoomId);
          throw new Error("New class room not found");
        }

        console.log("🟢 TX: Target class found:", newClassRoom.name);

        const promotedStudents = [];
        const errors = [];

        console.log("🔁 TX: Looping students for promotion...");

        for (const studentRequestedId of studentIds) {
          console.log("\n------------------------------------------");
          console.log(`➡️ TX: Processing student ID: ${studentRequestedId}`);
          console.log("------------------------------------------");

          try {
            console.log("🔍 TX: Finding student by userId...");
            let student = await tx.student.findFirst({
              where: { userId: studentRequestedId },
              include: {
                user: { select: { name: true, email: true } },
                currentEnrollment: {
                  include: {
                    classRoom: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            });

            if (!student) {
              console.log("🔍 TX: Not found by userId. Trying student.id...");
              student = await tx.student.findUnique({
                where: { id: studentRequestedId },
                include: {
                  user: { select: { name: true, email: true } },
                  currentEnrollment: {
                    include: {
                      classRoom: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  }
                }
              });
            }

            if (!student) {
              console.log("❌ TX: Student not found:", studentRequestedId);
              errors.push({ studentId: studentRequestedId, error: "Student not found" });
              continue;
            }

            console.log("🟢 TX: Student found:", {
              studentId: student.id,
              userId: student.userId,
              name: student.user.name,
              currentClass: student?.currentEnrollment?.classRoom?.name,
              currentRollNumber: student?.currentEnrollment?.rollNumber
            });

            if (!student.currentEnrollment) {
              console.log("❌ TX: Student has no current enrollment");
              errors.push({
                studentId: student.id,
                studentName: student.user.name,
                error: "Student has no active enrollment"
              });
              continue;
            }

            if (student.currentEnrollment.classRoomId === newClassRoomId) {
              console.log("⚠️ TX: Student already in target class");
              errors.push({
                studentId: student.id,
                studentName: student.user.name,
                error: "Already enrolled in target class"
              });
              continue;
            }

            // Save the old roll number before ending enrollment
            const oldRollNumber = student.currentEnrollment.rollNumber;
            const oldClassRoomId = student.currentEnrollment.classRoomId;

            console.log("🔚 TX: Ending current enrollment:", {
              enrollmentId: student.currentEnrollment.id,
              currentClass: student.currentEnrollment.classRoom.name,
              oldRollNumber: oldRollNumber
            });

            await tx.enrollment.update({
              where: { id: student.currentEnrollment.id },
              data: {
                isCurrent: false,
                endDate: new Date(),
                promotedTo: reason || `Promoted to ${newClassRoom.name}`
              }
            });

            // Make old roll number available for reuse
            console.log(`♻️ TX: Roll number ${oldRollNumber} is now available in class ${oldClassRoomId}`);

            console.log("🔢 TX: Generating new roll number for target class...");
            const newRollNumber = await generateRollNumber(newClassRoomId, tx);

            console.log(`🎯 TX: New roll number generated → ${newRollNumber}`);
            console.log(`🔢 TX: Roll number type: ${typeof newRollNumber}, value: ${newRollNumber}`);

            // Ensure roll number is an integer
            const rollNumberInt = Number(newRollNumber);
            if (isNaN(rollNumberInt) || rollNumberInt <= 0) {
              throw new Error(`Invalid roll number generated: ${newRollNumber}`);
            }

            console.log(`🆕 TX: Creating new enrollment with roll number: ${rollNumberInt} (as integer)...`);

            const newEnrollment = await tx.enrollment.create({
              data: {
                studentId: student.id,
                classRoomId: newClassRoomId,
                rollNumber: rollNumberInt, // Pass as integer
                isCurrent: true,
                startDate: new Date()
              }
            });

            console.log("🟦 TX: New enrollment created:", {
              enrollmentId: newEnrollment.id,
              studentId: student.id,
              newRollNumber: rollNumberInt
            });

            console.log("🔗 TX: Updating student's currentEnrollmentId...");
            await tx.student.update({
              where: { id: student.id },
              data: { currentEnrollmentId: newEnrollment.id }
            });

            console.log("🟢 TX: Student promotion completed!");

            promotedStudents.push({
              studentId: student.id,
              studentName: student.user.name,
              fromClass: student.currentEnrollment.classRoom.name,
              toClass: newClassRoom.name,
              oldRollNumber: oldRollNumber,
              newRollNumber: rollNumberInt
            });

          } catch (err) {
            console.log("❌ TX ERROR for student:", studentRequestedId, err.message, err.stack);
            errors.push({
              studentId: studentRequestedId,
              error: err.message,
              details: err.stack
            });
          }
        }

        console.log("🔵 TX Completed all students.");
        console.log("📊 TX Summary:", {
          promoted: promotedStudents.length,
          errors: errors.length
        });

        return { promotedStudents, errors };
      });

      console.log("🟢 Transaction finished successfully, sending response...");

      return res.json({
        message: `Successfully promoted ${results.promotedStudents.length} student(s)`,
        promoted: results.promotedStudents,
        errors: results.errors,
        summary: {
          total: studentIds.length,
          successful: results.promotedStudents.length,
          failed: results.errors.length,
        }
      });

    } catch (error) {
      console.error("❗ GLOBAL Promote Students Error:", error);
      return res.status(500).json({ error: error.message });
    }
  }


  // Get all users (for user management)
  async getUsers(req, res) {
    try {
      const { role, search, page = 1, limit = 50 } = req.query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {};
      if (role && role !== 'ALL') {
        where.role = role;
      }
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          {
            studentProfile: {
              admissionNo: { contains: search, mode: 'insensitive' }
            }
          }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
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
                admissionNo: true,
                currentEnrollment: {
                  include: {
                    classRoom: {
                      select: {
                        id: true,
                        name: true,
                        grade: true
                      }
                    }
                  }
                }
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

  // Delete user (Super Admin only)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      // Prevent deleting super admins
      if (user.role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Cannot delete super admin accounts' });
      }

      // Delete user (cascade will handle related records)
      await prisma.user.delete({
        where: { id }
      });

      res.json({
        message: 'User deleted successfully',
        deletedUser: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Helper methods for progress calculations
  async calculateHifzCompletion(studentId) {
    const totalLinesInQuran = 540;

    const progressRecords = await prisma.hifzProgress.findMany({
      where: { studentId },
      orderBy: { date: 'asc' }
    });

    if (progressRecords.length === 0) {
      return {
        totalLinesCompleted: 0,
        parasCompleted: 0,
        completionPercentage: 0,
        estimatedDaysRemaining: null,
        averageDailyLines: 0
      };
    }

    const totalLinesCompleted = progressRecords.reduce((sum, record) => sum + record.sabaqLines, 0);
    const completionPercentage = (totalLinesCompleted / totalLinesInQuran) * 100;

    const latestProgress = progressRecords[progressRecords.length - 1];
    const parasCompleted = latestProgress.completedParas ? latestProgress.completedParas.length : 0;

    const firstRecord = progressRecords[0];
    const lastRecord = progressRecords[progressRecords.length - 1];
    const daysElapsed = Math.ceil((lastRecord.date - firstRecord.date) / (1000 * 60 * 60 * 24)) || 1;
    const averageDailyLines = totalLinesCompleted / daysElapsed;

    const linesRemaining = totalLinesInQuran - totalLinesCompleted;
    const estimatedDaysRemaining = averageDailyLines > 0 ? Math.ceil(linesRemaining / averageDailyLines) : null;

    return {
      totalLinesCompleted,
      parasCompleted,
      completionPercentage: Math.min(completionPercentage, 100),
      estimatedDaysRemaining,
      averageDailyLines: Math.round(averageDailyLines * 100) / 100,
      currentPara: latestProgress.currentPara || 1,
      currentParaProgress: latestProgress.paraProgress || 0
    };
  }

  async calculateNazraCompletion(studentId) {
    const totalLinesInQuran = 540;

    const progressRecords = await prisma.nazraProgress.findMany({
      where: { studentId },
      orderBy: { date: 'asc' }
    });

    if (progressRecords.length === 0) {
      return {
        totalLinesRecited: 0,
        completionPercentage: 0,
        estimatedDaysRemaining: null,
        averageDailyLines: 0
      };
    }

    const totalLinesRecited = progressRecords.reduce((sum, record) => sum + record.recitedLines, 0);
    const completionPercentage = Math.min((totalLinesRecited / totalLinesInQuran) * 100, 100);

    const firstRecord = progressRecords[0];
    const lastRecord = progressRecords[progressRecords.length - 1];
    const daysElapsed = Math.ceil((lastRecord.date - firstRecord.date) / (1000 * 60 * 60 * 24)) || 1;
    const averageDailyLines = totalLinesRecited / daysElapsed;

    const linesRemaining = totalLinesInQuran - Math.min(totalLinesRecited, totalLinesInQuran);
    const estimatedDaysRemaining = averageDailyLines > 0 ? Math.ceil(linesRemaining / averageDailyLines) : null;

    return {
      totalLinesRecited,
      completionPercentage,
      estimatedDaysRemaining,
      averageDailyLines: Math.round(averageDailyLines * 100) / 100,
      isCompleted: completionPercentage >= 100
    };
  }

  // ============================================
  // FILE SERVING METHODS
  // ============================================

  // Serve profile image for any user

  async serveProfileImage(req, res) {
    try {
      const { userId } = req.params;

      console.log(`📸 [Profile Image Request] User ID: ${userId}`);

      // Find user with profile image
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          profileImage: true,
          role: true
        }
      });

      if (!user) {
        console.log(`❌ User not found: ${userId}`);
        return res.status(404).json({
          error: 'User not found',
          userId
        });
      }

      if (!user.profileImage) {
        console.log(`⚠️ No profile image for user: ${user.name} (${userId})`);
        return res.status(404).json({
          error: 'Profile image not found for this user',
          user: { id: user.id, name: user.name, role: user.role }
        });
      }

      // Construct file path
      const filePath = path.join(__dirname, '..', user.profileImage);

      console.log(`📁 Looking for file: ${filePath}`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found on disk: ${filePath}`);
        console.log(`   Stored path in DB: ${user.profileImage}`);
        return res.status(404).json({
          error: 'Profile image file not found on server',
          storedPath: user.profileImage,
          resolvedPath: filePath,
          user: { id: user.id, name: user.name, role: user.role }
        });
      }

      // Determine content type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      const contentType = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      }[ext] || 'image/jpeg';

      console.log(`✅ Serving image: ${user.name} (${ext})`);

      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins for public images

      // Send file
      res.sendFile(filePath);
    } catch (error) {
      console.error('❌ Error serving profile image:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }

  // Serve teacher documents
  async serveTeacherDocument(req, res) {
    try {
      const { teacherId, type } = req.params;
      const { index } = req.query;

      // Find teacher and get document path
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }

      let documentPath;
      let fileName;

      switch (type) {
        case 'cnic-front':
          documentPath = teacher.cnicFront;
          fileName = `cnic-front-${teacher.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
          break;

        case 'cnic-back':
          documentPath = teacher.cnicBack;
          fileName = `cnic-back-${teacher.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
          break;

        case 'degree':
          const degreePaths = teacher.degreeDocuments ? JSON.parse(teacher.degreeDocuments) : [];
          if (index !== undefined && degreePaths[index]) {
            documentPath = degreePaths[index];
            fileName = `degree-${index}-${teacher.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
          } else {
            return res.status(400).json({
              error: 'Specify document index (0-based)',
              availableDocuments: degreePaths.length
            });
          }
          break;

        case 'other':
          const otherPaths = teacher.otherDocuments ? JSON.parse(teacher.otherDocuments) : [];
          if (index !== undefined && otherPaths[index]) {
            documentPath = otherPaths[index];
            fileName = `other-${index}-${teacher.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
          } else {
            return res.status(400).json({
              error: 'Specify document index (0-based)',
              availableDocuments: otherPaths.length
            });
          }
          break;

        default:
          return res.status(400).json({
            error: 'Invalid document type',
            validTypes: ['cnic-front', 'cnic-back', 'degree', 'other']
          });
      }

      if (!documentPath) {
        return res.status(404).json({
          error: 'Document not found',
          teacher: teacher.user.name,
          documentType: type,
          teacherId
        });
      }

      const filePath = path.join(__dirname, '..', documentPath);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          error: 'Document file not found on server',
          storedPath: documentPath,
          resolvedPath: filePath,
          teacher: teacher.user.name
        });
      }

      // Set appropriate headers for download
      const ext = path.extname(filePath).toLowerCase();
      const contentType = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      }[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName || path.basename(filePath)}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving teacher document:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Serve student documents
  async serveStudentDocument(req, res) {
    try {
      const { studentId, type } = req.params;
      const { index } = req.query;

      // Find student and get document path
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      let documentPath;
      let fileName;

      switch (type) {
        case 'birth-certificate':
          documentPath = student.birthCertificate;
          fileName = `birth-certificate-${student.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
          break;

        case 'cnic-bform':
          documentPath = student.cnicOrBForm;
          fileName = `cnic-bform-${student.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
          break;

        case 'previous-school':
          documentPath = student.previousSchoolCertificate;
          fileName = `previous-school-${student.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
          break;

        case 'other':
          const otherPaths = student.otherDocuments ? JSON.parse(student.otherDocuments) : [];
          if (index !== undefined && otherPaths[index]) {
            documentPath = otherPaths[index];
            fileName = `other-${index}-${student.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
          } else {
            return res.status(400).json({
              error: 'Specify document index (0-based)',
              availableDocuments: otherPaths.length
            });
          }
          break;

        default:
          return res.status(400).json({
            error: 'Invalid document type',
            validTypes: ['birth-certificate', 'cnic-bform', 'previous-school', 'other']
          });
      }

      if (!documentPath) {
        return res.status(404).json({
          error: 'Document not found',
          student: student.user.name,
          documentType: type,
          studentId
        });
      }

      const filePath = path.join(__dirname, '..', documentPath);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          error: 'Document file not found on server',
          storedPath: documentPath,
          resolvedPath: filePath,
          student: student.user.name
        });
      }

      // Set appropriate headers for download
      const ext = path.extname(filePath).toLowerCase();
      const contentType = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      }[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName || path.basename(filePath)}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving student document:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update student profile image
  async updateStudentProfileImage(req, res) {
    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Find student
      const student = await prisma.student.findFirst({
        where: { OR: [{ id }, { userId: id }] }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Delete old image if exists
      if (student.profileImage) {
        const oldPath = path.join(__dirname, '..', student.profileImage);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Update with new image
      const updatedStudent = await prisma.student.update({
        where: { id: student.id },
        data: { profileImage: req.file.path }
      });

      // Also update user table
      await prisma.user.update({
        where: { id: student.userId },
        data: { profileImage: req.file.path }
      });

      res.json({
        message: 'Profile image updated successfully',
        profileImage: req.file.path
      });

    } catch (error) {
      console.error('Error updating profile image:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Upload student document
  async uploadStudentDocument(req, res) {
    try {
      const { id } = req.params; // This should be student.id, not user.id
      const { type } = req.body;

      console.log(`📁 [Upload Document] Student ID: ${id}, Type: ${type}`);

      if (!req.file) {
        console.log('❌ No file uploaded');
        return res.status(400).json({ error: 'No document file uploaded' });
      }

      if (!type || !['birth-certificate', 'cnic-bform', 'previous-school', 'other'].includes(type)) {
        console.log(`❌ Invalid document type: ${type}`);
        return res.status(400).json({
          error: 'Valid document type is required',
          validTypes: ['birth-certificate', 'cnic-bform', 'previous-school', 'other']
        });
      }

      console.log(`📄 File uploaded: ${req.file.filename}, Size: ${req.file.size}`);

      // First try to find by student.id
      let student = await prisma.student.findUnique({
        where: { id }
      });

      // If not found, try to find by userId
      if (!student) {
        console.log(`🔄 Student not found by ID ${id}, trying by userId...`);
        student = await prisma.student.findFirst({
          where: { userId: id }
        });
      }

      if (!student) {
        console.log(`❌ Student not found with ID: ${id}`);
        // Delete uploaded file since student not found
        if (req.file.path && fs.existsSync(req.file.path)) {
          await fs.unlink(req.file.path);
          console.log(`🗑️ Deleted orphan file: ${req.file.path}`);
        }
        return res.status(404).json({
          error: 'Student not found',
          message: `No student found with ID: ${id}`
        });
      }

      console.log(`✅ Student found: ${student.admissionNo} (User ID: ${student.userId})`);

      let updateData = {};

      // Determine which field to update based on document type
      switch (type) {
        case 'birth-certificate':
          // Delete old file if exists
          if (student.birthCertificate && fs.existsSync(student.birthCertificate)) {
            await fs.unlink(student.birthCertificate);
            console.log(`🗑️ Deleted old birth certificate: ${student.birthCertificate}`);
          }
          updateData = { birthCertificate: req.file.path };
          break;

        case 'cnic-bform':
          if (student.cnicOrBForm && fs.existsSync(student.cnicOrBForm)) {
            await fs.unlink(student.cnicOrBForm);
            console.log(`🗑️ Deleted old CNIC/B-Form: ${student.cnicOrBForm}`);
          }
          updateData = { cnicOrBForm: req.file.path };
          break;

        case 'previous-school':
          if (student.previousSchoolCertificate && fs.existsSync(student.previousSchoolCertificate)) {
            await fs.unlink(student.previousSchoolCertificate);
            console.log(`🗑️ Deleted old school certificate: ${student.previousSchoolCertificate}`);
          }
          updateData = { previousSchoolCertificate: req.file.path };
          break;

        case 'other':
          // For other documents, append to array
          let existingDocs = [];
          try {
            existingDocs = student.otherDocuments ? JSON.parse(student.otherDocuments) : [];
          } catch (e) {
            console.log('⚠️ Error parsing otherDocuments, initializing as empty array');
            existingDocs = [];
          }
          existingDocs.push(req.file.path);
          updateData = { otherDocuments: JSON.stringify(existingDocs) };
          console.log(`➕ Added other document, total: ${existingDocs.length}`);
          break;

        default:
          if (req.file.path && fs.existsSync(req.file.path)) {
            await fs.unlink(req.file.path);
          }
          return res.status(400).json({ error: 'Invalid document type' });
      }

      // Update student record
      const updatedStudent = await prisma.student.update({
        where: { id: student.id },
        data: updateData
      });

      console.log(`✅ Document uploaded successfully for student: ${student.admissionNo}`);

      res.json({
        message: `Document uploaded successfully`,
        document: {
          type,
          path: req.file.path,
          fileName: req.file.originalname,
          size: req.file.size,
          uploadedAt: new Date()
        },
        student: {
          id: student.id,
          userId: student.userId,
          admissionNo: student.admissionNo
        }
      });

    } catch (error) {
      console.error('❌ Upload student document error:', error);

      // Clean up uploaded file on error
      if (req.file && req.file.path) {
        try {
          if (fs.existsSync(req.file.path)) {
            await fs.unlink(req.file.path);
            console.log(`🗑️ Cleaned up file after error: ${req.file.path}`);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }

      res.status(500).json({
        error: 'Failed to upload document',
        details: error.message
      });
    }
  } s

  // Delete student document
  async deleteStudentDocument(req, res) {
    try {
      const { studentId, type } = req.params;
      const { index } = req.query;

      console.log(`🗑️ [Delete Document] Student ID: ${studentId}, Type: ${type}, Index: ${index}`);

      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });

      if (!student) {
        console.log(`❌ Student not found: ${studentId}`);
        return res.status(404).json({ error: 'Student not found' });
      }

      let updateData = {};
      let filePathToDelete = null;

      switch (type) {
        case 'birth-certificate':
          if (!student.birthCertificate) {
            return res.status(404).json({ error: 'Birth certificate not found' });
          }
          filePathToDelete = student.birthCertificate;
          updateData = { birthCertificate: null };
          break;

        case 'cnic-bform':
          if (!student.cnicOrBForm) {
            return res.status(404).json({ error: 'CNIC/B-Form not found' });
          }
          filePathToDelete = student.cnicOrBForm;
          updateData = { cnicOrBForm: null };
          break;

        case 'previous-school':
          if (!student.previousSchoolCertificate) {
            return res.status(404).json({ error: 'Previous school certificate not found' });
          }
          filePathToDelete = student.previousSchoolCertificate;
          updateData = { previousSchoolCertificate: null };
          break;

        case 'other':
          let existingDocs = [];
          try {
            existingDocs = student.otherDocuments ? JSON.parse(student.otherDocuments) : [];
          } catch (e) {
            return res.status(400).json({ error: 'Error parsing document list' });
          }

          const docIndex = parseInt(index) || 0;
          if (docIndex >= existingDocs.length || docIndex < 0) {
            return res.status(404).json({
              error: 'Document not found at specified index',
              availableCount: existingDocs.length
            });
          }

          filePathToDelete = existingDocs[docIndex];
          existingDocs.splice(docIndex, 1);
          updateData = { otherDocuments: JSON.stringify(existingDocs) };
          break;

        default:
          return res.status(400).json({
            error: 'Invalid document type',
            validTypes: ['birth-certificate', 'cnic-bform', 'previous-school', 'other']
          });
      }

      // Delete file from disk
      if (filePathToDelete) {
        try {
          if (fs.existsSync(filePathToDelete)) {
            await fs.unlink(filePathToDelete);
            console.log(`✅ Deleted file from disk: ${filePathToDelete}`);
          } else {
            console.log(`⚠️ File not found on disk: ${filePathToDelete}`);
          }
        } catch (fileError) {
          console.error('Error deleting file from disk:', fileError);
          // Continue anyway - we'll still update the database
        }
      }

      // Update database
      await prisma.student.update({
        where: { id: studentId },
        data: updateData
      });

      console.log(`✅ Document deleted successfully from database for student: ${student.admissionNo}`);

      res.json({
        message: 'Document deleted successfully',
        deleted: {
          type,
          path: filePathToDelete,
          student: {
            id: student.id,
            admissionNo: student.admissionNo
          }
        }
      });

    } catch (error) {
      console.error('❌ Delete student document error:', error);
      res.status(500).json({
        error: 'Failed to delete document',
        details: error.message
      });
    }
  }

  // Upload teacher document
  async uploadTeacherDocument(req, res) {
    try {
      const { id } = req.params;
      const { type } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No document file uploaded' });
      }

      if (!type || !['cnic-front', 'cnic-back', 'qualification', 'experience', 'other'].includes(type)) {
        return res.status(400).json({ error: 'Valid document type is required' });
      }

      const teacher = await prisma.teacher.findUnique({
        where: { id }
      });

      if (!teacher) {
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ error: 'Teacher not found' });
      }

      let updateData = {};
      let fileName = `${type}-${teacher.cnic || teacher.id}`;

      if (type === 'cnic-front') {
        if (teacher.cnicFront && fs.existsSync(teacher.cnicFront)) {
          fs.unlinkSync(teacher.cnicFront);
        }
        updateData = { cnicFront: req.file.path };
      }
      else if (type === 'cnic-back') {
        if (teacher.cnicBack && fs.existsSync(teacher.cnicBack)) {
          fs.unlinkSync(teacher.cnicBack);
        }
        updateData = { cnicBack: req.file.path };
      }
      else if (type === 'qualification') {
        const existingDocs = teacher.qualificationCertificates ? JSON.parse(teacher.qualificationCertificates) : [];
        existingDocs.push(req.file.path);
        updateData = { qualificationCertificates: JSON.stringify(existingDocs) };
      }
      else if (type === 'experience') {
        const existingDocs = teacher.experienceCertificates ? JSON.parse(teacher.experienceCertificates) : [];
        existingDocs.push(req.file.path);
        updateData = { experienceCertificates: JSON.stringify(existingDocs) };
      }
      else if (type === 'other') {
        const existingDocs = teacher.otherDocuments ? JSON.parse(teacher.otherDocuments) : [];
        existingDocs.push(req.file.path);
        updateData = { otherDocuments: JSON.stringify(existingDocs) };
      }

      await prisma.teacher.update({
        where: { id },
        data: updateData
      });

      res.json({
        message: `${type.replace('-', ' ')} uploaded successfully`,
        document: {
          type,
          path: req.file.path,
          fileName: req.file.originalname,
          size: req.file.size
        }
      });

    } catch (error) {
      console.error('Upload teacher document error:', error);

      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ error: 'Failed to upload document' });
    }
  }


  // Delete teacher document
  async deleteTeacherDocument(req, res) {
    try {
      const { teacherId, type } = req.params;
      const { index } = req.query;

      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }

      let updateData = {};
      let filePathToDelete = null;

      if (type === 'cnic-front') {
        if (!teacher.cnicFront) {
          return res.status(404).json({ error: 'CNIC front not found' });
        }
        filePathToDelete = teacher.cnicFront;
        updateData = { cnicFront: null };
      }
      else if (type === 'cnic-back') {
        if (!teacher.cnicBack) {
          return res.status(404).json({ error: 'CNIC back not found' });
        }
        filePathToDelete = teacher.cnicBack;
        updateData = { cnicBack: null };
      }
      else if (type === 'qualification') {
        const existingDocs = teacher.qualificationCertificates ? JSON.parse(teacher.qualificationCertificates) : [];
        const docIndex = parseInt(index) || 0;

        if (docIndex >= existingDocs.length) {
          return res.status(404).json({ error: 'Qualification document not found at specified index' });
        }

        filePathToDelete = existingDocs[docIndex];
        existingDocs.splice(docIndex, 1);
        updateData = { qualificationCertificates: JSON.stringify(existingDocs) };
      }
      else if (type === 'experience') {
        const existingDocs = teacher.experienceCertificates ? JSON.parse(teacher.experienceCertificates) : [];
        const docIndex = parseInt(index) || 0;

        if (docIndex >= existingDocs.length) {
          return res.status(404).json({ error: 'Experience document not found at specified index' });
        }

        filePathToDelete = existingDocs[docIndex];
        existingDocs.splice(docIndex, 1);
        updateData = { experienceCertificates: JSON.stringify(existingDocs) };
      }
      else if (type === 'other') {
        const existingDocs = teacher.otherDocuments ? JSON.parse(teacher.otherDocuments) : [];
        const docIndex = parseInt(index) || 0;

        if (docIndex >= existingDocs.length) {
          return res.status(404).json({ error: 'Document not found at specified index' });
        }

        filePathToDelete = existingDocs[docIndex];
        existingDocs.splice(docIndex, 1);
        updateData = { otherDocuments: JSON.stringify(existingDocs) };
      }
      else {
        return res.status(400).json({ error: 'Invalid document type' });
      }

      // Delete file from disk
      if (filePathToDelete && fs.existsSync(filePathToDelete)) {
        fs.unlinkSync(filePathToDelete);
      }

      // Update database
      await prisma.teacher.update({
        where: { id: teacherId },
        data: updateData
      });

      res.json({
        message: 'Document deleted successfully',
        deleted: {
          type,
          path: filePathToDelete
        }
      });

    } catch (error) {
      console.error('Delete teacher document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  // Get teacher with all document info (without serving files)
  async getTeacherWithDocuments(req, res) {
    try {
      const { id } = req.params;

      const teacher = await prisma.teacher.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profileImage: true,
              status: true,
              createdAt: true
            }
          }
        }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }

      // Parse document arrays
      const documents = {
        profileImage: teacher.profileImage,
        cnicFront: teacher.cnicFront,
        cnicBack: teacher.cnicBack,
        degreeDocuments: teacher.degreeDocuments ? JSON.parse(teacher.degreeDocuments) : [],
        otherDocuments: teacher.otherDocuments ? JSON.parse(teacher.otherDocuments) : []
      };

      // Generate URLs for each document
      const generateFileUrl = (type, teacherId, index = null) => {
        let url = `/api/admin/teachers/${teacherId}/documents/${type}`;
        if (index !== null) {
          url += `?index=${index}`;
        }
        return url;
      };

      const documentUrls = {
        profileImageUrl: generateFileUrl('profile-image', teacher.userId),
        cnicFrontUrl: teacher.cnicFront ? generateFileUrl('cnic-front', teacher.id) : null,
        cnicBackUrl: teacher.cnicBack ? generateFileUrl('cnic-back', teacher.id) : null,
        degreeDocumentsUrls: documents.degreeDocuments.map((_, index) =>
          generateFileUrl('degree', teacher.id, index)
        ),
        otherDocumentsUrls: documents.otherDocuments.map((_, index) =>
          generateFileUrl('other', teacher.id, index)
        )
      };

      res.json({
        teacher: teacher.user,
        profile: {
          bio: teacher.bio,
          specialization: teacher.specialization,
          qualification: teacher.qualification,
          cnic: teacher.cnic,
          experience: teacher.experience,
          joiningDate: teacher.joiningDate,
          salary: teacher.salary,
          employmentType: teacher.employmentType
        },
        documents: documents,
        urls: documentUrls
      });

    } catch (error) {
      console.error('Get teacher with documents error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get student with all document info (without serving files)
  async getStudentWithDocuments(req, res) {
    try {
      const { id } = req.params;

      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profileImage: true,
              status: true,
              createdAt: true
            }
          },
          currentEnrollment: {
            include: {
              classRoom: {
                select: {
                  name: true,
                  grade: true,
                  type: true
                }
              }
            }
          }
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Parse document arrays
      const documents = {
        profileImage: student.profileImage,
        birthCertificate: student.birthCertificate,
        cnicOrBForm: student.cnicOrBForm,
        previousSchoolCertificate: student.previousSchoolCertificate,
        otherDocuments: student.otherDocuments ? JSON.parse(student.otherDocuments) : []
      };

      // Generate URLs for each document
      const generateFileUrl = (type, studentId, index = null) => {
        let url = `/api/admin/students/${studentId}/documents/${type}`;
        if (index !== null) {
          url += `?index=${index}`;
        }
        return url;
      };

      const documentUrls = {
        profileImageUrl: `/api/admin/files/profile-image/${student.userId}`,
        birthCertificateUrl: student.birthCertificate ? generateFileUrl('birth-certificate', student.id) : null,
        cnicBformUrl: student.cnicOrBForm ? generateFileUrl('cnic-bform', student.id) : null,
        previousSchoolCertificateUrl: student.previousSchoolCertificate ? generateFileUrl('previous-school', student.id) : null,
        otherDocumentsUrls: documents.otherDocuments.map((_, index) =>
          generateFileUrl('other', student.id, index)
        )
      };

      res.json({
        student: student.user,
        profile: {
          admissionNo: student.admissionNo,
          dateOfBirth: student.dob,
          gender: student.gender,
          guardianName: student.guardianName,
          guardianPhone: student.guardianPhone,
          address: student.address,
          city: student.city,
          province: student.province
        },
        academic: {
          currentClass: student.currentEnrollment?.classRoom,
          rollNumber: student.currentEnrollment?.rollNumber
        },
        documents: documents,
        urls: documentUrls
      });

    } catch (error) {
      console.error('Get student with documents error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Export all user documents as JSON info (not the actual files)
  async exportUserDocumentsInfo(req, res) {
    try {
      const { userId, userType } = req.params;

      let documents = [];
      let userInfo = {};

      if (userType === 'teacher') {
        const teacher = await prisma.teacher.findFirst({
          where: { userId },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        });

        if (teacher) {
          userInfo = {
            type: 'teacher',
            name: teacher.user.name,
            email: teacher.user.email,
            teacherId: teacher.id
          };

          documents = [
            { type: 'profile-image', path: teacher.profileImage, url: `/api/admin/files/profile-image/${userId}` },
            { type: 'cnic-front', path: teacher.cnicFront, url: teacher.cnicFront ? `/api/admin/teachers/${teacher.id}/documents/cnic-front` : null },
            { type: 'cnic-back', path: teacher.cnicBack, url: teacher.cnicBack ? `/api/admin/teachers/${teacher.id}/documents/cnic-back` : null },
            ...(teacher.degreeDocuments ? JSON.parse(teacher.degreeDocuments).map((path, index) => ({
              type: 'degree',
              index,
              path,
              url: `/api/admin/teachers/${teacher.id}/documents/degree?index=${index}`
            })) : []),
            ...(teacher.otherDocuments ? JSON.parse(teacher.otherDocuments).map((path, index) => ({
              type: 'other',
              index,
              path,
              url: `/api/admin/teachers/${teacher.id}/documents/other?index=${index}`
            })) : [])
          ].filter(doc => doc.path); // Only include documents that have paths
        }
      } else if (userType === 'student') {
        const student = await prisma.student.findFirst({
          where: { userId },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        });

        if (student) {
          userInfo = {
            type: 'student',
            name: student.user.name,
            email: student.user.email,
            studentId: student.id,
            admissionNo: student.admissionNo
          };

          documents = [
            { type: 'profile-image', path: student.profileImage, url: `/api/admin/files/profile-image/${userId}` },
            { type: 'birth-certificate', path: student.birthCertificate, url: student.birthCertificate ? `/api/admin/students/${student.id}/documents/birth-certificate` : null },
            { type: 'cnic-bform', path: student.cnicOrBForm, url: student.cnicOrBForm ? `/api/admin/students/${student.id}/documents/cnic-bform` : null },
            { type: 'previous-school', path: student.previousSchoolCertificate, url: student.previousSchoolCertificate ? `/api/admin/students/${student.id}/documents/previous-school` : null },
            ...(student.otherDocuments ? JSON.parse(student.otherDocuments).map((path, index) => ({
              type: 'other',
              index,
              path,
              url: `/api/admin/students/${student.id}/documents/other?index=${index}`
            })) : [])
          ].filter(doc => doc.path);
        }
      }

      res.json({
        user: userInfo,
        documents: documents,
        summary: {
          totalDocuments: documents.length,
          availableForDownload: documents.filter(doc => doc.url).length
        }
      });

    } catch (error) {
      console.error('Export documents info error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }


}

module.exports = new AdminController();