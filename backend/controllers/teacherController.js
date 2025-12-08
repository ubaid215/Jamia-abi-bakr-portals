const prisma = require('../db/prismaClient');

class TeacherController {
  // Get teacher's dashboard data
async getTeacherDashboard(req, res) {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            profileImage: true
          }
        },
        classes: {
          include: {
            _count: {
              select: {
                enrollments: {
                  where: { isCurrent: true }
                },
                subjects: true
              }
            },
            enrollments: {
              where: { isCurrent: true },
              include: {
                student: {
                  include: {
                    user: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              },
              take: 5 // Recent 5 students
            }
          }
        },
        subjects: {
          include: {
            classRoom: {
              select: {
                name: true,
                grade: true
              }
            }
          }
        },
        leaveRequests: {
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), 0, 1) // Current year
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Get today's attendance summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await prisma.attendance.count({
      where: {
        teacherId: teacher.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Get pending tasks (unmarked attendance for assigned classes)
    const assignedClassIds = teacher.classes.map(cls => cls.id);
    const pendingAttendanceClasses = await prisma.classRoom.findMany({
      where: {
        id: { in: assignedClassIds }
      },
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

    // FIXED: Handle null classRoom in subjects
    const dashboardData = {
      teacher: {
        id: teacher.id,
        name: teacher.user.name,
        email: teacher.user.email,
        profileImage: teacher.user.profileImage,
        specialization: teacher.specialization,
        experience: teacher.experience
      },
      summary: {
        totalClasses: teacher.classes.length,
        totalSubjects: teacher.subjects.length,
        totalStudents: teacher.classes.reduce((sum, cls) => sum + cls._count.enrollments, 0),
        todayAttendance,
        pendingLeaveRequests: teacher.leaveRequests.filter(lr => lr.status === 'PENDING').length
      },
      classes: teacher.classes.map(cls => ({
        id: cls.id,
        name: cls.name,
        grade: cls.grade || '',
        section: cls.section || '',
        type: cls.type,
        studentCount: cls._count.enrollments,
        subjectCount: cls._count.subjects,
        recentStudents: cls.enrollments.map(enrollment => ({
          id: enrollment.student.id,
          name: enrollment.student.user?.name || 'Unknown',
          rollNumber: enrollment.rollNumber
        }))
      })),
      subjects: teacher.subjects.map(subject => ({
        id: subject.id,
        name: subject.name,
        code: subject.code || '',
        // FIX: Handle null classRoom
        class: subject.classRoom?.name || 'Not Assigned',
        grade: subject.classRoom?.grade || ''
      })),
      recentLeaveRequests: teacher.leaveRequests,
      pendingTasks: {
        attendanceToMark: pendingAttendanceClasses.length,
        classesNeedingAttention: pendingAttendanceClasses.map(cls => ({
          id: cls.id,
          name: cls.name,
          studentCount: cls._count.enrollments
        }))
      }
    };

    res.json(dashboardData);

  } catch (error) {
    console.error('Get teacher dashboard error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

  // Get teacher's assigned classes
  async getMyClasses(req, res) {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
        include: {
          classes: {
            include: {
              _count: {
                select: {
                  enrollments: {
                    where: { isCurrent: true }
                  },
                  subjects: true
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

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      res.json({
        classes: teacher.classes
      });

    } catch (error) {
      console.error('Get my classes error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get teacher's assigned subjects
async getMySubjects(req, res) {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
      include: {
        subjects: {
          include: {
            classRoom: {
              select: {
                id: true,
                name: true,
                grade: true,
                type: true
              }
            },
            _count: {
              select: {
                attendances: true,
                dailyReports: true
              }
            }
          }
        },
        teacherSubjects: {
          include: {
            subject: {
              include: {
                classRoom: {
                  select: {
                    name: true,
                    grade: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Combine directly assigned subjects and teacherSubject relationships
    const allSubjects = [
      ...teacher.subjects.map(subject => ({
        ...subject,
        classRoomName: subject.classRoom?.name || 'Not Assigned',
        classRoomGrade: subject.classRoom?.grade || ''
      })),
      ...teacher.teacherSubjects.map(ts => ({
        ...ts.subject,
        classRoomName: ts.subject.classRoom?.name || 'Not Assigned',
        classRoomGrade: ts.subject.classRoom?.grade || ''
      }))
    ];

    res.json({
      subjects: allSubjects
    });

  } catch (error) {
    console.error('Get my subjects error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

  // Get students in teacher's classes
  async getMyStudents(req, res) {
    try {
      const { classRoomId, page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
        include: {
          classes: {
            where: classRoomId ? { id: classRoomId } : undefined,
            select: { id: true }
          }
        }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      const classIds = teacher.classes.map(cls => cls.id);

      if (classIds.length === 0) {
        return res.json({
          students: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }

      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where: {
            classRoomId: { in: classIds },
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
            },
            classRoom: {
              select: {
                id: true,
                name: true,
                grade: true,
                type: true
              }
            }
          },
          orderBy: [
            { classRoom: { name: 'asc' } },
            { rollNumber: 'asc' }
          ]
        }),
        prisma.enrollment.count({
          where: {
            classRoomId: { in: classIds },
            isCurrent: true
          }
        })
      ]);

      res.json({
        students: enrollments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get my students error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Apply for leave
  async applyForLeave(req, res) {
    try {
      const {
        fromDate,
        toDate,
        reason,
        supportingDocuments
      } = req.body;

      if (!fromDate || !toDate || !reason) {
        return res.status(400).json({ 
          error: 'From date, to date, and reason are required' 
        });
      }

      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      // Check for overlapping leave requests
      const overlappingLeave = await prisma.leaveRequest.findFirst({
        where: {
          teacherId: teacher.id,
          status: 'PENDING',
          OR: [
            {
              fromDate: { lte: new Date(toDate) },
              toDate: { gte: new Date(fromDate) }
            }
          ]
        }
      });

      if (overlappingLeave) {
        return res.status(400).json({ 
          error: 'You already have a pending leave request for this period' 
        });
      }

      // Find an admin to apply to
      const admin = await prisma.user.findFirst({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          status: 'ACTIVE'
        },
        orderBy: { createdAt: 'asc' }
      });

      if (!admin) {
        return res.status(400).json({ error: 'No active admin found to process leave request' });
      }

      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          teacherId: teacher.id,
          adminId: admin.id,
          fromDate: new Date(fromDate),
          toDate: new Date(toDate),
          reason,
          supportingDocuments: supportingDocuments ? JSON.stringify(supportingDocuments) : null,
          status: 'PENDING'
        },
        include: {
          appliedToAdmin: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.status(201).json({
        message: 'Leave request submitted successfully',
        leaveRequest
      });

    } catch (error) {
      console.error('Apply for leave error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get teacher's leave history
  async getMyLeaveHistory(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const skip = (page - 1) * limit;

      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      const where = { teacherId: teacher.id };
      if (status) {
        where.status = status;
      }

      const [leaveRequests, total] = await Promise.all([
        prisma.leaveRequest.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            appliedToAdmin: {
              select: {
                id: true,
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
      console.error('Get leave history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get today's attendance status for teacher's classes
  async getTodaysAttendance(req, res) {
    try {
      const { classRoomId } = req.query;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
        include: {
          classes: {
            where: classRoomId ? { id: classRoomId } : undefined,
            include: {
              enrollments: {
                where: { isCurrent: true },
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
                  // Get today's attendance for each student
                  student: {
                    include: {
                      attendances: {
                        where: {
                          date: {
                            gte: today,
                            lt: tomorrow
                          },
                          classRoomId: { in: classRoomId ? [classRoomId] : undefined }
                        },
                        take: 1
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      const attendanceData = teacher.classes.map(cls => ({
        class: {
          id: cls.id,
          name: cls.name,
          grade: cls.grade,
          type: cls.type
        },
        students: cls.enrollments.map(enrollment => {
          const todayAttendance = enrollment.student.attendances[0];
          return {
            studentId: enrollment.student.id,
            studentName: enrollment.student.user.name,
            rollNumber: enrollment.rollNumber,
            attendance: todayAttendance ? {
              status: todayAttendance.status,
              remarks: todayAttendance.remarks,
              subject: todayAttendance.subjectId ? { id: todayAttendance.subjectId } : null
            } : null
          };
        })
      }));

      res.json({ attendanceData });

    } catch (error) {
      console.error('Get today\'s attendance error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get teacher's recent activities
  async getMyActivities(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      // Get recent attendance records
      const recentAttendance = await prisma.attendance.findMany({
        where: { teacherId: teacher.id },
        skip: parseInt(skip),
        take: parseInt(limit),
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
          },
          subject: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Get recent progress records
      const recentHifzProgress = await prisma.hifzProgress.findMany({
        where: { teacherId: teacher.id },
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          student: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const recentNazraProgress = await prisma.nazraProgress.findMany({
        where: { teacherId: teacher.id },
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          student: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const recentRegularProgress = await prisma.subjectProgress.findMany({
        where: { teacherId: teacher.id },
        skip: parseInt(skip),
        take: parseInt(limit),
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
          subject: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Combine all activities
      const activities = [
        ...recentAttendance.map(att => ({
          type: 'ATTENDANCE',
          date: att.createdAt,
          description: `Marked ${att.status.toLowerCase()} attendance for ${att.student.user.name}`,
          details: {
            student: att.student.user.name,
            class: att.classRoom.name,
            subject: att.subject?.name,
            status: att.status
          }
        })),
        ...recentHifzProgress.map(progress => ({
          type: 'HIFZ_PROGRESS',
          date: progress.createdAt,
          description: `Recorded Hifz progress for ${progress.student.user.name}`,
          details: {
            student: progress.student.user.name,
            sabaqLines: progress.sabaqLines,
            sabqiLines: progress.sabqiLines,
            mistakes: progress.mistakes
          }
        })),
        ...recentNazraProgress.map(progress => ({
          type: 'NAZRA_PROGRESS',
          date: progress.createdAt,
          description: `Recorded Nazra progress for ${progress.student.user.name}`,
          details: {
            student: progress.student.user.name,
            recitedLines: progress.recitedLines,
            mistakes: progress.mistakes
          }
        })),
        ...recentRegularProgress.map(progress => ({
          type: 'REGULAR_PROGRESS',
          date: progress.createdAt,
          description: `Recorded assessment for ${progress.student.user.name} in ${progress.subject.name}`,
          details: {
            student: progress.student.user.name,
            subject: progress.subject.name,
            marks: `${progress.obtainedMarks}/${progress.totalMarks}`,
            grade: progress.grade
          }
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))
       .slice(0, limit);

      res.json({
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: activities.length,
          pages: Math.ceil(activities.length / limit)
        }
      });

    } catch (error) {
      console.error('Get my activities error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update teacher profile
  async updateMyProfile(req, res) {
    try {
      const {
        bio,
        phoneSecondary,
        address,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation
      } = req.body;

      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      const updatedTeacher = await prisma.teacher.update({
        where: { id: teacher.id },
        data: {
          bio: bio || undefined,
          phoneSecondary: phoneSecondary || undefined,
          address: address || undefined,
          emergencyContactName: emergencyContactName || undefined,
          emergencyContactPhone: emergencyContactPhone || undefined,
          emergencyContactRelation: emergencyContactRelation || undefined
        },
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
      });

      res.json({
        message: 'Profile updated successfully',
        teacher: updatedTeacher
      });

    } catch (error) {
      console.error('Update teacher profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new TeacherController();