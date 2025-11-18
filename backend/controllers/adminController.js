const bcrypt = require('bcryptjs');
const prisma = require('../db/prismaClient');
const { generateStrongPassword, generateEmail } = require('../utils/passwordGenerator');

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

  // Get student details by ID
  async getStudentDetails(req, res) {
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
              subject: {
                select: {
                  name: true
                }
              },
              classRoom: {
                select: {
                  name: true
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
              }
            }
          }
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Get progress based on current class type
      let progressData = {};
      if (student.currentEnrollment) {
        const classType = student.currentEnrollment.classRoom.type;
        
        if (classType === 'HIFZ') {
          const hifzProgress = await prisma.hifzProgress.findMany({
            where: { studentId: student.id },
            orderBy: { date: 'desc' },
            take: 10,
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

          const completionStats = await this.calculateHifzCompletion(student.id);
          progressData = {
            type: 'HIFZ',
            progress: hifzProgress,
            completionStats
          };
        } else if (classType === 'NAZRA') {
          const nazraProgress = await prisma.nazraProgress.findMany({
            where: { studentId: student.id },
            orderBy: { date: 'desc' },
            take: 10,
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

          const completionStats = await this.calculateNazraCompletion(student.id);
          progressData = {
            type: 'NAZRA',
            progress: nazraProgress,
            completionStats
          };
        } else if (classType === 'REGULAR') {
          const assessments = await prisma.subjectProgress.findMany({
            where: { studentId: student.id },
            orderBy: { date: 'desc' },
            take: 10,
            include: {
              subject: {
                select: {
                  name: true
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
              }
            }
          });

          const averageResult = await prisma.subjectProgress.aggregate({
            where: { studentId: student.id },
            _avg: {
              percentage: true
            }
          });

          progressData = {
            type: 'REGULAR',
            assessments,
            averagePercentage: Math.round((averageResult._avg.percentage || 0) * 100) / 100
          };
        }
      }

      // Calculate attendance statistics
      const totalAttendance = student.attendances.length;
      const presentAttendance = student.attendances.filter(a => 
        a.status === 'PRESENT' || a.status === 'LATE'
      ).length;
      const attendancePercentage = totalAttendance > 0 ? 
        (presentAttendance / totalAttendance) * 100 : 0;

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
      console.error('Get student details error:', error);
      res.status(500).json({ error: 'Internal server error' });
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


}

module.exports = new AdminController();