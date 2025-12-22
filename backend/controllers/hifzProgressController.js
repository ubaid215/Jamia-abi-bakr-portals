const prisma = require('../db/prismaClient');
const HifzAnalyticsService = require('../services/HifzAnalyticsService');
const HifzNotificationService = require('../services/HifzNotificationService');
const HifzCalculationHelper = require('../services/HifzCalculationHelper');

class HifzProgressController {
  // Constants for calculations
  static get LINES_PER_PAGE() { return HifzCalculationHelper.LINES_PER_PAGE; }
  static get TOTAL_LINES_IN_QURAN() { return HifzCalculationHelper.TOTAL_LINES; }
  static get TOTAL_PARAS() { return HifzCalculationHelper.TOTAL_PARAS; }
  static get AVG_LINES_PER_PARA() { return HifzCalculationHelper.AVG_LINES_PER_PARA; }

  // Save daily Hifz progress report
 async saveProgress(req, res) {
  const requestStartTime = Date.now();

  try {
    console.log('📄 [HIFZ PROGRESS] ================================');
    console.log('📄 [HIFZ PROGRESS] Save progress request received');
    console.log('📄 [HIFZ PROGRESS] Timestamp:', new Date().toISOString());

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

    console.log('➡️ [STEP 1] Params & Body:', {
      studentId,
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
    });

    /* ================= STUDENT FETCH ================= */
    console.log('🔍 [STEP 2] Fetching student details...');
    const studentFetchStart = Date.now();

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { hifzStatus: true }
    });

    console.log(`⏱️ [DB] Student fetch time: ${Date.now() - studentFetchStart}ms`);

    if (!student) {
      console.warn(`❌ [NOT FOUND] Student ID: ${studentId}`);
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    console.log('✅ [STEP 2 COMPLETE] Student found:', {
      studentId: student.id,
      hifzStatus: student.hifzStatus
    });

    /* ================= VALIDATE ATTENDANCE ================= */
    console.log('📌 [STEP 3] Validating attendance & required fields...');
    if (attendance === 'PRESENT') {
      if (sabaqLines === undefined || sabqiLines === undefined || manzilLines === undefined) {
        console.warn('⚠️ Validation failed for present attendance: missing lines');
        return res.status(400).json({
          success: false,
          message: 'Lines and mistakes are required for Present attendance'
        });
      }
    }

    /* ================= CALCULATE MISTAKES & CONDITION ================= */
    console.log('🧮 [STEP 4] Calculating total mistakes and condition...');
    const totalMistakes = (sabaqMistakes || 0) + (sabqiMistakes || 0) + (manzilMistakes || 0);
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

    console.log('📊 Computed:', { totalMistakes, condition });

    /* ================= PARSE DATE ================= */
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);
    console.log('📅 [STEP 5] Report date normalized:', reportDate);

    /* ================= CHECK EXISTING REPORT ================= */
    console.log('🔍 [STEP 6] Checking if report already exists...');
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
      console.warn('⚠️ Report already exists for this date:', reportDate);
      return res.status(400).json({
        success: false,
        message: 'A report already exists for this date'
      });
    }

    /* ================= VALIDATE CURRENT PARA ================= */
    console.log('📌 [STEP 7] Validating current para...');
    let completedParas = [];
    let alreadyMemorizedParas = [];
    if (student.hifzStatus && currentPara) {
      const alreadyMemorized = student.hifzStatus.alreadyMemorizedParas || [];
      const canWork = HifzCalculationHelper.canWorkOnPara(
        currentPara,
        alreadyMemorized,
        student.hifzStatus.currentPara
      );

      if (!canWork.allowed) {
        console.warn('⚠️ Cannot work on current para:', canWork.reason);
        return res.status(400).json({
          success: false,
          message: canWork.reason
        });
      }
    }

    /* ================= CREATE PROGRESS REPORT ================= */
    console.log('🖨️ [STEP 8] Creating new Hifz progress report...');
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
        teacherId: req.user?.teacherId
      }
    });

    console.log('✅ Progress report created:', newProgress.id);

    /* ================= UPDATE HIFZ STATUS ================= */
    console.log('🔄 [STEP 9] Updating student Hifz status...');
    await this.updateStudentHifzStatus(studentId);
    console.log('✅ Student Hifz status updated');

    /* ================= WEEKLY PERFORMANCE & ALERTS ================= */
    console.log('📊 [STEP 10] Checking weekly performance...');
    const weeklyPerformance = await this.checkWeeklyPerformance(studentId);
    console.log('✅ Weekly performance:', weeklyPerformance);

    if (weeklyPerformance.hasPoorPerformance) {
      console.log('⚠️ Poor performance detected, sending notifications...');
      await HifzNotificationService.notifyPoorPerformance(student, weeklyPerformance);
      console.log('✅ Notifications sent');
    }

    /* ================= SOCKET.IO EMIT ================= */
    if (global.io) {
      console.log('📡 [STEP 11] Emitting real-time update via Socket.io...');
      global.io.emit('hifzProgressUpdated', {
        studentId,
        progress: newProgress,
        weeklyPerformance
      });
      console.log('✅ Socket.io update emitted');
    }

    /* ================= RESPONSE ================= */
    res.status(201).json({
      success: true,
      progress: newProgress,
      weeklyPerformance
    });

    console.log(`🎉 [SUCCESS] Save progress completed in ${Date.now() - requestStartTime}ms`);
    console.log('📄 [HIFZ PROGRESS] ================================');

  } catch (error) {
    console.error('🔥 [HIFZ PROGRESS ERROR]', {
      message: error.message,
      stack: error.stack,
      params: req.params,
      body: req.body
    });

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
  console.log('updateParaCompletion called:', {
    params: req.params,
    body: req.body,
    user: req.user?.id
  });
  
  try {
    const { studentId } = req.params;
    const { completedPara, currentPara, currentParaProgress } = req.body;

    console.log('Looking for student:', studentId);
    
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        hifzStatus: true,
        user: true
      }
    });

    console.log('Student found:', !!student);
    console.log('Student Hifz status:', student?.hifzStatus);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // If no Hifz status exists, create one
    let hifzStatus = student.hifzStatus;
    if (!hifzStatus) {
      console.log('Creating new Hifz status for student');
      
      // Create initial Hifz status - FIXED: use studentHifzStatus
      hifzStatus = await prisma.studentHifzStatus.create({
        data: {
          studentId,
          currentPara: currentPara || 1,
          currentParaProgress: currentParaProgress || 0,
          completedParas: completedPara ? [completedPara] : [],
          alreadyMemorizedParas: [], // Empty array for new students
          joiningDate: new Date(),
          totalParasCompleted: completedPara ? 1 : 0,
          totalLinesMemorized: 0
        }
      });
      
      console.log('Created new Hifz status:', hifzStatus);
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

      const completedParas = [...(hifzStatus.completedParas || [])];
      if (!completedParas.includes(completedPara)) {
        completedParas.push(completedPara);
        updateData.completedParas = completedParas;
        updateData.totalParasCompleted = completedParas.length;

        console.log('Para completed:', completedPara);
        
        // Send celebration notification
        try {
          await HifzNotificationService.notifyParaCompletion(student, completedPara);
        } catch (notifError) {
          console.error('Notification error:', notifError);
        }
      }
    }

    // Update current para and progress
    if (currentPara !== undefined) {
      updateData.currentPara = currentPara;
    }
    if (currentParaProgress !== undefined) {
      updateData.currentParaProgress = currentParaProgress;
    }

    console.log('Updating with data:', updateData);
    
    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data to update. Provide currentPara or completedPara.'
      });
    }
    
    // Update status - FIXED: use studentHifzStatus
    const updatedStatus = await prisma.studentHifzStatus.update({
      where: { studentId },
      data: updateData
    });

    console.log('Update successful:', updatedStatus);

    // Recalculate overall status
    await this.updateStudentHifzStatus(studentId);

    return res.status(200).json({
      success: true,
      hifzStatus: updatedStatus
    });

  } catch (error) {
    console.error('Update para completion error:', error);
    console.error('Error stack:', error.stack);
    
    // Check for specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate record error',
        error: error.message
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found',
        error: error.message
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
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
      const progressRecords = await prisma.hifzProgress.findMany({
        where: { studentId },
        orderBy: { date: 'asc' }
      });

      if (progressRecords.length === 0) return;

      const latestProgress = progressRecords[progressRecords.length - 1];
      const currentStatus = await prisma.studentHifzStatus.findUnique({
        where: { studentId }
      });

      if (!currentStatus) return;

      // ⭐ USE HELPER for accurate calculation
      const calculation = HifzCalculationHelper.calculateTotalMemorized(
        currentStatus.alreadyMemorizedParas || [],
        latestProgress.completedParas || [],
        latestProgress.currentPara,
        latestProgress.currentParaProgress
      );

      // Calculate other metrics
      const totalDaysActive = progressRecords.length;
      const totalMistakes = progressRecords.reduce((sum, r) => sum + r.totalMistakes, 0);
      const totalSabaqLines = progressRecords.reduce((sum, r) => sum + r.sabaqLines, 0);

      const averageLinesPerDay = totalDaysActive > 0 ? totalSabaqLines / totalDaysActive : 0;
      const averageMistakesPerDay = totalDaysActive > 0 ? totalMistakes / totalDaysActive : 0;
      const mistakeRate = calculation.totalMemorizedLines > 0
        ? (totalMistakes / calculation.totalMemorizedLines) * 100
        : 0;

      // Estimate completion using helper
      const estimation = HifzCalculationHelper.estimateCompletion(
        calculation.remainingLines,
        averageLinesPerDay
      );

      // Update status with accurate calculations
      await prisma.studentHifzStatus.update({
        where: { studentId },
        data: {
          currentPara: latestProgress.currentPara,
          currentParaProgress: latestProgress.currentParaProgress,
          completedParas: calculation.validCompletedParas,
          totalParasCompleted: calculation.validCompletedParas.length,
          totalLinesMemorized: calculation.totalMemorizedLines,
          totalDaysActive,
          averageLinesPerDay,
          averageMistakesPerDay,
          mistakeRate,
          totalMistakes,
          estimatedDaysToComplete: estimation.daysRemaining,
          estimatedCompletionDate: estimation.estimatedDate
        }
      });

    } catch (error) {
      console.error('Update student Hifz status error:', error);
    }
  }
}

module.exports = new HifzProgressController();