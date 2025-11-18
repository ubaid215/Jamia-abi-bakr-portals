const prisma = require('../db/prismaClient');

class RegularProgressController {
  // Record subject assessment for regular student
  async recordSubjectAssessment(req, res) {
    try {
      const {
        studentId,
        subjectId,
        assessmentType,
        title,
        totalMarks,
        obtainedMarks,
        grade,
        topicsCovered,
        strengths,
        weaknesses,
        remarks,
        attachments
      } = req.body;

      // Validate required fields
      if (!studentId || !subjectId || !assessmentType || totalMarks === undefined || obtainedMarks === undefined) {
        return res.status(400).json({ 
          error: 'Student ID, subject ID, assessment type, total marks, and obtained marks are required' 
        });
      }

      // Check if teacher is authorized
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id }
      });

      if (!teacher) {
        return res.status(403).json({ error: 'Only teachers can record assessments' });
      }

      // Check if student exists and is in REGULAR class
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              name: true
            }
          },
          currentEnrollment: {
            include: {
              classRoom: true
            }
          }
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (!student.currentEnrollment || student.currentEnrollment.classRoom.type !== 'REGULAR') {
        return res.status(400).json({ error: 'Student is not enrolled in REGULAR program' });
      }

      // Check if subject exists and teacher is assigned
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: {
          teacher: true
        }
      });

      if (!subject) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      if (subject.teacherId !== teacher.id) {
        return res.status(403).json({ error: 'Teacher is not assigned to this subject' });
      }

      // Calculate percentage and auto-grade if not provided
      const percentage = (obtainedMarks / totalMarks) * 100;
      const calculatedGrade = grade || this.calculateGrade(percentage);

      const assessment = await prisma.subjectProgress.create({
        data: {
          studentId,
          subjectId,
          teacherId: teacher.id,
          assessmentType,
          title: title || `${assessmentType} Assessment`,
          totalMarks,
          obtainedMarks,
          grade: calculatedGrade,
          percentage,
          topicsCovered: topicsCovered ? JSON.stringify(topicsCovered) : null,
          strengths: strengths ? JSON.stringify(strengths) : null,
          weaknesses: weaknesses ? JSON.stringify(weaknesses) : null,
          remarks,
          attachments: attachments ? JSON.stringify(attachments) : null
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          },
          subject: {
            select: {
              name: true,
              code: true
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

      res.status(201).json({
        message: 'Subject assessment recorded successfully',
        assessment
      });

    } catch (error) {
      console.error('Record subject assessment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Calculate grade based on percentage
  calculateGrade(percentage) {
    if (percentage >= 90) return 'A_PLUS';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B_PLUS';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C_PLUS';
    if (percentage >= 40) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
  }

  // Create monthly progress report
  async createMonthlyProgress(req, res) {
    try {
      const {
        studentId,
        month,
        year,
        overallGrade,
        remarks,
        improvements,
        recommendations,
        behavior,
        participation,
        homeworkCompletion
      } = req.body;

      if (!studentId || !month || !year) {
        return res.status(400).json({ error: 'Student ID, month, and year are required' });
      }

      // Check if teacher is authorized
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id }
      });

      if (!teacher) {
        return res.status(403).json({ error: 'Only teachers can create monthly progress' });
      }

      // Check if student exists and get current class
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              name: true
            }
          },
          currentEnrollment: {
            include: {
              classRoom: {
                include: {
                  subjects: true
                }
              }
            }
          }
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (!student.currentEnrollment) {
        return res.status(400).json({ error: 'Student is not enrolled in any class' });
      }

      // Calculate attendance for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month

      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          studentId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const presentDays = attendanceRecords.filter(a => 
        a.status === 'PRESENT' || a.status === 'LATE'
      ).length;
      
      const totalDays = attendanceRecords.length;
      const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      // Calculate subject-wise performance for the month
      const subjectAssessments = await prisma.subjectProgress.findMany({
        where: {
          studentId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const subjectPerformance = {};
      let totalPercentage = 0;
      let subjectCount = 0;

      student.currentEnrollment.classRoom.subjects.forEach(subject => {
        const subjectAssess = subjectAssessments.filter(a => a.subjectId === subject.id);
        if (subjectAssess.length > 0) {
          const avgPercentage = subjectAssess.reduce((sum, a) => sum + a.percentage, 0) / subjectAssess.length;
          subjectPerformance[subject.id] = {
            subjectName: subject.name,
            percentage: Math.round(avgPercentage * 100) / 100,
            grade: this.calculateGrade(avgPercentage),
            assessmentCount: subjectAssess.length
          };
          totalPercentage += avgPercentage;
          subjectCount++;
        }
      });

      const overallPercentage = subjectCount > 0 ? totalPercentage / subjectCount : 0;
      const calculatedOverallGrade = overallGrade || this.calculateGrade(overallPercentage);

      const monthlyProgress = await prisma.monthlyProgress.create({
        data: {
          studentId,
          teacherId: teacher.id,
          classRoomId: student.currentEnrollment.classRoomId,
          month: parseInt(month),
          year: parseInt(year),
          attendance: {
            present: presentDays,
            total: totalDays,
            percentage: Math.round(attendancePercentage * 100) / 100
          },
          subjectPerformance,
          overallGrade: calculatedOverallGrade,
          overallPercentage: Math.round(overallPercentage * 100) / 100,
          remarks,
          improvements,
          recommendations,
          behavior,
          participation,
          homeworkCompletion
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          },
          classRoom: {
            select: {
              name: true,
              grade: true
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

      res.status(201).json({
        message: 'Monthly progress report created successfully',
        monthlyProgress
      });

    } catch (error) {
      console.error('Create monthly progress error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create study plan for student
  async createStudyPlan(req, res) {
    try {
      const {
        studentId,
        subjectId,
        title,
        description,
        topics,
        startDate,
        endDate,
        priority,
        remarks
      } = req.body;

      if (!studentId || !subjectId || !title || !topics || !startDate || !endDate) {
        return res.status(400).json({ error: 'Student ID, subject ID, title, topics, start date, and end date are required' });
      }

      // Check if teacher is authorized
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id }
      });

      if (!teacher) {
        return res.status(403).json({ error: 'Only teachers can create study plans' });
      }

      const studyPlan = await prisma.studyPlan.create({
        data: {
          studentId,
          teacherId: teacher.id,
          subjectId,
          title,
          description,
          topics: JSON.stringify(topics),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          priority,
          remarks
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          },
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

      res.status(201).json({
        message: 'Study plan created successfully',
        studyPlan
      });

    } catch (error) {
      console.error('Create study plan error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update study plan progress
  async updateStudyPlanProgress(req, res) {
    try {
      const { id } = req.params;
      const { completedTopics, status, progress, remarks } = req.body;

      // Check if study plan exists
      const studyPlan = await prisma.studyPlan.findUnique({
        where: { id },
        include: {
          teacher: true
        }
      });

      if (!studyPlan) {
        return res.status(404).json({ error: 'Study plan not found' });
      }

      // Check if current user is the teacher who created the plan or an admin
      const isOwner = studyPlan.teacher.userId === req.user.id;
      const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Only the creating teacher or admin can update study plan' });
      }

      const updatedStudyPlan = await prisma.studyPlan.update({
        where: { id },
        data: {
          completedTopics: completedTopics ? JSON.stringify(completedTopics) : undefined,
          status: status || undefined,
          progress: progress !== undefined ? progress : undefined,
          remarks: remarks || undefined
        },
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
        }
      });

      res.json({
        message: 'Study plan updated successfully',
        studyPlan: updatedStudyPlan
      });

    } catch (error) {
      console.error('Update study plan error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get student progress overview
  async getStudentProgressOverview(req, res) {
    try {
      const { studentId } = req.params;

      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          currentEnrollment: {
            include: {
              classRoom: {
                include: {
                  subjects: true
                }
              }
            }
          }
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Get recent assessments (last 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const recentAssessments = await prisma.subjectProgress.findMany({
        where: {
          studentId,
          date: {
            gte: threeMonthsAgo
          }
        },
        include: {
          subject: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          date: 'desc'
        },
        take: 20
      });

      // Get monthly progress reports
      const monthlyProgress = await prisma.monthlyProgress.findMany({
        where: { studentId },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' }
        ],
        take: 6
      });

      // Get active study plans
      const studyPlans = await prisma.studyPlan.findMany({
        where: {
          studentId,
          status: {
            in: ['PENDING', 'IN_PROGRESS']
          }
        },
        include: {
          subject: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Calculate overall statistics
      const totalAssessments = await prisma.subjectProgress.count({
        where: { studentId }
      });

      const averagePercentage = await prisma.subjectProgress.aggregate({
        where: { studentId },
        _avg: {
          percentage: true
        }
      });

      // Get current month attendance
      const currentDate = new Date();
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const currentMonthAttendance = await prisma.attendance.findMany({
        where: {
          studentId,
          date: {
            gte: currentMonthStart,
            lte: currentMonthEnd
          }
        }
      });

      const presentDays = currentMonthAttendance.filter(a => 
        a.status === 'PRESENT' || a.status === 'LATE'
      ).length;

      res.json({
        student,
        overview: {
          totalAssessments,
          averagePercentage: Math.round((averagePercentage._avg.percentage || 0) * 100) / 100,
          currentMonthAttendance: {
            present: presentDays,
            total: currentMonthAttendance.length,
            percentage: currentMonthAttendance.length > 0 ? 
              Math.round((presentDays / currentMonthAttendance.length) * 100) : 0
          },
          activeStudyPlans: studyPlans.length
        },
        recentAssessments,
        monthlyProgress,
        studyPlans
      });

    } catch (error) {
      console.error('Get student progress overview error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get class progress summary
  async getClassProgressSummary(req, res) {
    try {
      const { classRoomId } = req.params;
      const { month, year } = req.query;

      // Check if class exists
      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId },
        include: {
          subjects: true,
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
            }
          }
        }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class room not found' });
      }

      const studentIds = classRoom.enrollments.map(enrollment => enrollment.studentId);

      // Get monthly progress for all students
      const where = {
        studentId: { in: studentIds }
      };

      if (month && year) {
        where.month = parseInt(month);
        where.year = parseInt(year);
      }

      const monthlyProgress = await prisma.monthlyProgress.findMany({
        where,
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
        orderBy: [
          { year: 'desc' },
          { month: 'desc' }
        ]
      });

      // Calculate class statistics
      const totalStudents = classRoom.enrollments.length;
      const studentsWithProgress = monthlyProgress.filter(mp => 
        mp.month === parseInt(month || new Date().getMonth() + 1) &&
        mp.year === parseInt(year || new Date().getFullYear())
      );

      const averagePercentage = studentsWithProgress.length > 0 ?
        studentsWithProgress.reduce((sum, mp) => sum + mp.overallPercentage, 0) / studentsWithProgress.length : 0;

      const gradeDistribution = {
        'A_PLUS': 0, 'A': 0, 'B_PLUS': 0, 'B': 0,
        'C_PLUS': 0, 'C': 0, 'D': 0, 'F': 0
      };

      studentsWithProgress.forEach(mp => {
        if (mp.overallGrade && gradeDistribution[mp.overallGrade] !== undefined) {
          gradeDistribution[mp.overallGrade]++;
        }
      });

      res.json({
        class: {
          id: classRoom.id,
          name: classRoom.name,
          grade: classRoom.grade,
          type: classRoom.type
        },
        period: {
          month: month || new Date().getMonth() + 1,
          year: year || new Date().getFullYear()
        },
        summary: {
          totalStudents,
          studentsWithProgress: studentsWithProgress.length,
          averagePercentage: Math.round(averagePercentage * 100) / 100,
          gradeDistribution
        },
        studentProgress: monthlyProgress
      });

    } catch (error) {
      console.error('Get class progress summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new RegularProgressController();