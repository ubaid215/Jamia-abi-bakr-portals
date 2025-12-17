const prisma = require('../db/prismaClient');
const HifzAnalyticsService = require('../services/HifzAnalyticsService');
const HifzNotificationService = require('../services/HifzNotificationService');

class HifzProgressController {
  // Constants for calculations
  static LINES_PER_PAGE = 15;
  static PAGES_PER_PARA = 20;
  static TOTAL_PARAS = 30;
  static TOTAL_LINES_IN_QURAN = 604 * 15; // 9060 lines

  // Save daily Hifz progress report
  async saveProgress(req, res) {
    try {
      const { studentId } = req.params;
      const {
        date,
        sabaq,
        sabaqLines,
        sabaqMistakes,
        sabqi,
        sabqiLines,
        sabqiMistakes,
        manzil,
        manzilLines,
        manzilMistakes,
        attendance,
        currentPara,
        currentParaProgress,
        notes,
        remarks
      } = req.body;

      // Validate student exists
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { hifzStatus: true }
      });

      if (!student) {
        return res.status(404).json({ 
          success: false, 
          message: 'Student not found' 
        });
      }

      // Validate attendance and required fields
      if (attendance === 'PRESENT') {
        if (sabaqLines === undefined || sabqiLines === undefined || manzilLines === undefined) {
          return res.status(400).json({
            success: false,
            message: 'Lines and mistakes are required for Present attendance'
          });
        }
      }

      // Calculate total mistakes
      const totalMistakes = (sabaqMistakes || 0) + (sabqiMistakes || 0) + (manzilMistakes || 0);

      // Determine condition based on mistakes
      let condition = 'Excellent';
      if (attendance === 'PRESENT') {
        if (sabaqMistakes > 2 || sabqiMistakes > 2 || manzilMistakes > 3) {
          condition = 'Below Average';
        } else if (sabaqMistakes > 0 || sabqiMistakes > 1 || manzilMistakes > 1) {
          condition = 'Medium';
        } else if (totalMistakes === 0) {
          condition = 'Excellent';
        } else {
          condition = 'Good';
        }
      } else {
        condition = 'N/A';
      }

      // Parse date
      const reportDate = date ? new Date(date) : new Date();
      reportDate.setHours(0, 0, 0, 0);

      // Check if report already exists for this date
      const existingReport = await prisma.hifzProgress.findFirst({
        where: {
          studentId,
          date: {
            gte: reportDate,
            lt: new Date(reportDate.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      if (existingReport) {
        return res.status(400).json({
          success: false,
          message: 'A report already exists for this date'
        });
      }

      // Get completed paras from student's hifz status
      let completedParas = [];
      let alreadyMemorizedParas = [];
      if (student.hifzStatus) {
        completedParas = student.hifzStatus.completedParas || [];
        alreadyMemorizedParas = student.hifzStatus.alreadyMemorizedParas || [];
      }

      // Create progress report
      const newProgress = await prisma.hifzProgress.create({
        data: {
          studentId,
          date: reportDate,
          sabaq: sabaq || '',
          sabaqLines: attendance === 'PRESENT' ? (sabaqLines || 0) : 0,
          sabaqMistakes: attendance === 'PRESENT' ? (sabaqMistakes || 0) : 0,
          sabqi: sabqi || '',
          sabqiLines: attendance === 'PRESENT' ? (sabqiLines || 0) : 0,
          sabqiMistakes: attendance === 'PRESENT' ? (sabqiMistakes || 0) : 0,
          manzil: manzil || '',
          manzilLines: attendance === 'PRESENT' ? (manzilLines || 0) : 0,
          manzilMistakes: attendance === 'PRESENT' ? (manzilMistakes || 0) : 0,
          totalMistakes,
          attendance: attendance || 'PRESENT',
          condition,
          currentPara: currentPara || student.hifzStatus?.currentPara || 1,
          currentParaProgress: currentParaProgress || student.hifzStatus?.currentParaProgress || 0,
          completedParas,
          alreadyMemorizedParas,
          notes,
          remarks,
          teacherId: req.user?.teacherId // Assuming teacher info from auth middleware
        }
      });

      // Update student's overall Hifz status
      await this.updateStudentHifzStatus(studentId);

      // Calculate weekly performance and check for alerts
      const weeklyPerformance = await this.checkWeeklyPerformance(studentId);

      // Send notifications if poor performance detected
      if (weeklyPerformance.hasPoorPerformance) {
        await HifzNotificationService.notifyPoorPerformance(student, weeklyPerformance);
      }

      // Emit real-time update via Socket.io
      if (global.io) {
        global.io.emit('hifzProgressUpdated', {
          studentId,
          progress: newProgress,
          weeklyPerformance
        });
      }

      res.status(201).json({
        success: true,
        progress: newProgress,
        weeklyPerformance
      });

    } catch (error) {
      console.error('Save Hifz progress error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      });
    }
  }

  // Update existing progress report
  async updateProgress(req, res) {
    try {
      const { studentId, progressId } = req.params;
      const updateData = req.body;

      // Find existing progress
      const existingProgress = await prisma.hifzProgress.findFirst({
        where: {
          id: progressId,
          studentId
        }
      });

      if (!existingProgress) {
        return res.status(404).json({
          success: false,
          message: 'Progress report not found'
        });
      }

      // Recalculate condition if mistakes are updated
      let condition = existingProgress.condition;
      if (updateData.sabaqMistakes !== undefined || 
          updateData.sabqiMistakes !== undefined || 
          updateData.manzilMistakes !== undefined) {
        
        const sabaqMistakes = updateData.sabaqMistakes ?? existingProgress.sabaqMistakes;
        const sabqiMistakes = updateData.sabqiMistakes ?? existingProgress.sabqiMistakes;
        const manzilMistakes = updateData.manzilMistakes ?? existingProgress.manzilMistakes;
        
        if (sabaqMistakes > 2 || sabqiMistakes > 2 || manzilMistakes > 3) {
          condition = 'Below Average';
        } else if (sabaqMistakes > 0 || sabqiMistakes > 1 || manzilMistakes > 1) {
          condition = 'Medium';
        } else {
          condition = 'Excellent';
        }
        
        updateData.condition = condition;
        updateData.totalMistakes = sabaqMistakes + sabqiMistakes + manzilMistakes;
      }

      // Update progress
      const updatedProgress = await prisma.hifzProgress.update({
        where: { id: progressId },
        data: updateData
      });

      // Recalculate student's overall status
      await this.updateStudentHifzStatus(studentId);

      // Check weekly performance again
      const weeklyPerformance = await this.checkWeeklyPerformance(studentId);

      // Emit update
      if (global.io) {
        global.io.emit('hifzProgressUpdated', {
          studentId,
          progress: updatedProgress,
          weeklyPerformance
        });
      }

      res.status(200).json({
        success: true,
        progress: updatedProgress,
        weeklyPerformance
      });

    } catch (error) {
      console.error('Update Hifz progress error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  // Get progress reports for a student
  async getStudentProgress(req, res) {
    try {
      const { studentId } = req.params;
      const { startDate, endDate, limit = 100, page = 1 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build filter
      const where = { studentId };
      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      // Get progress records
      const [progressRecords, totalCount] = await Promise.all([
        prisma.hifzProgress.findMany({
          where,
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
          orderBy: { date: 'desc' },
          take: parseInt(limit),
          skip
        }),
        prisma.hifzProgress.count({ where })
      ]);

      // Get student's overall status
      const hifzStatus = await prisma.studentHifzStatus.findUnique({
        where: { studentId }
      });

      res.status(200).json({
        success: true,
        progress: progressRecords,
        hifzStatus,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalCount / parseInt(limit))
        }
      });

    } catch (error) {
      console.error('Get student progress error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  // Get student analytics
  async getStudentAnalytics(req, res) {
    try {
      const { studentId } = req.params;
      const { days = 30 } = req.query;

      const analytics = await HifzAnalyticsService.calculateStudentAnalytics(
        studentId, 
        parseInt(days)
      );

      res.status(200).json({
        success: true,
        analytics
      });

    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  // Initialize student Hifz status (when student joins with prior memorization)
  async initializeHifzStatus(req, res) {
    try {
      const { studentId } = req.params;
      const { 
        alreadyMemorizedParas = [], 
        startingPara = 1,
        joiningDate 
      } = req.body;

      // Validate student
      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Check if status already exists
      const existingStatus = await prisma.studentHifzStatus.findUnique({
        where: { studentId }
      });

      if (existingStatus) {
        return res.status(400).json({
          success: false,
          message: 'Hifz status already initialized for this student'
        });
      }

      // Validate para numbers
      if (alreadyMemorizedParas.some(p => p < 1 || p > 30)) {
        return res.status(400).json({
          success: false,
          message: 'Para numbers must be between 1 and 30'
        });
      }

      if (startingPara < 1 || startingPara > 30) {
        return res.status(400).json({
          success: false,
          message: 'Starting para must be between 1 and 30'
        });
      }

      // Calculate initial total lines memorized
      const linesPerPara = HifzProgressController.LINES_PER_PAGE * HifzProgressController.PAGES_PER_PARA;
      const totalLinesMemorized = alreadyMemorizedParas.length * linesPerPara;

      // Create Hifz status
      const hifzStatus = await prisma.studentHifzStatus.create({
        data: {
          studentId,
          joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
          alreadyMemorizedParas,
          startingPara,
          currentPara: startingPara,
          currentParaProgress: 0,
          completedParas: [],
          totalParasCompleted: 0,
          totalLinesMemorized
        }
      });

      res.status(201).json({
        success: true,
        hifzStatus
      });

    } catch (error) {
      console.error('Initialize Hifz status error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  // Update para completion
  async updateParaCompletion(req, res) {
    try {
      const { studentId } = req.params;
      const { completedPara, currentPara, currentParaProgress } = req.body;

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          hifzStatus: true,
          user: true
        }
      });

      if (!student || !student.hifzStatus) {
        return res.status(404).json({
          success: false,
          message: 'Student or Hifz status not found'
        });
      }

      const updateData = {};
      
      // If a para was completed
      if (completedPara) {
        if (completedPara < 1 || completedPara > 30) {
          return res.status(400).json({
            success: false,
            message: 'Para number must be between 1 and 30'
          });
        }

        const completedParas = [...student.hifzStatus.completedParas];
        if (!completedParas.includes(completedPara)) {
          completedParas.push(completedPara);
          updateData.completedParas = completedParas;
          updateData.totalParasCompleted = completedParas.length;

          // Send celebration notification
          await HifzNotificationService.notifyParaCompletion(student, completedPara);
        }
      }

      // Update current para and progress
      if (currentPara !== undefined) {
        updateData.currentPara = currentPara;
      }
      if (currentParaProgress !== undefined) {
        updateData.currentParaProgress = currentParaProgress;
      }

      // Update status
      const updatedStatus = await prisma.studentHifzStatus.update({
        where: { studentId },
        data: updateData
      });

      // Recalculate overall status
      await this.updateStudentHifzStatus(studentId);

      res.status(200).json({
        success: true,
        hifzStatus: updatedStatus
      });

    } catch (error) {
      console.error('Update para completion error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  // Get poor performers (students with below-average weekly performance)
  async getPoorPerformers(req, res) {
    try {
      // Get all active Hifz students
      const students = await prisma.student.findMany({
        where: {
          currentEnrollment: {
            classRoom: {
              type: 'HIFZ'
            }
          }
        },
        include: {
          user: true,
          currentEnrollment: {
            include: {
              classRoom: true
            }
          }
        }
      });

      const poorPerformers = [];

      for (const student of students) {
        const weeklyPerformance = await this.checkWeeklyPerformance(student.id);
        
        if (weeklyPerformance.hasPoorPerformance) {
          poorPerformers.push({
            student: {
              id: student.id,
              name: student.user.name,
              admissionNo: student.admissionNo,
              rollNumber: student.currentEnrollment?.rollNumber,
              classRoom: student.currentEnrollment?.classRoom?.name
            },
            weeklyPerformance
          });
        }
      }

      res.status(200).json({
        success: true,
        poorPerformers,
        count: poorPerformers.length
      });

    } catch (error) {
      console.error('Get poor performers error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  // Helper: Check weekly performance (Saturday to Thursday)
  async checkWeeklyPerformance(studentId) {
    try {
      const today = new Date();
      const currentDay = today.getDay(); // 0 (Sunday) to 6 (Saturday)
      
      // Calculate previous week's Saturday to Thursday
      const daysToPreviousSaturday = (currentDay + 1) % 7;
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - daysToPreviousSaturday - 7);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 5); // Thursday
      endDate.setHours(23, 59, 59, 999);

      // Fetch reports for the period
      const reports = await prisma.hifzProgress.findMany({
        where: {
          studentId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'asc' }
      });

      const totalDays = reports.length;
      const presentDays = reports.filter(r => r.attendance === 'PRESENT').length;
      const attendanceRate = totalDays > 0 ? presentDays / totalDays : 0;

      // Check for poor performance indicators
      const hasBelowAverageReports = reports.some(r => 
        r.condition === 'Below Average' || r.condition === 'Need Focus'
      );

      const hasLowAttendance = attendanceRate > 0 && attendanceRate < 0.7;
      
      const avgMistakes = reports.length > 0
        ? reports.reduce((sum, r) => sum + r.totalMistakes, 0) / reports.length
        : 0;

      const hasHighMistakes = avgMistakes > 3;

      const hasPoorPerformance = hasBelowAverageReports || hasLowAttendance || hasHighMistakes;

      return {
        hasPoorPerformance,
        totalDays,
        presentDays,
        attendanceRate: (attendanceRate * 100).toFixed(1),
        avgMistakes: avgMistakes.toFixed(1),
        hasBelowAverageReports,
        hasLowAttendance,
        hasHighMistakes,
        periodStart: startDate,
        periodEnd: endDate
      };

    } catch (error) {
      console.error('Check weekly performance error:', error);
      return {
        hasPoorPerformance: false,
        error: error.message
      };
    }
  }

  // Helper: Update student's overall Hifz status
  async updateStudentHifzStatus(studentId) {
    try {
      // Get all progress records
      const progressRecords = await prisma.hifzProgress.findMany({
        where: { studentId },
        orderBy: { date: 'asc' }
      });

      if (progressRecords.length === 0) return;

      // Calculate totals
      const totalDaysActive = progressRecords.length;
      const totalLinesMemorizedFromProgress = progressRecords.reduce(
        (sum, r) => sum + r.sabaqLines, 
        0
      );
      const totalMistakes = progressRecords.reduce(
        (sum, r) => sum + r.totalMistakes, 
        0
      );

      // Get current status
      const latestProgress = progressRecords[progressRecords.length - 1];
      const currentStatus = await prisma.studentHifzStatus.findUnique({
        where: { studentId }
      });

      if (!currentStatus) return;

      // Calculate lines from already memorized paras
      const linesPerPara = HifzProgressController.LINES_PER_PAGE * HifzProgressController.PAGES_PER_PARA;
      const alreadyMemorizedLines = (currentStatus.alreadyMemorizedParas?.length || 0) * linesPerPara;
      const totalLinesMemorized = alreadyMemorizedLines + totalLinesMemorizedFromProgress;

      // Calculate averages
      const averageLinesPerDay = totalDaysActive > 0 
        ? totalLinesMemorizedFromProgress / totalDaysActive 
        : 0;
      const averageMistakesPerDay = totalDaysActive > 0 
        ? totalMistakes / totalDaysActive 
        : 0;
      const mistakeRate = totalLinesMemorized > 0 
        ? (totalMistakes / totalLinesMemorized) * 100 
        : 0;

      // Calculate remaining and estimate completion
      const totalRemainingLines = HifzProgressController.TOTAL_LINES_IN_QURAN - totalLinesMemorized;
      const estimatedDaysToComplete = averageLinesPerDay > 0 
        ? Math.ceil(totalRemainingLines / averageLinesPerDay) 
        : null;
      const estimatedCompletionDate = estimatedDaysToComplete
        ? new Date(Date.now() + estimatedDaysToComplete * 24 * 60 * 60 * 1000)
        : null;

      // Calculate consistency (attendance percentage)
      const dateRange = progressRecords.length > 0
        ? Math.ceil(
            (new Date(latestProgress.date) - new Date(progressRecords[0].date)) / 
            (1000 * 60 * 60 * 24)
          ) + 1
        : 0;
      const consistencyScore = dateRange > 0 
        ? (totalDaysActive / dateRange) * 100 
        : 0;

      // Update status
      await prisma.studentHifzStatus.update({
        where: { studentId },
        data: {
          currentPara: latestProgress.currentPara,
          currentParaProgress: latestProgress.currentParaProgress,
          completedParas: latestProgress.completedParas,
          totalParasCompleted: latestProgress.completedParas.length,
          totalLinesMemorized,
          totalDaysActive,
          averageLinesPerDay,
          averageMistakesPerDay,
          mistakeRate,
          consistencyScore,
          totalMistakes,
          estimatedDaysToComplete,
          estimatedCompletionDate
        }
      });

    } catch (error) {
      console.error('Update student Hifz status error:', error);
    }
  }
}

module.exports = new HifzProgressController();