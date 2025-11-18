const prisma = require('../db/prismaClient');
const hifzReportController = require('./hifzReportController');

class ProgressController {
  // Record Hifz progress for a student
  async recordHifzProgress(req, res) {
    try {
      const {
        studentId,
        sabaqLines,
        sabqiLines,
        manzilPara,
        mistakes,
        notes,
        currentPara,
        attachments
      } = req.body;

      // Validate required fields - MOVED TO TOP
      if (!studentId || sabaqLines === undefined || sabqiLines === undefined || mistakes === undefined) {
        return res.status(400).json({
          error: 'Student ID, sabaq lines, sabqi lines, and mistakes are required'
        });
      }

      // Check if teacher is authorized
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id }
      });

      if (!teacher) {
        return res.status(403).json({ error: 'Only teachers can record progress' });
      }

      // Check if student exists and get current progress
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              name: true
            }
          },
          hifzProgress: {
            orderBy: { date: 'desc' },
            take: 1
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

      // Check if student is in a HIFZ class
      if (!student.currentEnrollment || student.currentEnrollment.classRoom.type !== 'HIFZ') {
        return res.status(400).json({ error: 'Student is not enrolled in HIFZ program' });
      }

      // Calculate para progress
      const totalLinesInQuran = 540;
      const linesPerPara = totalLinesInQuran / 30; // 18 lines per para

      let completedParas = [];
      let paraProgress = 0;

      // Get previous progress to calculate completed paras
      const previousProgress = student.hifzProgress[0];
      let previousCompletedParas = [];
      let previousCurrentPara = 1;

      if (previousProgress) {
        previousCompletedParas = previousProgress.completedParas || [];
        previousCurrentPara = previousProgress.currentPara || 1;
      }

      // Calculate new progress
      if (currentPara && currentPara !== previousCurrentPara) {
        // Teacher explicitly set current para
        completedParas = Array.from({ length: currentPara - 1 }, (_, i) => i + 1);
        paraProgress = 0; // Reset progress for new para
      } else {
        // Calculate progress based on lines
        const currentParaToUse = currentPara || previousCurrentPara;
        const totalLinesInCurrentPara = linesPerPara;

        // Get total lines completed in current para from all progress records
        const currentParaProgress = await prisma.hifzProgress.aggregate({
          where: {
            studentId,
            currentPara: currentParaToUse
          },
          _sum: {
            sabaqLines: true
          }
        });

        const totalLinesDoneInPara = (currentParaProgress._sum.sabaqLines || 0) + sabaqLines;
        paraProgress = Math.min((totalLinesDoneInPara / totalLinesInCurrentPara) * 100, 100);

        // If para is completed, move to next para
        if (paraProgress >= 100) {
          completedParas = [...new Set([...previousCompletedParas, currentParaToUse])];
          paraProgress = 0;
        } else {
          completedParas = previousCompletedParas;
        }
      }

      // Check for focus areas based on mistakes
      let focusAreas = [];
      if (mistakes > 2) {
        if (sabqiLines > 0) {
          focusAreas.push('SABQI_REVISION');
        }
        if (manzilPara) {
          focusAreas.push('MANZIL_REVISION');
        }
      }

      // Sabaq must have zero mistakes
      if (sabaqLines > 0 && mistakes > 0) {
        return res.status(400).json({
          error: 'Sabaq must be recited with zero mistakes. Please re-check the sabaq.'
        });
      }

      const progress = await prisma.hifzProgress.create({
        data: {
          studentId,
          teacherId: teacher.id,
          sabaqLines,
          sabqiLines,
          manzilPara,
          mistakes,
          notes,
          currentPara: currentPara || previousCurrentPara,
          completedParas,
          paraProgress,
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

      // ✅ FIXED: Auto-generate report AFTER progress is created
      try {
        const hifzReportController = require('./hifzReportController');
        await hifzReportController.autoGenerateReport(studentId, progress);
      } catch (reportError) {
        console.error('Auto-report generation failed:', reportError);
        // Don't fail the main request if report generation fails
      }

      // Calculate estimated completion time
      const completionStats = await this.calculateHifzCompletion(studentId);

      res.status(201).json({
        message: 'Hifz progress recorded successfully',
        progress,
        focusAreas,
        completionStats
      });

    } catch (error) {
      console.error('Record Hifz progress error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  // Record Nazra progress for a student
  async recordNazraProgress(req, res) {
    try {
      const {
        studentId,
        recitedLines,
        mistakes,
        remarks,
        attachments
      } = req.body;

      // Validate required fields
      if (!studentId || recitedLines === undefined || mistakes === undefined) {
        return res.status(400).json({
          error: 'Student ID, recited lines, and mistakes are required'
        });
      }

      // Check if teacher is authorized
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id }
      });

      if (!teacher) {
        return res.status(403).json({ error: 'Only teachers can record progress' });
      }

      // Check if student exists
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

      // Check if student is in a NAZRA class
      if (!student.currentEnrollment || student.currentEnrollment.classRoom.type !== 'NAZRA') {
        return res.status(400).json({ error: 'Student is not enrolled in NAZRA program' });
      }

      const progress = await prisma.nazraProgress.create({
        data: {
          studentId,
          teacherId: teacher.id,
          recitedLines,
          mistakes,
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

      // Calculate Nazra completion stats
      const completionStats = await this.calculateNazraCompletion(studentId);

      res.status(201).json({
        message: 'Nazra progress recorded successfully',
        progress,
        completionStats
      });

    } catch (error) {
      console.error('Record Nazra progress error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Calculate Hifz completion statistics
  async calculateHifzCompletion(studentId) {
    const totalLinesInQuran = 540;
    const linesPerPara = totalLinesInQuran / 30;

    // Get all progress records for the student
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

    // Calculate total lines completed
    const totalLinesCompleted = progressRecords.reduce((sum, record) => sum + record.sabaqLines, 0);
    const completionPercentage = (totalLinesCompleted / totalLinesInQuran) * 100;

    // Calculate paras completed
    const latestProgress = progressRecords[progressRecords.length - 1];
    const parasCompleted = latestProgress.completedParas ? latestProgress.completedParas.length : 0;

    // Calculate average daily lines and estimated completion
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

  // Calculate Nazra completion statistics
  async calculateNazraCompletion(studentId) {
    const totalLinesInQuran = 540;

    // Get all progress records for the student
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

    // Calculate total lines recited (Nazra may have repetition)
    const totalLinesRecited = progressRecords.reduce((sum, record) => sum + record.recitedLines, 0);

    // For Nazra, completion is based on covering the entire Quran at least once
    const completionPercentage = Math.min((totalLinesRecited / totalLinesInQuran) * 100, 100);

    // Calculate average daily lines and estimated completion
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

  // Get student progress history
  async getStudentProgress(req, res) {
    try {
      const { studentId, type, startDate, endDate, page = 1, limit = 10 } = req.query;

      if (!studentId || !type) {
        return res.status(400).json({ error: 'Student ID and type (HIFZ/NAZRA) are required' });
      }

      const skip = (page - 1) * limit;

      // Check if student exists
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

      let progress;
      let total;

      if (type === 'HIFZ') {
        const where = { studentId };
        if (startDate && endDate) {
          where.date = {
            gte: new Date(startDate),
            lte: new Date(endDate)
          };
        }

        [progress, total] = await Promise.all([
          prisma.hifzProgress.findMany({
            where,
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
          prisma.hifzProgress.count({ where })
        ]);
      } else if (type === 'NAZRA') {
        const where = { studentId };
        if (startDate && endDate) {
          where.date = {
            gte: new Date(startDate),
            lte: new Date(endDate)
          };
        }

        [progress, total] = await Promise.all([
          prisma.nazraProgress.findMany({
            where,
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
          prisma.nazraProgress.count({ where })
        ]);
      } else {
        return res.status(400).json({ error: 'Type must be HIFZ or NAZRA' });
      }

      // Calculate completion statistics
      const completionStats = type === 'HIFZ'
        ? await this.calculateHifzCompletion(studentId)
        : await this.calculateNazraCompletion(studentId);

      res.json({
        student,
        type,
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
      console.error('Get student progress error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get progress for a class
  async getClassProgress(req, res) {
    try {
      const { classRoomId, type, date } = req.query;

      if (!classRoomId || !type) {
        return res.status(400).json({ error: 'Class room ID and type are required' });
      }

      // Check if class exists
      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class room not found' });
      }

      // Get all students in the class
      const enrollments = await prisma.enrollment.findMany({
        where: {
          classRoomId,
          isCurrent: true
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
          }
        }
      });

      const studentIds = enrollments.map(enrollment => enrollment.studentId);

      let progressData = [];

      if (type === 'HIFZ') {
        // Get latest progress for each student
        for (const enrollment of enrollments) {
          const latestProgress = await prisma.hifzProgress.findFirst({
            where: { studentId: enrollment.studentId },
            orderBy: { date: 'desc' },
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

          const completionStats = await this.calculateHifzCompletion(enrollment.studentId);

          progressData.push({
            student: enrollment.student,
            rollNumber: enrollment.rollNumber,
            latestProgress,
            completionStats
          });
        }
      } else if (type === 'NAZRA') {
        // Get latest progress for each student
        for (const enrollment of enrollments) {
          const latestProgress = await prisma.nazraProgress.findFirst({
            where: { studentId: enrollment.studentId },
            orderBy: { date: 'desc' },
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

          const completionStats = await this.calculateNazraCompletion(enrollment.studentId);

          progressData.push({
            student: enrollment.student,
            rollNumber: enrollment.rollNumber,
            latestProgress,
            completionStats
          });
        }
      }

      res.json({
        class: {
          id: classRoom.id,
          name: classRoom.name,
          type: classRoom.type
        },
        progressType: type,
        progressData: progressData.sort((a, b) => a.rollNumber - b.rollNumber),
        summary: {
          totalStudents: progressData.length,
          averageCompletion: progressData.reduce((sum, item) =>
            sum + item.completionStats.completionPercentage, 0) / progressData.length
        }
      });

    } catch (error) {
      console.error('Get class progress error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update progress record
  async updateProgress(req, res) {
    try {
      const { id } = req.params;
      const { type, ...updateData } = req.body;

      if (!type) {
        return res.status(400).json({ error: 'Type (HIFZ/NAZRA) is required' });
      }

      // Check if progress record exists
      let existingProgress;
      if (type === 'HIFZ') {
        existingProgress = await prisma.hifzProgress.findUnique({
          where: { id },
          include: {
            teacher: true
          }
        });
      } else if (type === 'NAZRA') {
        existingProgress = await prisma.nazraProgress.findUnique({
          where: { id },
          include: {
            teacher: true
          }
        });
      } else {
        return res.status(400).json({ error: 'Type must be HIFZ or NAZRA' });
      }

      if (!existingProgress) {
        return res.status(404).json({ error: 'Progress record not found' });
      }

      // Check if current user is the teacher who recorded the progress or an admin
      const isOwner = existingProgress.teacher.userId === req.user.id;
      const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Only the recording teacher or admin can update progress' });
      }

      let updatedProgress;
      if (type === 'HIFZ') {
        updatedProgress = await prisma.hifzProgress.update({
          where: { id },
          data: updateData,
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
            }
          }
        });
      } else {
        updatedProgress = await prisma.nazraProgress.update({
          where: { id },
          data: updateData,
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
            }
          }
        });
      }

      res.json({
        message: 'Progress updated successfully',
        progress: updatedProgress
      });

    } catch (error) {
      console.error('Update progress error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new ProgressController();