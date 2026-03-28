const prisma = require('../db/prismaClient');
const logger = require('../utils/logger');

// ─── Shared query fragments ───────────────────────────────────────────────────

const userSelect = {
  select: { id: true, name: true, email: true, phone: true, profileImage: true, status: true }
};

// Returns an include block that fetches classTeachers (join table) with full
// classroom data — used wherever we need all classes a teacher belongs to.
const classTeachersFullInclude = {
  classTeachers: {
    include: {
      classRoom: {
        include: {
          _count: {
            select: {
              enrollments: { where: { isCurrent: true } },
              subjects: true
            }
          },
          subjects: {
            include: {
              teacher: {
                include: { user: { select: { id: true, name: true } } }
              }
            }
          },
          teacher: {
            include: { user: { select: { id: true, name: true } } }
          }
        }
      }
    },
    orderBy: { assignedAt: 'asc' }
  }
};

// ─── Helper: deduplicated, merged class list from both relations ──────────────
// A teacher may appear in ClassRoom.teacherId (primary teacher) AND in
// classTeachers (join table), so we deduplicate by class ID and always prefer
// the richer record. Returns an array of { classRoom, role } objects.
function mergeTeacherClasses(teacher) {
  const seen = new Map(); // classRoomId → { classRoom, role }

  // 1. Classes where this teacher is the primary teacher
  //    (ClassRoom.teacherId = teacher.id, reflected in teacher.classes[])
  for (const cls of teacher.classes || []) {
    seen.set(cls.id, { classRoom: cls, role: 'CLASS_TEACHER' });
  }

  // 2. Classes assigned via the ClassTeacher join table (any role)
  for (const ct of teacher.classTeachers || []) {
    if (!seen.has(ct.classRoomId)) {
      seen.set(ct.classRoomId, { classRoom: ct.classRoom, role: ct.role });
    }
    // If already seen via teacher.classes, update the role from join table
    // (the join table is the authoritative role source)
    else {
      const existing = seen.get(ct.classRoomId);
      seen.set(ct.classRoomId, { ...existing, role: ct.role });
    }
  }

  return Array.from(seen.values());
}

// ─── Controller ───────────────────────────────────────────────────────────────

class TeacherController {

  // ============================================================
  // DASHBOARD
  // ============================================================
  async getTeacherDashboard(req, res) {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
        include: {
          user: {
            select: { name: true, email: true, profileImage: true }
          },

          // ✅ OLD relation: classes where this teacher is the PRIMARY teacher
          classes: {
            include: {
              _count: {
                select: {
                  enrollments: { where: { isCurrent: true } },
                  subjects: true
                }
              },
              enrollments: {
                where: { isCurrent: true },
                include: {
                  student: {
                    include: { user: { select: { name: true } } }
                  }
                },
                take: 5
              }
            }
          },

          // ✅ NEW: classes assigned via join table (SUBJECT_TEACHER, CO_TEACHER, etc.)
          classTeachers: {
            include: {
              classRoom: {
                include: {
                  _count: {
                    select: {
                      enrollments: { where: { isCurrent: true } },
                      subjects: true
                    }
                  },
                  enrollments: {
                    where: { isCurrent: true },
                    include: {
                      student: {
                        include: { user: { select: { name: true } } }
                      }
                    },
                    take: 5
                  }
                }
              }
            }
          },

          subjects: {
            include: {
              classRoom: { select: { name: true, grade: true } }
            }
          },
          leaveRequests: {
            where: {
              createdAt: { gte: new Date(new Date().getFullYear(), 0, 1) }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      // Deduplicate and merge both class sources
      const allClasses = mergeTeacherClasses(teacher);
      const allClassRooms = allClasses.map(ac => ac.classRoom);

      // Today's attendance count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAttendance = await prisma.attendance.count({
        where: {
          teacherId: teacher.id,
          date: { gte: today, lt: tomorrow }
        }
      });

      const dashboardData = {
        teacher: {
          id:             teacher.id,
          name:           teacher.user.name,
          email:          teacher.user.email,
          profileImage:   teacher.user.profileImage,
          specialization: teacher.specialization,
          userId:         teacher.userId,
          experience:     teacher.experience
        },
        summary: {
          totalClasses:    allClasses.length,
          totalSubjects:   teacher.subjects.length,
          totalStudents:   allClassRooms.reduce((sum, cls) => sum + (cls._count?.enrollments ?? 0), 0),
          todayAttendance,
          pendingLeaveRequests: teacher.leaveRequests.filter(lr => lr.status === 'PENDING').length
        },
        classes: allClasses.map(({ classRoom: cls, role }) => ({
          id:           cls.id,
          name:         cls.name,
          grade:        cls.grade   || '',
          section:      cls.section || '',
          type:         cls.type,
          role,                              // ✅ teacher's role in this class
          studentCount: cls._count?.enrollments ?? 0,
          subjectCount: cls._count?.subjects    ?? 0,
          recentStudents: (cls.enrollments || []).map(e => ({
            id:         e.student.id,
            name:       e.student.user?.name || 'Unknown',
            rollNumber: e.rollNumber
          }))
        })),
        subjects: teacher.subjects.map(subject => ({
          id:    subject.id,
          name:  subject.name,
          code:  subject.code || '',
          class: subject.classRoom?.name  || 'Not Assigned',
          grade: subject.classRoom?.grade || ''
        })),
        recentLeaveRequests: teacher.leaveRequests,
        pendingTasks: {
          attendanceToMark: allClasses.length,
          classesNeedingAttention: allClasses.map(({ classRoom: cls }) => ({
            id:           cls.id,
            name:         cls.name,
            studentCount: cls._count?.enrollments ?? 0
          }))
        }
      };

      res.json(dashboardData);

    } catch (error) {
      logger.error({ err: error }, 'Get teacher dashboard error');
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  // ============================================================
  // MY CLASSES
  // ============================================================
  async getMyClasses(req, res) {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
        include: {
          // Primary-teacher classes
          classes: {
            include: {
              _count: {
                select: {
                  enrollments: { where: { isCurrent: true } },
                  subjects: true
                }
              },
              subjects: {
                include: {
                  teacher: {
                    include: { user: { select: { name: true } } }
                  }
                }
              },
              teacher: {
                include: { user: { select: { name: true } } }
              },
              // ✅ also return classTeachers so the UI knows all assigned teachers
              classTeachers: {
                include: {
                  teacher: {
                    include: { user: { select: { id: true, name: true, email: true } } }
                  }
                }
              }
            }
          },

          // Join-table classes
          classTeachers: {
            include: {
              classRoom: {
                include: {
                  _count: {
                    select: {
                      enrollments: { where: { isCurrent: true } },
                      subjects: true
                    }
                  },
                  subjects: {
                    include: {
                      teacher: {
                        include: { user: { select: { name: true } } }
                      }
                    }
                  },
                  teacher: {
                    include: { user: { select: { name: true } } }
                  },
                  classTeachers: {
                    include: {
                      teacher: {
                        include: { user: { select: { id: true, name: true, email: true } } }
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

      const allClasses = mergeTeacherClasses(teacher);

      res.json({
        classes: allClasses.map(({ classRoom, role }) => ({
          ...classRoom,
          myRole: role   // ✅ surface the teacher's specific role in each class
        }))
      });

    } catch (error) {
      logger.error({ err: error }, 'Get my classes error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // MY SUBJECTS
  // ============================================================
  async getMySubjects(req, res) {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
        include: {
          subjects: {
            include: {
              classRoom: { select: { id: true, name: true, grade: true, type: true } },
              _count: { select: { attendances: true, dailyReports: true } }
            }
          },
          teacherSubjects: {
            include: {
              subject: {
                include: {
                  classRoom: { select: { name: true, grade: true } }
                }
              }
            }
          }
        }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      // Deduplicate subjects from both sources
      const subjectMap = new Map();

      for (const subject of teacher.subjects) {
        subjectMap.set(subject.id, {
          ...subject,
          classRoomName:  subject.classRoom?.name  || 'Not Assigned',
          classRoomGrade: subject.classRoom?.grade || ''
        });
      }

      for (const ts of teacher.teacherSubjects) {
        if (!subjectMap.has(ts.subject.id)) {
          subjectMap.set(ts.subject.id, {
            ...ts.subject,
            classRoomName:  ts.subject.classRoom?.name  || 'Not Assigned',
            classRoomGrade: ts.subject.classRoom?.grade || ''
          });
        }
      }

      res.json({ subjects: Array.from(subjectMap.values()) });

    } catch (error) {
      logger.error({ err: error }, 'Get my subjects error');
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  // ============================================================
  // MY STUDENTS
  // ============================================================
  async getMyStudents(req, res) {
    try {
      const { classRoomId, page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
        include: {
          // Primary-teacher classes (optionally filtered)
          classes: {
            where: classRoomId ? { id: classRoomId } : undefined,
            select: { id: true }
          },
          // Join-table classes (optionally filtered)
          classTeachers: {
            where: classRoomId ? { classRoomId } : undefined,
            select: { classRoomId: true }
          }
        }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      // Union of class IDs from both sources
      const classIdSet = new Set([
        ...teacher.classes.map(c => c.id),
        ...teacher.classTeachers.map(ct => ct.classRoomId)
      ]);
      const classIds = Array.from(classIdSet);

      if (classIds.length === 0) {
        return res.json({
          students: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 }
        });
      }

      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where: { classRoomId: { in: classIds }, isCurrent: true },
          skip:  parseInt(skip),
          take:  parseInt(limit),
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true, email: true, phone: true, profileImage: true } }
              }
            },
            classRoom: { select: { id: true, name: true, grade: true, type: true } }
          },
          orderBy: [
            { classRoom: { name: 'asc' } },
            { rollNumber: 'asc' }
          ]
        }),
        prisma.enrollment.count({
          where: { classRoomId: { in: classIds }, isCurrent: true }
        })
      ]);

      res.json({
        students: enrollments,
        pagination: {
          page:  parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error({ err: error }, 'Get my students error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // TODAY'S ATTENDANCE
  // ============================================================
  async getTodaysAttendance(req, res) {
    try {
      const { classRoomId } = req.query;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // First resolve which classes this teacher can access
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
        select: {
          id: true,
          classes:       { where: classRoomId ? { id: classRoomId } : undefined, select: { id: true } },
          classTeachers: { where: classRoomId ? { classRoomId } : undefined, select: { classRoomId: true } }
        }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      const classIdSet = new Set([
        ...teacher.classes.map(c => c.id),
        ...teacher.classTeachers.map(ct => ct.classRoomId)
      ]);
      const classIds = Array.from(classIdSet);

      // Now fetch each class with enrollments + today's attendance
      const classes = await prisma.classRoom.findMany({
        where: { id: { in: classIds } },
        include: {
          enrollments: {
            where: { isCurrent: true },
            include: {
              student: {
                include: {
                  user: { select: { name: true } },
                  attendances: {
                    where: {
                      date: { gte: today, lt: tomorrow },
                      classRoomId: classIds.length === 1 ? classIds[0] : undefined
                    },
                    take: 1
                  }
                }
              }
            }
          }
        }
      });

      const attendanceData = classes.map(cls => ({
        class: { id: cls.id, name: cls.name, grade: cls.grade, type: cls.type },
        students: cls.enrollments.map(enrollment => {
          const todayAtt = enrollment.student.attendances[0];
          return {
            studentId:   enrollment.student.id,
            studentName: enrollment.student.user?.name || 'Unknown',
            rollNumber:  enrollment.rollNumber,
            attendance: todayAtt ? {
              status:  todayAtt.status,
              remarks: todayAtt.remarks,
              subject: todayAtt.subjectId ? { id: todayAtt.subjectId } : null
            } : null
          };
        })
      }));

      res.json({ attendanceData });

    } catch (error) {
      logger.error({ err: error }, "Get today's attendance error");
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // ACTIVITIES
  // ============================================================
  async getMyActivities(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = parseInt((page - 1) * limit);
      const take = parseInt(limit);

      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
        select: { id: true }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      const [recentAttendance, recentHifzProgress, recentNazraProgress, recentRegularProgress] =
        await Promise.all([
          prisma.attendance.findMany({
            where: { teacherId: teacher.id },
            skip, take,
            include: {
              student:   { include: { user: { select: { name: true } } } },
              classRoom: { select: { name: true } },
              subject:   { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
          }),
          prisma.hifzProgress.findMany({
            where: { teacherId: teacher.id },
            skip, take,
            include: {
              student: { include: { user: { select: { name: true } } } }
            },
            orderBy: { createdAt: 'desc' }
          }),
          prisma.nazraProgress.findMany({
            where: { teacherId: teacher.id },
            skip, take,
            include: {
              student: { include: { user: { select: { name: true } } } }
            },
            orderBy: { createdAt: 'desc' }
          }),
          prisma.subjectProgress.findMany({
            where: { teacherId: teacher.id },
            skip, take,
            include: {
              student: { include: { user: { select: { name: true } } } },
              subject: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
          })
        ]);

      const activities = [
        ...recentAttendance.map(att => ({
          type: 'ATTENDANCE',
          date: att.createdAt,
          description: `Marked ${att.status.toLowerCase()} attendance for ${att.student.user?.name || 'Unknown'}`,
          details: {
            student: att.student.user?.name,
            class:   att.classRoom?.name,
            subject: att.subject?.name,
            status:  att.status
          }
        })),
        ...recentHifzProgress.map(p => ({
          type: 'HIFZ_PROGRESS',
          date: p.createdAt,
          description: `Recorded Hifz progress for ${p.student.user?.name || 'Unknown'}`,
          details: {
            student:   p.student.user?.name,
            sabaqLines: p.sabaqLines,
            mistakes:   p.totalMistakes
          }
        })),
        ...recentNazraProgress.map(p => ({
          type: 'NAZRA_PROGRESS',
          date: p.createdAt,
          description: `Recorded Nazra progress for ${p.student.user?.name || 'Unknown'}`,
          details: {
            student:     p.student.user?.name,
            recitedLines: p.recitedLines,
            mistakes:     p.mistakes
          }
        })),
        ...recentRegularProgress.map(p => ({
          type: 'REGULAR_PROGRESS',
          date: p.createdAt,
          description: `Recorded assessment for ${p.student.user?.name || 'Unknown'} in ${p.subject?.name || 'Unknown'}`,
          details: {
            student: p.student.user?.name,
            subject: p.subject?.name,
            marks:   `${p.obtainedMarks}/${p.totalMarks}`,
            grade:   p.grade
          }
        }))
      ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, take);

      res.json({
        activities,
        pagination: {
          page:  parseInt(page),
          limit: take,
          total: activities.length,
          pages: Math.ceil(activities.length / take)
        }
      });

    } catch (error) {
      logger.error({ err: error }, 'Get my activities error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // LEAVE
  // ============================================================
  async applyForLeave(req, res) {
    try {
      const { fromDate, toDate, reason, supportingDocuments } = req.body;

      if (!fromDate || !toDate || !reason) {
        return res.status(400).json({ error: 'From date, to date, and reason are required' });
      }

      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher) return res.status(404).json({ error: 'Teacher profile not found' });

      const overlappingLeave = await prisma.leaveRequest.findFirst({
        where: {
          teacherId: teacher.id,
          status: 'PENDING',
          OR: [{
            fromDate: { lte: new Date(toDate) },
            toDate:   { gte: new Date(fromDate) }
          }]
        }
      });

      if (overlappingLeave) {
        return res.status(400).json({ error: 'You already have a pending leave request for this period' });
      }

      const admin = await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' }
      });

      if (!admin) return res.status(400).json({ error: 'No active admin found to process leave request' });

      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          teacherId:  teacher.id,
          adminId:    admin.id,
          fromDate:   new Date(fromDate),
          toDate:     new Date(toDate),
          reason,
          supportingDocuments: supportingDocuments ? JSON.stringify(supportingDocuments) : null,
          status: 'PENDING'
        },
        include: {
          appliedToAdmin: { select: { id: true, name: true, email: true } }
        }
      });

      res.status(201).json({ message: 'Leave request submitted successfully', leaveRequest });

    } catch (error) {
      logger.error({ err: error }, 'Apply for leave error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMyLeaveHistory(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const skip = (page - 1) * limit;

      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher) return res.status(404).json({ error: 'Teacher profile not found' });

      const where = { teacherId: teacher.id };
      if (status) where.status = status;

      const [leaveRequests, total] = await Promise.all([
        prisma.leaveRequest.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          include: { appliedToAdmin: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.leaveRequest.count({ where })
      ]);

      res.json({
        leaveRequests,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
      });

    } catch (error) {
      logger.error({ err: error }, 'Get leave history error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============================================================
  // PROFILE
  // ============================================================
  async updateMyProfile(req, res) {
    try {
      const {
        bio, phoneSecondary, address,
        emergencyContactName, emergencyContactPhone, emergencyContactRelation
      } = req.body;

      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher) return res.status(404).json({ error: 'Teacher profile not found' });

      const updatedTeacher = await prisma.teacher.update({
        where: { id: teacher.id },
        data: {
          bio:                      bio                      || undefined,
          phoneSecondary:           phoneSecondary           || undefined,
          address:                  address                  || undefined,
          emergencyContactName:     emergencyContactName     || undefined,
          emergencyContactPhone:    emergencyContactPhone    || undefined,
          emergencyContactRelation: emergencyContactRelation || undefined
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, profileImage: true } }
        }
      });

      res.json({ message: 'Profile updated successfully', teacher: updatedTeacher });

    } catch (error) {
      logger.error({ err: error }, 'Update teacher profile error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new TeacherController();