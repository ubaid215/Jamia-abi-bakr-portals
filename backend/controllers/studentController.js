const prisma = require('../db/prismaClient');
const logger = require('../utils/logger');

class StudentController {
  // Get student dashboard data
  async getStudentDashboard(req, res) {
    try {
      logger.info({ userId: req.user.id }, 'Fetching dashboard for user');

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
        include: {
          user: { select: { name: true, email: true, phone: true, profileImage: true } },
          currentEnrollment: {
            include: {
              classRoom: {
                include: {
                  teacher: { include: { user: { select: { name: true } } } },
                  subjects: {
                    include: { teacher: { include: { user: { select: { name: true } } } } },
                  },
                },
              },
            },
          },
          parents: { include: { user: { select: { name: true, email: true, phone: true } } } },
        },
      });

      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      logger.debug({ studentId: student.id }, 'Found student');

      // ── Current month attendance ──────────────────────────────────────
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const currentMonthAttendance = await prisma.attendance.findMany({
        where: { studentId: student.id, date: { gte: monthStart, lte: monthEnd } },
        select: { status: true, date: true },
      });

      logger.debug({ count: currentMonthAttendance.length }, 'Current month attendance records');

      const present = currentMonthAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      const absent = currentMonthAttendance.filter(a => a.status === 'ABSENT').length;
      const late = currentMonthAttendance.filter(a => a.status === 'LATE').length;
      const totalDays = currentMonthAttendance.length;
      const percentage = totalDays > 0 ? Math.round((present / totalDays) * 100 * 100) / 100 : 0;

      // ── Recent attendance (last 5 records) ────────────────────────────
      const recentAttendance = await prisma.attendance.findMany({
        where: { studentId: student.id },
        orderBy: { date: 'desc' },
        take: 5,
        include: {
          subject: { select: { name: true } },
        },
      });

      logger.debug({ count: recentAttendance.length }, 'Recent attendance records');

      // ── Progress info ─────────────────────────────────────────────────
      let progressInfo = null;
      const classType = student.currentEnrollment?.classRoom?.type;

      if (classType) {
        let completionStats = {};
        if (classType === 'HIFZ') {
          completionStats = await this.calculateHifzCompletion(student.id);
        } else if (classType === 'NAZRA') {
          completionStats = await this.calculateNazraCompletion(student.id);
        } else if (classType === 'REGULAR') {
          const avg = await prisma.subjectProgress.aggregate({
            where: { studentId: student.id },
            _avg: { percentage: true },
          });
          const recentAssessments = await prisma.subjectProgress.findMany({
            where: { studentId: student.id },
            orderBy: { date: 'desc' },
            take: 5,
            include: { subject: { select: { name: true } } },
          });
          completionStats = {
            averagePercentage: Math.round((avg._avg.percentage || 0) * 100) / 100,
            recentAssessments,
          };
        }
        progressInfo = { type: classType, completionStats };
      }

      // ── Assemble dashboard data ───────────────────────────────────────
      const classRoom = student.currentEnrollment?.classRoom;
      const dashboardData = {
        student: {
          name: student.user.name,
          admissionNo: student.admissionNo,
          profileImage: student.user.profileImage,
        },
        currentClass: classRoom ? {
          name: classRoom.name,
          grade: classRoom.grade,
          section: classRoom.section,
          type: classRoom.type,
          classTeacher: classRoom.teacher?.user?.name || null,
          subjects: (classRoom.subjects || []).map(s => ({
            name: s.name,
            teacher: s.teacher ? { name: s.teacher.user.name } : null,
          })),
        } : null,
        attendance: {
          currentMonth: { present, absent, late, total: totalDays, percentage },
          recent: recentAttendance.map(a => ({
            date: a.date,
            status: a.status,
            subject: a.subject || null,
          })),
        },
        progress: progressInfo,
        parents: (student.parents || []).map(p => ({
          name: p.user.name,
          email: p.user.email,
          phone: p.user.phone,
        })),
      };

      logger.info('Dashboard data prepared successfully');
      res.json(dashboardData);

    } catch (error) {
      logger.error({ err: error }, 'Get student dashboard error');
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // Get student's attendance history
  async getMyAttendance(req, res) {
    try {
      const { startDate, endDate, page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id }
      });

      if (!student) {
        logger.warn({ userId: req.user.id }, 'Student profile not found for attendance history');
        return res.status(404).json({ error: 'Student profile not found' });
      }

      logger.debug({ studentId: student.id }, 'Fetching attendance for student');

      const where = { studentId: student.id };

      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      const [attendance, total] = await Promise.all([
        prisma.attendance.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            subject: {
              select: {
                name: true
              }
            },
            classRoom: {
              select: {
                name: true,
                type: true
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
          },
          orderBy: { date: 'desc' }
        }),
        prisma.attendance.count({ where })
      ]);

      // Calculate statistics
      const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
      const absentCount = attendance.filter(a => a.status === 'ABSENT').length;
      const lateCount = attendance.filter(a => a.status === 'LATE').length;
      const excusedCount = attendance.filter(a => a.status === 'EXCUSED').length;

      res.json({
        attendance,
        statistics: {
          total: attendance.length,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          excused: excusedCount,
          attendancePercentage: attendance.length > 0 ?
            Math.round(((presentCount + lateCount) / attendance.length) * 100 * 100) / 100 : 0
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error({ err: error }, 'Get my attendance error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get student's progress history based on class type
  async getMyProgress(req, res) {
    try {
      const { type, startDate, endDate, page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
        include: {
          currentEnrollment: {
            include: {
              classRoom: true
            }
          }
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      // Determine progress type based on current class or specified type
      const progressType = type || student.currentEnrollment?.classRoom.type;

      if (!progressType) {
        return res.status(400).json({ error: 'Progress type not specified and no current enrollment found' });
      }

      let progress;
      let total;
      let completionStats;

      const dateFilter = startDate && endDate ? {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {};

      if (progressType === 'HIFZ') {
        [progress, total] = await Promise.all([
          prisma.hifzProgress.findMany({
            where: {
              studentId: student.id,
              ...dateFilter
            },
            skip: parseInt(skip),
            take: parseInt(limit),
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
            },
            orderBy: { date: 'desc' }
          }),
          prisma.hifzProgress.count({
            where: {
              studentId: student.id,
              ...dateFilter
            }
          })
        ]);

        completionStats = await this.calculateHifzCompletion(student.id);
      } else if (progressType === 'NAZRA') {
        [progress, total] = await Promise.all([
          prisma.nazraProgress.findMany({
            where: {
              studentId: student.id,
              ...dateFilter
            },
            skip: parseInt(skip),
            take: parseInt(limit),
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
            },
            orderBy: { date: 'desc' }
          }),
          prisma.nazraProgress.count({
            where: {
              studentId: student.id,
              ...dateFilter
            }
          })
        ]);

        completionStats = await this.calculateNazraCompletion(student.id);
      } else if (progressType === 'REGULAR') {
        [progress, total] = await Promise.all([
          prisma.subjectProgress.findMany({
            where: {
              studentId: student.id,
              ...dateFilter
            },
            skip: parseInt(skip),
            take: parseInt(limit),
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
            },
            orderBy: { date: 'desc' }
          }),
          prisma.subjectProgress.count({
            where: {
              studentId: student.id,
              ...dateFilter
            }
          })
        ]);

        // Calculate average for regular students
        const averageResult = await prisma.subjectProgress.aggregate({
          where: { studentId: student.id },
          _avg: {
            percentage: true
          }
        });

        completionStats = {
          averagePercentage: Math.round((averageResult._avg.percentage || 0) * 100) / 100
        };
      } else {
        return res.status(400).json({ error: 'Invalid progress type. Must be HIFZ, NAZRA, or REGULAR' });
      }

      res.json({
        student: {
          id: student.id,
          name: student.user?.name,
          admissionNo: student.admissionNo
        },
        progressType,
        progress,
        completionStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error({ err: error }, 'Get my progress error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get student's class history (all enrollments)
  async getMyClassHistory(req, res) {
    try {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
        include: {
          enrollments: {
            include: {
              classRoom: {
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
            },
            orderBy: { startDate: 'desc' }
          }
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      const classHistory = student.enrollments.map(enrollment => ({
        id: enrollment.id,
        classRoom: {
          id: enrollment.classRoom.id,
          name: enrollment.classRoom.name,
          grade: enrollment.classRoom.grade,
          section: enrollment.classRoom.section,
          type: enrollment.classRoom.type,
          classTeacher: enrollment.classRoom.teacher?.user.name
        },
        rollNumber: enrollment.rollNumber,
        startDate: enrollment.startDate,
        endDate: enrollment.endDate,
        isCurrent: enrollment.isCurrent,
        promotedTo: enrollment.promotedTo
      }));

      res.json({
        student: {
          id: student.id,
          name: student.user?.name,
          admissionNo: student.admissionNo
        },
        classHistory
      });

    } catch (error) {
      logger.error({ err: error }, 'Get class history error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get student's current class details
  async getMyCurrentClass(req, res) {
    try {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
        include: {
          currentEnrollment: {
            include: {
              classRoom: {
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
          }
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      if (!student.currentEnrollment) {
        return res.status(404).json({ error: 'No current enrollment found' });
      }

      res.json({
        student: {
          id: student.id,
          name: student.user?.name,
          admissionNo: student.admissionNo,
          rollNumber: student.currentEnrollment.rollNumber
        },
        currentClass: {
          id: student.currentEnrollment.classRoom.id,
          name: student.currentEnrollment.classRoom.name,
          grade: student.currentEnrollment.classRoom.grade,
          section: student.currentEnrollment.classRoom.section,
          type: student.currentEnrollment.classRoom.type,
          description: student.currentEnrollment.classRoom.description,
          classTeacher: student.currentEnrollment.classRoom.teacher ? {
            id: student.currentEnrollment.classRoom.teacher.id,
            name: student.currentEnrollment.classRoom.teacher.user.name,
            email: student.currentEnrollment.classRoom.teacher.user.email,
            phone: student.currentEnrollment.classRoom.teacher.user.phone
          } : null,
          subjects: student.currentEnrollment.classRoom.subjects.map(subject => ({
            id: subject.id,
            name: subject.name,
            code: subject.code,
            teacher: subject.teacher ? {
              name: subject.teacher.user.name
            } : null
          }))
        }
      });

    } catch (error) {
      logger.error({ err: error }, 'Get current class error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get student's profile information
  async getMyProfile(req, res) {
    try {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              profileImage: true,
              createdAt: true
            }
          },
          currentEnrollment: {
            include: {
              classRoom: {
                select: {
                  name: true,
                  grade: true
                }
              }
            }
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
          }
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      const profileData = {
        personalInfo: {
          name: student.user.name,
          email: student.user.email,
          phone: student.user.phone,
          profileImage: student.user.profileImage,
          admissionNo: student.admissionNo,
          dateOfBirth: student.dob,
          gender: student.gender,
          bloodGroup: student.bloodGroup,
          nationality: student.nationality,
          religion: student.religion,
          placeOfBirth: student.placeOfBirth
        },
        academicInfo: {
          currentClass: student.currentEnrollment ? {
            name: student.currentEnrollment.classRoom.name,
            grade: student.currentEnrollment.classRoom.grade,
            rollNumber: student.currentEnrollment.rollNumber
          } : null,
          admissionDate: student.createdAt
        },
        guardianInfo: {
          primaryGuardian: {
            name: student.guardianName,
            relation: student.guardianRelation,
            phone: student.guardianPhone,
            email: student.guardianEmail,
            occupation: student.guardianOccupation,
            cnic: student.guardianCNIC
          },
          secondaryGuardian: student.guardian2Name ? {
            name: student.guardian2Name,
            relation: student.guardian2Relation,
            phone: student.guardian2Phone,
            email: student.guardian2Email
          } : null
        },
        contactInfo: {
          address: student.address,
          city: student.city,
          province: student.province,
          postalCode: student.postalCode,
          emergencyContact: student.emergencyContactName ? {
            name: student.emergencyContactName,
            relation: student.emergencyContactRelation,
            phone: student.emergencyContactPhone
          } : null
        },
        medicalInfo: {
          medicalConditions: student.medicalConditions,
          allergies: student.allergies,
          medication: student.medication
        },
        parents: student.parents.map(parent => ({
          id: parent.id,
          name: parent.user.name,
          email: parent.user.email,
          phone: parent.user.phone
        }))
      };

      res.json(profileData);

    } catch (error) {
      logger.error({ err: error }, 'Get my profile error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update student profile (limited fields)
  async updateMyProfile(req, res) {
    try {
      const {
        phone,
        profileImage,
        address,
        city,
        province,
        postalCode,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
        medicalConditions,
        allergies,
        medication
      } = req.body;

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      // Update user table
      if (phone || profileImage) {
        await prisma.user.update({
          where: { id: req.user.id },
          data: {
            phone: phone || undefined,
            profileImage: profileImage || undefined
          }
        });
      }

      // Update student table
      const updatedStudent = await prisma.student.update({
        where: { id: student.id },
        data: {
          address: address || undefined,
          city: city || undefined,
          province: province || undefined,
          postalCode: postalCode || undefined,
          emergencyContactName: emergencyContactName || undefined,
          emergencyContactPhone: emergencyContactPhone || undefined,
          emergencyContactRelation: emergencyContactRelation || undefined,
          medicalConditions: medicalConditions || undefined,
          allergies: allergies || undefined,
          medication: medication || undefined
        },
        include: {
          user: {
            select: {
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
        student: updatedStudent
      });

    } catch (error) {
      logger.error({ err: error }, 'Update student profile error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Helper methods for progress calculations (copied from progressController)
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

module.exports = new StudentController();