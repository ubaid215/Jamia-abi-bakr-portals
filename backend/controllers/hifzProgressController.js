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

  // Save daily Hifz progress report with improved calculations
  async saveProgress(req, res) {
    const requestStartTime = Date.now();

    try {
      console.log('📄 [HIFZ PROGRESS] Save progress request received');

      const { studentId } = req.params;
      const {
        date,
        sabaq,
        sabaqLines,
        sabaqMistakes,
        sabqi,           // Now just a string like "Para 2"
        sabqiMistakes,   // But still track mistakes
        manzil,          // Now just a string like "Para 1"
        manzilMistakes,  // But still track mistakes
        attendance,
        currentPara,
        currentParaProgress,
        notes,
        remarks
      } = req.body;

      console.log('📋 Request details:', { studentId, date, attendance });

      /* ================= STUDENT FETCH ================= */
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          hifzStatus: true,
          user: { select: { name: true } }
        }
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      console.log(`✅ Student found: ${student.user.name}`);

      /* ================= VALIDATE ATTENDANCE ================= */
      if (attendance === 'PRESENT' || attendance === 'Present') {
        // Only require sabaqLines for present attendance
        if (sabaqLines === undefined) {
          return res.status(400).json({
            success: false,
            message: 'Sabaq lines are required for Present attendance'
          });
        }
      }

      /* ================= CALCULATE MISTAKES & CONDITION ================= */
      // Parse input values
      const parsedSabaqMistakes = parseInt(sabaqMistakes) || 0;
      const parsedSabqiMistakes = parseInt(sabqiMistakes) || 0;
      const parsedManzilMistakes = parseInt(manzilMistakes) || 0;

      const totalMistakes = parsedSabaqMistakes + parsedSabqiMistakes + parsedManzilMistakes;

      // Calculate total lines (only from sabaq now)
      const totalSabaqLines = attendance === 'PRESENT' || attendance === 'Present' ? (parseInt(sabaqLines) || 0) : 0;

      if (attendance === 'PRESENT' || attendance === 'Present') {
        // Condition calculation based on specific thresholds (from reference)
        if (parsedSabaqMistakes > 2 || parsedSabqiMistakes > 2 || parsedManzilMistakes > 3) {
          condition = 'Below Average';
        } else if (parsedSabaqMistakes > 0 || parsedSabqiMistakes > 1 || parsedManzilMistakes > 1) {
          condition = 'Medium';
        } else if (totalMistakes === 0) {
          condition = 'Excellent';
        } else {
          condition = 'Good'; // e.g. sabqi=1 or manzil=1
        }
      } else {
        condition = 'N/A';
      }

      console.log('📊 Calculated:', { totalSabaqLines, totalMistakes, condition });

      /* ================= PARSE DATE ================= */
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const reportDate = date
        ? new Date(`${date}T00:00:00`)
        : today;

      console.log('📅 Report date:', reportDate.toDateString());

      /* ================= CHECK EXISTING REPORT ================= */
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
        console.warn('⚠️ Report already exists for this date');
        return res.status(400).json({
          success: false,
          message: 'A report already exists for this date'
        });
      }

      /* ================= HANDLE PARA COMPLETION ================= */
      console.log('🎯 Handling para completion logic...');

      let newCurrentPara = currentPara || student.hifzStatus?.currentPara || 1;
      let newCurrentParaProgress = currentParaProgress || student.hifzStatus?.currentParaProgress || 0;
      let completedParas = student.hifzStatus?.completedParas || [];
      let alreadyMemorizedParas = student.hifzStatus?.alreadyMemorizedParas || [];

      // Check if a para was completed (100% progress)
      const isMarkingComplete = currentParaProgress === 100;

      if (isMarkingComplete && newCurrentPara) {
        // Add current para to completed list
        if (!completedParas.includes(newCurrentPara)) {
          completedParas.push(newCurrentPara);
          console.log(`✅ Para ${newCurrentPara} marked as completed`);

          // Auto-advance to next para
          if (newCurrentPara < 30) {
            newCurrentPara++;
            newCurrentParaProgress = 0;
            console.log(`➡️ Auto-advanced to Para ${newCurrentPara}`);
          } else {
            console.log('🎉 All 30 paras completed!');
          }

          // Send completion notification
          await HifzNotificationService.notifyParaCompletion(student, newCurrentPara - 1);
        }
      }

      /* ================= CREATE PROGRESS REPORT ================= */
      const newProgress = await prisma.hifzProgress.create({
        data: {
          studentId,
          date: reportDate,

          // Sabaq (new memorization) - has lines
          sabaq: sabaq || '',
          sabaqLines: totalSabaqLines,
          sabaqMistakes: parsedSabaqMistakes,

          // Sabqi (revision) - just a string, no lines
          sabqi: sabqi || '', // e.g., "Para 2"
          sabqiLines: 0, // No lines counted for sabqi
          sabqiMistakes: parsedSabqiMistakes,

          // Manzil (older revision) - just a string, no lines
          manzil: manzil || '', // e.g., "Para 1"
          manzilLines: 0, // No lines counted for manzil
          manzilMistakes: parsedManzilMistakes,

          // Total calculations
          totalMistakes: totalMistakes,

          // Attendance and condition
          attendance: attendance || 'PRESENT',
          condition,

          // Para tracking
          currentPara: newCurrentPara,
          currentParaProgress: newCurrentParaProgress,
          completedParas,
          alreadyMemorizedParas,

          // Notes
          notes: notes || '',
          remarks: remarks || '',
          teacherId: req.user?.teacherId
        }
      });

      console.log(`✅ Progress report created: ${newProgress.id}`);

      /* ================= UPDATE HIFZ STATUS ================= */
      console.log('🔄 Updating student Hifz status...');
      await this.updateStudentHifzStatus(studentId);
      console.log('✅ Student Hifz status updated');

      /* ================= WEEKLY PERFORMANCE CHECK ================= */
      console.log('📊 Checking weekly performance...');
      const weeklyPerformance = await this.checkWeeklyPerformance(studentId);

      if (weeklyPerformance.hasPoorPerformance) {
        console.log('⚠️ Poor performance detected');
        await HifzNotificationService.notifyPoorPerformance(student, weeklyPerformance);
      }

      /* ================= SOCKET.IO UPDATE ================= */
      if (global.io) {
        global.io.emit('hifzProgressUpdated', {
          studentId,
          progress: newProgress,
          weeklyPerformance
        });
        console.log('📡 Real-time update sent');
      }

      /* ================= RESPONSE ================= */
      res.status(201).json({
        success: true,
        progress: newProgress,
        weeklyPerformance,
        message: isMarkingComplete ? `Para ${newCurrentPara - 1} completed! Advanced to Para ${newCurrentPara}` : 'Progress saved successfully'
      });

      console.log(`🎉 Save progress completed in ${Date.now() - requestStartTime}ms`);

    } catch (error) {
      console.error('🔥 Error saving progress:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

      // Recalculate condition if needed
      let condition = existingProgress.condition;
      let totalMistakes = existingProgress.totalMistakes;

      if (updateData.sabaqMistakes !== undefined ||
        updateData.sabqiMistakes !== undefined ||
        updateData.manzilMistakes !== undefined) {

        const sabaqMistakes = parseInt(updateData.sabaqMistakes) || existingProgress.sabaqMistakes;
        const sabqiMistakes = parseInt(updateData.sabqiMistakes) || existingProgress.sabqiMistakes;
        const manzilMistakes = parseInt(updateData.manzilMistakes) || existingProgress.manzilMistakes;

        totalMistakes = sabaqMistakes + sabqiMistakes + manzilMistakes;

        // Recalculate condition based on specific thresholds
        if (sabaqMistakes > 2 || sabqiMistakes > 2 || manzilMistakes > 3) {
          condition = 'Below Average';
        } else if (sabaqMistakes > 0 || sabqiMistakes > 1 || manzilMistakes > 1) {
          condition = 'Medium';
        } else if (totalMistakes === 0) {
          condition = 'Excellent';
        } else {
          condition = 'Good';
        }

        updateData.condition = condition;
        updateData.totalMistakes = totalMistakes;
      }

      // Update progress
      const updatedProgress = await prisma.hifzProgress.update({
        where: { id: progressId },
        data: updateData
      });

      // Recalculate student's overall status
      await this.updateStudentHifzStatus(studentId);

      // Check weekly performance
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
      console.error('Update progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Calculate student analytics with improved logic
  async calculateStudentAnalytics(student, days, calculateAttendanceRate = true) {
    const progressRecords = student.hifzProgress || [];
    const hifzStatus = student.hifzStatus || {};

    console.log(`📊 Processing ${progressRecords.length} records for ${student.user.name}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));

    // Basic statistics
    const totalReports = progressRecords.length;

    // Filter present days
    const presentRecords = progressRecords.filter(r =>
      r.attendance === 'PRESENT' || r.attendance === 'Present'
    );
    const presentDays = presentRecords.length;

    // Calculate actual attendance rate based on report period
    let attendanceRate = 0;
    if (calculateAttendanceRate) {
      // Total days in the period (including weekends if madrasa operates)
      const totalDaysInPeriod = days;
      attendanceRate = totalDaysInPeriod > 0 ? (presentDays / totalDaysInPeriod) * 100 : 0;
    } else {
      // Only count days with reports
      attendanceRate = totalReports > 0 ? (presentDays / totalReports) * 100 : 0;
    }

    // Lines and mistakes calculations (only sabaq lines now)
    let totalSabaqLines = 0;
    let totalSabqiLines = 0;
    let totalManzilLines = 0;
    let totalMistakes = 0;
    let highMistakeDays = 0;

    presentRecords.forEach(report => {
      totalSabaqLines += parseInt(report.sabaqLines) || 0;
      totalSabqiLines += parseInt(report.sabqiLines) || 0; // Should be 0 now
      totalManzilLines += parseInt(report.manzilLines) || 0; // Should be 0 now
      totalMistakes += parseInt(report.totalMistakes) || 0;

      // Count high mistake days
      if (parseInt(report.totalMistakes) > 5) {
        highMistakeDays++;
      }
    });

    // Total lines is now only from sabaq
    const totalLines = totalSabaqLines;

    // Calculate averages based on PRESENT days only (not total period)
    const avgLinesPerDay = presentDays > 0 ? totalLines / presentDays : 0;
    const avgSabaqLinesPerDay = presentDays > 0 ? totalSabaqLines / presentDays : 0;
    const avgMistakesPerDay = presentDays > 0 ? totalMistakes / presentDays : 0;

    const mistakeRate = totalLines > 0 ? (totalMistakes / totalLines) * 100 : 0;

    // Para progress calculations
    const alreadyMemorizedParas = hifzStatus.alreadyMemorizedParas || [];
    const completedParas = hifzStatus.completedParas || [];

    // Remove duplicates (paras that appear in both lists)
    const uniqueAlreadyMemorized = alreadyMemorizedParas.filter(p => !completedParas.includes(p));
    const uniqueCompleted = completedParas.filter(p => !alreadyMemorizedParas.includes(p));

    const totalUniqueMemorizedParas = uniqueAlreadyMemorized.length + uniqueCompleted.length;
    const currentPara = hifzStatus.currentPara || 1;
    const currentParaProgress = hifzStatus.currentParaProgress || 0;
    const remainingParas = 30 - totalUniqueMemorizedParas;
    const overallCompletion = (totalUniqueMemorizedParas / 30) * 100;

    // Check for overlaps
    const overlaps = alreadyMemorizedParas.filter(p => completedParas.includes(p));

    // Condition breakdown
    const conditionBreakdown = {
      excellent: progressRecords.filter(r => r.condition === 'Excellent').length,
      good: progressRecords.filter(r => r.condition === 'Good').length,
      medium: progressRecords.filter(r => r.condition === 'Medium').length,
      belowAverage: progressRecords.filter(r => r.condition === 'Below Average').length,
      na: progressRecords.filter(r => r.condition === 'N/A' || !r.condition).length
    };

    // Calculate consistency score (weighted average)
    const consistencyScore = presentDays > 0 ? (
      (attendanceRate * 0.3) +
      ((100 - Math.min(mistakeRate, 100)) * 0.3) +
      (overallCompletion * 0.2) +
      ((conditionBreakdown.excellent / presentDays) * 100 * 0.2)
    ) : 0;

    // Projections
    let estimatedDaysToComplete = null;
    let estimatedCompletionDate = null;
    let timeDescription = "Not enough data";

    if (avgSabaqLinesPerDay > 0 && remainingParas > 0) {
      // Calculate remaining lines (average 20 lines per para)
      const totalLinesNeeded = remainingParas * 20;
      estimatedDaysToComplete = Math.ceil(totalLinesNeeded / avgSabaqLinesPerDay);

      // Add buffer for review time (20% additional days)
      estimatedDaysToComplete = Math.ceil(estimatedDaysToComplete * 1.2);

      estimatedCompletionDate = new Date();
      estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + estimatedDaysToComplete);

      // Create human-readable time description
      const months = Math.floor(estimatedDaysToComplete / 30);
      const weeks = Math.floor((estimatedDaysToComplete % 30) / 7);
      const remainingDays = estimatedDaysToComplete % 7;

      if (months > 0) {
        timeDescription = `About ${months} month${months > 1 ? 's' : ''}`;
        if (weeks > 0) {
          timeDescription += ` and ${weeks} week${weeks > 1 ? 's' : ''}`;
        }
      } else if (weeks > 0) {
        timeDescription = `About ${weeks} week${weeks > 1 ? 's' : ''}`;
        if (remainingDays > 0) {
          timeDescription += ` and ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
        }
      } else {
        timeDescription = `About ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
      }
    }

    // Alerts and recommendations
    const alerts = [];

    if (attendanceRate < 70 && days >= 7) {
      alerts.push({
        severity: 'warning',
        message: `Low attendance rate: ${attendanceRate.toFixed(1)}%`,
        recommendation: 'Improve regular attendance for consistent progress'
      });
    }

    if (mistakeRate > 10 && totalLines > 20) {
      alerts.push({
        severity: 'warning',
        message: `High mistake rate: ${mistakeRate.toFixed(1)}%`,
        recommendation: 'Focus on accuracy, slow down, and revise more frequently'
      });
    }

    if (totalUniqueMemorizedParas === 0 && presentDays >= 5) {
      alerts.push({
        severity: 'info',
        message: 'No paras memorized yet',
        recommendation: 'Start para memorization with achievable targets (e.g., 2-3 lines per day)'
      });
    }

    if (avgSabaqLinesPerDay < 5 && presentDays >= 5) {
      alerts.push({
        severity: 'info',
        message: `Low memorization rate: ${avgSabaqLinesPerDay.toFixed(1)} new lines/day`,
        recommendation: 'Gradually increase daily memorization targets'
      });
    }

    if (overlaps.length > 0) {
      alerts.push({
        severity: 'info',
        message: `Para overlap detected: ${overlaps.join(', ')}`,
        recommendation: 'Ensure paras are not counted twice in already memorized and completed lists'
      });
    }

    return {
      student: {
        id: student.id,
        name: student.user.name,
        admissionNo: student.admissionNo
      },
      period: {
        totalDays: parseInt(days),
        startDate,
        endDate,
        daysWithData: totalReports,
        presentDays
      },
      attendance: {
        rate: parseFloat(attendanceRate.toFixed(1)),
        presentDays,
        calculateAttendanceRate
      },
      lines: {
        totalSabaqLines,
        totalSabqiLines,
        totalManzilLines,
        totalLines,
        avgLinesPerDay: parseFloat(avgLinesPerDay.toFixed(1)),
        avgSabaqLinesPerDay: parseFloat(avgSabaqLinesPerDay.toFixed(1))
      },
      mistakes: {
        totalMistakes,
        avgMistakesPerDay: parseFloat(avgMistakesPerDay.toFixed(1)),
        mistakeRate: parseFloat(mistakeRate.toFixed(1)),
        highMistakeDays
      },
      paraProgress: {
        alreadyMemorized: uniqueAlreadyMemorized.length,
        alreadyMemorizedParas: uniqueAlreadyMemorized,
        completedDuringTraining: uniqueCompleted.length,
        completedParas: uniqueCompleted,
        totalMemorized: totalUniqueMemorizedParas,
        currentPara,
        currentParaProgress,
        remainingParas,
        overallCompletionPercentage: parseFloat(overallCompletion.toFixed(1)),
        overlaps
      },
      performance: {
        totalReports,
        consistencyScore: parseFloat(consistencyScore.toFixed(1)),
        conditionBreakdown,
        alerts
      },
      projection: {
        estimatedDaysToComplete,
        estimatedCompletionDate,
        timeDescription,
        dailyPaceRequired: remainingParas > 0 && estimatedDaysToComplete ?
          ((remainingParas * 20) / estimatedDaysToComplete).toFixed(1) : null
      },
      recommendations: alerts.map(alert => ({
        priority: alert.severity === 'warning' ? 'High' : 'Medium',
        action: alert.recommendation
      }))
    };
  }

  // Helper: Update student's overall Hifz status with improved logic
  async updateStudentHifzStatus(studentId) {
    try {
      console.log(`🔄 Updating Hifz status for student ${studentId}`);

      // Get all progress records
      const progressRecords = await prisma.hifzProgress.findMany({
        where: { studentId },
        orderBy: { date: 'asc' }
      });

      if (progressRecords.length === 0) {
        console.log('No progress records found');
        return;
      }

      const latestProgress = progressRecords[progressRecords.length - 1];
      const currentStatus = await prisma.studentHifzStatus.findUnique({
        where: { studentId }
      });

      if (!currentStatus) {
        console.log('No existing Hifz status found');
        return;
      }

      // Calculate present days
      const presentRecords = progressRecords.filter(r =>
        r.attendance === 'PRESENT' || r.attendance === 'Present'
      );
      const totalDaysActive = presentRecords.length;

      // Calculate totals (only sabaq lines now)
      const totalSabaqLines = presentRecords.reduce((sum, r) => sum + (parseInt(r.sabaqLines) || 0), 0);
      const totalMistakes = presentRecords.reduce((sum, r) => sum + (parseInt(r.totalMistakes) || 0), 0);
      const totalLines = totalSabaqLines; // Only sabaq lines count

      // Calculate averages (based on present days only)
      const averageLinesPerDay = totalDaysActive > 0 ? totalLines / totalDaysActive : 0;
      const averageSabaqLinesPerDay = totalDaysActive > 0 ? totalSabaqLines / totalDaysActive : 0;
      const averageMistakesPerDay = totalDaysActive > 0 ? totalMistakes / totalDaysActive : 0;

      const mistakeRate = totalLines > 0 ? (totalMistakes / totalLines) * 100 : 0;

      // Calculate para progress
      const alreadyMemorizedParas = currentStatus.alreadyMemorizedParas || [];
      const completedParas = latestProgress.completedParas || [];

      // Remove duplicates
      const uniqueAlreadyMemorized = alreadyMemorizedParas.filter(p => !completedParas.includes(p));
      const uniqueCompleted = completedParas.filter(p => !alreadyMemorizedParas.includes(p));

      const totalMemorizedParas = uniqueAlreadyMemorized.length + uniqueCompleted.length;
      const totalLinesMemorized = totalMemorizedParas * this.AVG_LINES_PER_PARA;

      // Calculate remaining paras and estimated completion
      const remainingParas = 30 - totalMemorizedParas;
      let estimatedDaysToComplete = null;
      let estimatedCompletionDate = null;

      if (averageSabaqLinesPerDay > 0 && remainingParas > 0) {
        const linesPerPara = 20; // Average lines per para
        const totalLinesNeeded = remainingParas * linesPerPara;
        estimatedDaysToComplete = Math.ceil(totalLinesNeeded / averageSabaqLinesPerDay);

        // Add buffer
        estimatedDaysToComplete = Math.ceil(estimatedDaysToComplete * 1.2);

        estimatedCompletionDate = new Date();
        estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + estimatedDaysToComplete);
      }

      // Update status
      await prisma.studentHifzStatus.update({
        where: { studentId },
        data: {
          currentPara: latestProgress.currentPara,
          currentParaProgress: latestProgress.currentParaProgress,
          completedParas: uniqueCompleted,
          totalParasCompleted: uniqueCompleted.length,
          totalLinesMemorized,
          totalDaysActive,
          averageLinesPerDay: parseFloat(averageLinesPerDay.toFixed(2)),
          averageSabaqLinesPerDay: parseFloat(averageSabaqLinesPerDay.toFixed(2)),
          averageMistakesPerDay: parseFloat(averageMistakesPerDay.toFixed(2)),
          mistakeRate: parseFloat(mistakeRate.toFixed(2)),
          totalMistakes,
          estimatedDaysToComplete,
          estimatedCompletionDate,
          lastUpdated: new Date()
        }
      });

      console.log(`✅ Hifz status updated for student ${studentId}`);

    } catch (error) {
      console.error('Error updating Hifz status:', error);
    }
  }

  // Get student analytics with improved calculations
  async getStudentAnalytics(req, res) {
    const startTime = Date.now();

    try {
      const { studentId } = req.params;
      const { days = 30, calculateAttendanceRate = 'true' } = req.query;

      // Clean studentId (remove quotes if present)
      const cleanStudentId = studentId.replace(/^"+|"+$/g, '');

      console.log(`📈 Generating analytics for student ${cleanStudentId}, last ${days} days`);

      if (!cleanStudentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required'
        });
      }

      // Calculate end date (today) and start date
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(days));

      // Fetch student with progress records
      const student = await prisma.student.findUnique({
        where: { id: cleanStudentId },
        include: {
          user: { select: { name: true } },
          hifzStatus: true,
          hifzProgress: {
            where: {
              date: {
                gte: startDate,
                lte: endDate
              }
            },
            orderBy: { date: 'desc' }
          }
        }
      });

      if (!student) {
        console.warn(`❌ Student not found with ID: ${cleanStudentId}`);
        return res.status(404).json({
          success: false,
          message: `Student not found with ID: ${cleanStudentId}`
        });
      }

      // Calculate analytics
      const analytics = await this.calculateStudentAnalytics(
        student,
        parseInt(days),
        calculateAttendanceRate === 'true'
      );

      console.log(`✅ Analytics calculated in ${Date.now() - startTime}ms`);

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

  // Calculate student analytics with improved logic
  async calculateStudentAnalytics(student, days, calculateAttendanceRate = true) {
    const progressRecords = student.hifzProgress || [];
    const hifzStatus = student.hifzStatus || {};

    console.log(`📊 Processing ${progressRecords.length} records for ${student.user.name}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));

    // Basic statistics
    const totalReports = progressRecords.length;

    // Filter present days
    const presentRecords = progressRecords.filter(r =>
      r.attendance === 'PRESENT' || r.attendance === 'Present'
    );
    const presentDays = presentRecords.length;

    // Calculate actual attendance rate based on report period
    let attendanceRate = 0;
    if (calculateAttendanceRate) {
      // Total days in the period (including weekends if madrasa operates)
      const totalDaysInPeriod = days;
      attendanceRate = totalDaysInPeriod > 0 ? (presentDays / totalDaysInPeriod) * 100 : 0;
    } else {
      // Only count days with reports
      attendanceRate = totalReports > 0 ? (presentDays / totalReports) * 100 : 0;
    }

    // Lines and mistakes calculations
    let totalSabaqLines = 0;
    let totalSabqiLines = 0;
    let totalManzilLines = 0;
    let totalMistakes = 0;
    let highMistakeDays = 0;

    presentRecords.forEach(report => {
      totalSabaqLines += parseInt(report.sabaqLines) || 0;
      totalSabqiLines += parseInt(report.sabqiLines) || 0;
      totalManzilLines += parseInt(report.manzilLines) || 0;
      totalMistakes += parseInt(report.totalMistakes) || 0;

      // Count high mistake days
      if (parseInt(report.totalMistakes) > 5) {
        highMistakeDays++;
      }
    });

    const totalLines = totalSabaqLines + totalSabqiLines + totalManzilLines;

    // Calculate averages based on PRESENT days only (not total period)
    const avgLinesPerDay = presentDays > 0 ? totalLines / presentDays : 0;
    const avgSabaqLinesPerDay = presentDays > 0 ? totalSabaqLines / presentDays : 0;
    const avgMistakesPerDay = presentDays > 0 ? totalMistakes / presentDays : 0;

    const mistakeRate = totalLines > 0 ? (totalMistakes / totalLines) * 100 : 0;

    // Para progress calculations
    const alreadyMemorizedParas = hifzStatus.alreadyMemorizedParas || [];
    const completedParas = hifzStatus.completedParas || [];

    // Remove duplicates (paras that appear in both lists)
    const uniqueAlreadyMemorized = alreadyMemorizedParas.filter(p => !completedParas.includes(p));
    const uniqueCompleted = completedParas.filter(p => !alreadyMemorizedParas.includes(p));

    const totalUniqueMemorizedParas = uniqueAlreadyMemorized.length + uniqueCompleted.length;
    const currentPara = hifzStatus.currentPara || 1;
    const currentParaProgress = hifzStatus.currentParaProgress || 0;
    const remainingParas = 30 - totalUniqueMemorizedParas;
    const overallCompletion = (totalUniqueMemorizedParas / 30) * 100;

    // Check for overlaps
    const overlaps = alreadyMemorizedParas.filter(p => completedParas.includes(p));

    // Condition breakdown
    const conditionBreakdown = {
      excellent: progressRecords.filter(r => r.condition === 'Excellent').length,
      good: progressRecords.filter(r => r.condition === 'Good').length,
      medium: progressRecords.filter(r => r.condition === 'Medium').length,
      belowAverage: progressRecords.filter(r => r.condition === 'Below Average').length,
      na: progressRecords.filter(r => r.condition === 'N/A' || !r.condition).length
    };

    // Calculate consistency score (weighted average)
    const consistencyScore = presentDays > 0 ? (
      (attendanceRate * 0.3) +
      ((100 - Math.min(mistakeRate, 100)) * 0.3) +
      (overallCompletion * 0.2) +
      ((conditionBreakdown.excellent / presentDays) * 100 * 0.2)
    ) : 0;

    // Projections
    let estimatedDaysToComplete = null;
    let estimatedCompletionDate = null;
    let timeDescription = "Not enough data";

    if (avgSabaqLinesPerDay > 0 && remainingParas > 0) {
      // Calculate remaining lines (average 20 lines per para)
      const totalLinesNeeded = remainingParas * 20;
      estimatedDaysToComplete = Math.ceil(totalLinesNeeded / avgSabaqLinesPerDay);

      // Add buffer for review time (20% additional days)
      estimatedDaysToComplete = Math.ceil(estimatedDaysToComplete * 1.2);

      estimatedCompletionDate = new Date();
      estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + estimatedDaysToComplete);

      // Create human-readable time description
      const months = Math.floor(estimatedDaysToComplete / 30);
      const weeks = Math.floor((estimatedDaysToComplete % 30) / 7);
      const remainingDays = estimatedDaysToComplete % 7;

      if (months > 0) {
        timeDescription = `About ${months} month${months > 1 ? 's' : ''}`;
        if (weeks > 0) {
          timeDescription += ` and ${weeks} week${weeks > 1 ? 's' : ''}`;
        }
      } else if (weeks > 0) {
        timeDescription = `About ${weeks} week${weeks > 1 ? 's' : ''}`;
        if (remainingDays > 0) {
          timeDescription += ` and ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
        }
      } else {
        timeDescription = `About ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
      }
    }

    // Alerts and recommendations
    const alerts = [];

    if (attendanceRate < 70 && days >= 7) {
      alerts.push({
        severity: 'warning',
        message: `Low attendance rate: ${attendanceRate.toFixed(1)}%`,
        recommendation: 'Improve regular attendance for consistent progress'
      });
    }

    if (mistakeRate > 10 && totalLines > 20) {
      alerts.push({
        severity: 'warning',
        message: `High mistake rate: ${mistakeRate.toFixed(1)}%`,
        recommendation: 'Focus on accuracy, slow down, and revise more frequently'
      });
    }

    if (totalUniqueMemorizedParas === 0 && presentDays >= 5) {
      alerts.push({
        severity: 'info',
        message: 'No paras memorized yet',
        recommendation: 'Start para memorization with achievable targets (e.g., 2-3 lines per day)'
      });
    }

    if (avgSabaqLinesPerDay < 5 && presentDays >= 5) {
      alerts.push({
        severity: 'info',
        message: `Low memorization rate: ${avgSabaqLinesPerDay.toFixed(1)} new lines/day`,
        recommendation: 'Gradually increase daily memorization targets'
      });
    }

    if (overlaps.length > 0) {
      alerts.push({
        severity: 'info',
        message: `Para overlap detected: ${overlaps.join(', ')}`,
        recommendation: 'Ensure paras are not counted twice in already memorized and completed lists'
      });
    }

    return {
      student: {
        id: student.id,
        name: student.user.name,
        admissionNo: student.admissionNo
      },
      period: {
        totalDays: parseInt(days),
        startDate,
        endDate,
        daysWithData: totalReports,
        presentDays
      },
      attendance: {
        rate: parseFloat(attendanceRate.toFixed(1)),
        presentDays,
        calculateAttendanceRate
      },
      lines: {
        totalSabaqLines,
        totalSabqiLines,
        totalManzilLines,
        totalLines,
        avgLinesPerDay: parseFloat(avgLinesPerDay.toFixed(1)),
        avgSabaqLinesPerDay: parseFloat(avgSabaqLinesPerDay.toFixed(1))
      },
      mistakes: {
        totalMistakes,
        avgMistakesPerDay: parseFloat(avgMistakesPerDay.toFixed(1)),
        mistakeRate: parseFloat(mistakeRate.toFixed(1)),
        highMistakeDays
      },
      paraProgress: {
        alreadyMemorized: uniqueAlreadyMemorized.length,
        alreadyMemorizedParas: uniqueAlreadyMemorized,
        completedDuringTraining: uniqueCompleted.length,
        completedParas: uniqueCompleted,
        totalMemorized: totalUniqueMemorizedParas,
        currentPara,
        currentParaProgress,
        remainingParas,
        overallCompletionPercentage: parseFloat(overallCompletion.toFixed(1)),
        overlaps
      },
      performance: {
        totalReports,
        consistencyScore: parseFloat(consistencyScore.toFixed(1)),
        conditionBreakdown,
        alerts
      },
      projection: {
        estimatedDaysToComplete,
        estimatedCompletionDate,
        timeDescription,
        dailyPaceRequired: remainingParas > 0 && estimatedDaysToComplete ?
          ((remainingParas * 20) / estimatedDaysToComplete).toFixed(1) : null
      },
      recommendations: alerts.map(alert => ({
        priority: alert.severity === 'warning' ? 'High' : 'Medium',
        action: alert.recommendation
      }))
    };
  }

  // Helper: Update student's overall Hifz status with improved logic
  async updateStudentHifzStatus(studentId) {
    try {
      console.log(`🔄 Updating Hifz status for student ${studentId}`);

      // Get all progress records
      const progressRecords = await prisma.hifzProgress.findMany({
        where: { studentId },
        orderBy: { date: 'asc' }
      });

      if (progressRecords.length === 0) {
        console.log('No progress records found');
        return;
      }

      const latestProgress = progressRecords[progressRecords.length - 1];
      const currentStatus = await prisma.studentHifzStatus.findUnique({
        where: { studentId }
      });

      if (!currentStatus) {
        console.log('No existing Hifz status found');
        return;
      }

      // Calculate present days
      const presentRecords = progressRecords.filter(r =>
        r.attendance === 'PRESENT' || r.attendance === 'Present'
      );
      const totalDaysActive = presentRecords.length;

      // Calculate totals
      const totalSabaqLines = presentRecords.reduce((sum, r) => sum + (parseInt(r.sabaqLines) || 0), 0);
      const totalSabqiLines = presentRecords.reduce((sum, r) => sum + (parseInt(r.sabqiLines) || 0), 0);
      const totalManzilLines = presentRecords.reduce((sum, r) => sum + (parseInt(r.manzilLines) || 0), 0);
      const totalMistakes = presentRecords.reduce((sum, r) => sum + (parseInt(r.totalMistakes) || 0), 0);
      const totalLines = totalSabaqLines + totalSabqiLines + totalManzilLines;

      // Calculate averages (based on present days only)
      const averageLinesPerDay = totalDaysActive > 0 ? totalLines / totalDaysActive : 0;
      const averageSabaqLinesPerDay = totalDaysActive > 0 ? totalSabaqLines / totalDaysActive : 0;
      const averageMistakesPerDay = totalDaysActive > 0 ? totalMistakes / totalDaysActive : 0;

      const mistakeRate = totalLines > 0 ? (totalMistakes / totalLines) * 100 : 0;

      // Calculate para progress
      const alreadyMemorizedParas = currentStatus.alreadyMemorizedParas || [];
      const completedParas = latestProgress.completedParas || [];

      // Remove duplicates
      const uniqueAlreadyMemorized = alreadyMemorizedParas.filter(p => !completedParas.includes(p));
      const uniqueCompleted = completedParas.filter(p => !alreadyMemorizedParas.includes(p));

      const totalMemorizedParas = uniqueAlreadyMemorized.length + uniqueCompleted.length;
      const totalLinesMemorized = totalMemorizedParas * this.AVG_LINES_PER_PARA;

      // Calculate remaining paras and estimated completion
      const remainingParas = 30 - totalMemorizedParas;
      let estimatedDaysToComplete = null;
      let estimatedCompletionDate = null;

      if (averageSabaqLinesPerDay > 0 && remainingParas > 0) {
        const linesPerPara = 20; // Average lines per para
        const totalLinesNeeded = remainingParas * linesPerPara;
        estimatedDaysToComplete = Math.ceil(totalLinesNeeded / averageSabaqLinesPerDay);

        // Add buffer
        estimatedDaysToComplete = Math.ceil(estimatedDaysToComplete * 1.2);

        estimatedCompletionDate = new Date();
        estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + estimatedDaysToComplete);
      }

      // Update status
      await prisma.studentHifzStatus.update({
        where: { studentId },
        data: {
          currentPara: latestProgress.currentPara,
          currentParaProgress: latestProgress.currentParaProgress,
          completedParas: uniqueCompleted,
          totalParasCompleted: uniqueCompleted.length,
          totalLinesMemorized,
          totalDaysActive,
          averageLinesPerDay: parseFloat(averageLinesPerDay.toFixed(2)),
          averageSabaqLinesPerDay: parseFloat(averageSabaqLinesPerDay.toFixed(2)),
          averageMistakesPerDay: parseFloat(averageMistakesPerDay.toFixed(2)),
          mistakeRate: parseFloat(mistakeRate.toFixed(2)),
          totalMistakes,
          estimatedDaysToComplete,
          estimatedCompletionDate,
          lastUpdated: new Date()
        }
      });

      console.log(`✅ Hifz status updated for student ${studentId}`);

    } catch (error) {
      console.error('Error updating Hifz status:', error);
    }
  }

  // Update para completion with improved logic
  async updateParaCompletion(req, res) {
    console.log('updateParaCompletion called:', req.params);

    try {
      const { studentId } = req.params;
      const {
        completedPara,
        currentPara,
        currentParaProgress,
        markAsComplete = false
      } = req.body;

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

      let hifzStatus = student.hifzStatus;

      // Create status if doesn't exist
      if (!hifzStatus) {
        hifzStatus = await prisma.studentHifzStatus.create({
          data: {
            studentId,
            currentPara: currentPara || 1,
            currentParaProgress: currentParaProgress || 0,
            completedParas: [],
            alreadyMemorizedParas: [],
            joiningDate: new Date(),
            totalParasCompleted: 0,
            totalLinesMemorized: 0
          }
        });
      }

      const updateData = {};
      let completionMessage = '';

      // Handle para completion
      if (completedPara || markAsComplete) {
        const paraToComplete = completedPara || hifzStatus.currentPara;

        if (paraToComplete < 1 || paraToComplete > 30) {
          return res.status(400).json({
            success: false,
            message: 'Para number must be between 1 and 30'
          });
        }

        const completedParas = [...(hifzStatus.completedParas || [])];

        if (!completedParas.includes(paraToComplete)) {
          completedParas.push(paraToComplete);
          updateData.completedParas = completedParas;
          updateData.totalParasCompleted = completedParas.length;

          completionMessage = `Para ${paraToComplete} marked as completed. `;

          // Auto-advance to next para if current para was completed
          if (!currentPara && paraToComplete === hifzStatus.currentPara && paraToComplete < 30) {
            updateData.currentPara = paraToComplete + 1;
            updateData.currentParaProgress = 0;
            completionMessage += `Auto-advanced to Para ${paraToComplete + 1}.`;
          }

          // Send notification
          await HifzNotificationService.notifyParaCompletion(student, paraToComplete);
        }
      }

      // Update current para and progress
      if (currentPara !== undefined) {
        updateData.currentPara = currentPara;
      }
      if (currentParaProgress !== undefined) {
        updateData.currentParaProgress = currentParaProgress;
      }

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No data to update'
        });
      }

      // Update status
      const updatedStatus = await prisma.studentHifzStatus.update({
        where: { studentId },
        data: updateData
      });

      // Recalculate overall status
      await this.updateStudentHifzStatus(studentId);

      return res.status(200).json({
        success: true,
        hifzStatus: updatedStatus,
        message: completionMessage || 'Para status updated successfully'
      });

    } catch (error) {
      console.error('Update para completion error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get progress reports with improved calculations
  async getStudentProgress(req, res) {
    try {
      const { studentId } = req.params;
      const { startDate, endDate, limit = 100, page = 1, includeAnalytics = 'false' } = req.query;

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
                  select: { name: true }
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

      // Calculate simple analytics if requested
      let analytics = null;
      if (includeAnalytics === 'true') {
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          include: { user: { select: { name: true } } }
        });

        if (student) {
          // Calculate days difference
          const days = startDate && endDate ?
            Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) : 30;

          const tempStudent = {
            ...student,
            hifzProgress: progressRecords,
            hifzStatus
          };

          analytics = await this.calculateStudentAnalytics(tempStudent, days, false);
        }
      }

      res.status(200).json({
        success: true,
        progress: progressRecords,
        hifzStatus,
        analytics,
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

  // Initialize student Hifz status
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
      const invalidParas = alreadyMemorizedParas.filter(p => p < 1 || p > 30);
      if (invalidParas.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid para numbers: ${invalidParas.join(', ')}. Must be between 1 and 30.`
        });
      }

      if (startingPara < 1 || startingPara > 30) {
        return res.status(400).json({
          success: false,
          message: 'Starting para must be between 1 and 30'
        });
      }

      // Calculate total lines memorized
      const totalLinesMemorized = alreadyMemorizedParas.length * this.AVG_LINES_PER_PARA;

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
          totalLinesMemorized,
          totalDaysActive: 0,
          averageLinesPerDay: 0,
          averageMistakesPerDay: 0,
          mistakeRate: 0,
          totalMistakes: 0
        }
      });

      res.status(201).json({
        success: true,
        hifzStatus,
        message: `Hifz status initialized. ${alreadyMemorizedParas.length} paras already memorized. Starting from Para ${startingPara}.`
      });

    } catch (error) {
      console.error('Initialize Hifz status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Improved weekly performance check
  async checkWeeklyPerformance(studentId) {
    try {
      const today = new Date();

      // Calculate previous week (Sunday to Saturday)
      const daysToSunday = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - daysToSunday - 7); // Previous Sunday
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // Following Saturday
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

      const totalDaysInWeek = 7;
      const presentDays = reports.filter(r =>
        r.attendance === 'PRESENT' || r.attendance === 'Present'
      ).length;

      const attendanceRate = (presentDays / totalDaysInWeek) * 100;

      // Calculate mistakes
      const totalMistakes = reports.reduce((sum, r) => sum + (r.totalMistakes || 0), 0);
      const avgMistakesPerDay = presentDays > 0 ? totalMistakes / presentDays : 0;

      // Check performance indicators
      const hasBelowAverageReports = reports.some(r => r.condition === 'Below Average');
      const hasLowAttendance = attendanceRate < 70; // Below 70%
      const hasHighMistakes = avgMistakesPerDay > 3;
      const hasNoProgress = reports.filter(r =>
        (r.sabaqLines || 0) + (r.sabqiLines || 0) + (r.manzilLines || 0) === 0
      ).length >= 3; // 3 or more days with no lines

      const hasPoorPerformance = hasBelowAverageReports ||
        hasLowAttendance ||
        hasHighMistakes ||
        hasNoProgress;

      return {
        hasPoorPerformance,
        totalDays: reports.length,
        presentDays,
        attendanceRate: parseFloat(attendanceRate.toFixed(1)),
        avgMistakesPerDay: parseFloat(avgMistakesPerDay.toFixed(1)),
        hasBelowAverageReports,
        hasLowAttendance,
        hasHighMistakes,
        hasNoProgress,
        periodStart: startDate,
        periodEnd: endDate,
        recommendations: this.generateWeeklyRecommendations(
          hasBelowAverageReports,
          hasLowAttendance,
          hasHighMistakes,
          hasNoProgress
        )
      };

    } catch (error) {
      console.error('Check weekly performance error:', error);
      return {
        hasPoorPerformance: false,
        error: error.message
      };
    }
  }

  // Generate recommendations based on weekly performance
  generateWeeklyRecommendations(hasBelowAverageReports, hasLowAttendance, hasHighMistakes, hasNoProgress) {
    const recommendations = [];

    if (hasBelowAverageReports) {
      recommendations.push({
        priority: 'High',
        message: 'Multiple below average performances',
        action: 'Review difficult areas and provide extra support'
      });
    }

    if (hasLowAttendance) {
      recommendations.push({
        priority: 'High',
        message: 'Low attendance rate',
        action: 'Discuss attendance importance with student and parents'
      });
    }

    if (hasHighMistakes) {
      recommendations.push({
        priority: 'Medium',
        message: 'High average mistakes per day',
        action: 'Focus on accuracy rather than speed, increase revision time'
      });
    }

    if (hasNoProgress) {
      recommendations.push({
        priority: 'Medium',
        message: 'Multiple days with no progress',
        action: 'Set smaller, achievable daily targets'
      });
    }

    return recommendations;
  }

  // Get students with poor performance
  async getPoorPerformers(req, res) {
    try {
      const { days = 7 } = req.query;

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
          hifzStatus: true,
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
          // Get recent progress for context
          const recentProgress = await prisma.hifzProgress.findMany({
            where: {
              studentId: student.id,
              date: {
                gte: new Date(new Date().setDate(new Date().getDate() - parseInt(days)))
              }
            },
            orderBy: { date: 'desc' },
            take: 5
          });

          poorPerformers.push({
            student: {
              id: student.id,
              name: student.user.name,
              admissionNo: student.admissionNo,
              classRoom: student.currentEnrollment?.classRoom?.name,
              teacher: student.currentEnrollment?.classRoom?.teacherId
            },
            hifzStatus: student.hifzStatus,
            weeklyPerformance,
            recentProgress: recentProgress.map(p => ({
              date: p.date,
              condition: p.condition,
              totalLines: p.totalLines,
              totalMistakes: p.totalMistakes
            }))
          });
        }
      }

      // Sort by severity (high priority first)
      poorPerformers.sort((a, b) => {
        const priorityA = a.weeklyPerformance.recommendations?.some(r => r.priority === 'High') ? 1 : 0;
        const priorityB = b.weeklyPerformance.recommendations?.some(r => r.priority === 'High') ? 1 : 0;
        return priorityB - priorityA;
      });

      res.status(200).json({
        success: true,
        poorPerformers,
        count: poorPerformers.length,
        period: `${days} days`
      });

    } catch (error) {
      console.error('Get poor performers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Generate comprehensive report
  async generateComprehensiveReport(req, res) {
    try {
      const { studentId } = req.params;
      const { days = 30 } = req.query;

      // Get student with all data
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { name: true, phone: true } },
          hifzStatus: true,
          hifzProgress: {
            where: {
              date: {
                gte: new Date(new Date().setDate(new Date().getDate() - parseInt(days)))
              }
            },
            orderBy: { date: 'desc' }
          },
          currentEnrollment: {
            include: {
              classRoom: {
                include: {
                  teacher: {
                    include: {
                      user: { select: { name: true } }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Calculate analytics
      const analytics = await this.calculateStudentAnalytics(student, parseInt(days), true);

      // Get weekly performance
      const weeklyPerformance = await this.checkWeeklyPerformance(studentId);

      // Get milestones and achievements
      const milestones = await this.getStudentMilestones(studentId);

      res.status(200).json({
        success: true,
        report: {
          studentInfo: {
            name: student.user.name,
            admissionNo: student.admissionNo,
            rollNo: student.currentEnrollment?.rollNumber,
            class: student.currentEnrollment?.classRoom?.name,
            teacher: student.currentEnrollment?.classRoom?.teacher?.user?.name
          },
          analytics,
          weeklyPerformance,
          milestones,
          progressRecords: student.hifzProgress.slice(0, 10), // Last 10 records
          summary: this.generateReportSummary(analytics, weeklyPerformance)
        }
      });

    } catch (error) {
      console.error('Generate report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Generate report summary
  generateReportSummary(analytics, weeklyPerformance) {
    const summary = {
      overallStatus: 'Good',
      keyStrengths: [],
      areasForImprovement: [],
      immediateActions: []
    };

    // Determine overall status
    if (analytics.attendance.rate >= 80 &&
      analytics.mistakes.mistakeRate <= 5 &&
      analytics.performance.consistencyScore >= 80) {
      summary.overallStatus = 'Excellent';
    } else if (analytics.attendance.rate >= 70 &&
      analytics.mistakes.mistakeRate <= 10 &&
      analytics.performance.consistencyScore >= 60) {
      summary.overallStatus = 'Good';
    } else if (analytics.attendance.rate >= 50 &&
      analytics.mistakes.mistakeRate <= 15) {
      summary.overallStatus = 'Average';
    } else {
      summary.overallStatus = 'Needs Improvement';
    }

    // Identify strengths
    if (analytics.attendance.rate >= 85) {
      summary.keyStrengths.push('Excellent attendance');
    }
    if (analytics.mistakes.mistakeRate <= 5) {
      summary.keyStrengths.push('High accuracy');
    }
    if (analytics.lines.avgSabaqLinesPerDay >= 15) {
      summary.keyStrengths.push('Good memorization pace');
    }
    if (analytics.paraProgress.totalMemorized >= 5) {
      summary.keyStrengths.push(`Significant progress (${analytics.paraProgress.totalMemorized} paras)`);
    }

    // Identify areas for improvement
    if (analytics.attendance.rate < 70) {
      summary.areasForImprovement.push('Attendance needs improvement');
      summary.immediateActions.push('Discuss attendance with student and parents');
    }
    if (analytics.mistakes.mistakeRate > 10) {
      summary.areasForImprovement.push('Accuracy needs attention');
      summary.immediateActions.push('Increase revision time and slow down pace');
    }
    if (analytics.lines.avgSabaqLinesPerDay < 5) {
      summary.areasForImprovement.push('Memorization pace is slow');
      summary.immediateActions.push('Set smaller daily targets and celebrate achievements');
    }

    // Add weekly performance insights
    if (weeklyPerformance.hasPoorPerformance) {
      summary.immediateActions.push(...weeklyPerformance.recommendations.map(r => r.action));
    }

    return summary;
  }

  // Get student milestones
  async getStudentMilestones(studentId) {
    try {
      const hifzStatus = await prisma.studentHifzStatus.findUnique({
        where: { studentId }
      });

      if (!hifzStatus) return {};

      const totalMemorized = (hifzStatus.alreadyMemorizedParas?.length || 0) +
        (hifzStatus.completedParas?.length || 0);

      const milestones = [
        { paras: 1, description: 'First para memorized', achieved: totalMemorized >= 1 },
        { paras: 5, description: '5 paras milestone', achieved: totalMemorized >= 5 },
        { paras: 10, description: '10 paras (1/3 of Quran)', achieved: totalMemorized >= 10 },
        { paras: 15, description: '15 paras (halfway point)', achieved: totalMemorized >= 15 },
        { paras: 20, description: '20 paras milestone', achieved: totalMemorized >= 20 },
        { paras: 25, description: '25 paras (5 remaining)', achieved: totalMemorized >= 25 },
        { paras: 30, description: 'Complete Quran memorized', achieved: totalMemorized >= 30 }
      ];

      const achieved = milestones.filter(m => m.achieved);
      const nextMilestone = milestones.find(m => !m.achieved);

      return {
        totalParasMemorized: totalMemorized,
        achievedMilestones: achieved,
        nextMilestone,
        parasToNextMilestone: nextMilestone ? nextMilestone.paras - totalMemorized : 0
      };

    } catch (error) {
      console.error('Get milestones error:', error);
      return {};
    }
  }

  // Get performance data for all Hifz students (aggregated)
  async hifzPerformance(req, res) {
    try {
      // Find all students in Hifz classes
      const hifzStudents = await prisma.student.findMany({
        where: {
          currentEnrollment: {
            classRoom: {
              type: 'HIFZ'
            }
          }
        },
        select: { id: true }
      });

      if (hifzStudents.length === 0) {
        return res.status(404).json({ success: false, message: "No Hifz students found" });
      }

      const studentIds = hifzStudents.map((s) => s.id);

      // Fetch reports
      const reports = await prisma.hifzProgress.findMany({
        where: {
          studentId: { in: studentIds }
        },
        include: {
          student: {
            select: {
              user: { select: { name: true } },
              admissionNo: true
            }
          }
        },
        orderBy: { date: 'asc' }
      });

      res.status(200).json({ success: true, reports });
    } catch (error) {
      console.error('Hifz performance error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get performance data grouped by class
  async allHifzClassesPerformance(req, res) {
    try {
      const { filter, startDate, endDate } = req.query;

      // Find Hifz students with class info
      const hifzStudents = await prisma.student.findMany({
        where: {
          currentEnrollment: {
            classRoom: {
              type: 'HIFZ'
            }
          }
        },
        include: {
          user: { select: { name: true } },
          currentEnrollment: {
            include: { classRoom: true }
          }
        }
      });

      if (hifzStudents.length === 0) {
        return res.status(404).json({ success: false, message: "No Hifz students found" });
      }

      const studentIds = hifzStudents.map((s) => s.id);

      // Build query
      let where = { studentId: { in: studentIds } };

      if (filter === "custom" && startDate && endDate) {
        where.date = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      } else if (filter === "weekly") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        where.date = { gte: oneWeekAgo };
      } else if (filter === "monthly") {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        where.date = { gte: oneMonthAgo };
      }

      const reports = await prisma.hifzProgress.findMany({
        where,
        orderBy: { date: 'asc' }
      });

      // Group by class
      const reportsByClass = {};

      // Map students for easy lookup
      const studentMap = {};
      hifzStudents.forEach(s => {
        studentMap[s.id] = {
          name: s.user.name,
          className: s.currentEnrollment?.classRoom?.name || 'Unknown'
        };

        // Initialize class array
        const className = s.currentEnrollment?.classRoom?.name || 'Unknown';
        if (!reportsByClass[className]) {
          reportsByClass[className] = [];
        }
      });

      // Distribute reports
      reports.forEach(report => {
        const student = studentMap[report.studentId];
        if (student) {
          reportsByClass[student.className].push({
            ...report,
            studentName: student.name
          });
        }
      });

      res.status(200).json({ success: true, reportsByClass });
    } catch (error) {
      console.error('All Hifz classes performance error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new HifzProgressController();