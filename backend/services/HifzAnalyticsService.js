const prisma = require('../db/prismaClient');

class HifzAnalyticsService {
  static LINES_PER_PAGE = 15;
  static PAGES_PER_PARA = 20;
  static TOTAL_PARAS = 30;
  static TOTAL_LINES_IN_QURAN = 604 * 15;
  static MISTAKE_THRESHOLD = 3;
  static LOW_PROGRESS_THRESHOLD = 5;

  // Calculate comprehensive analytics for a student
  static async calculateStudentAnalytics(studentId, days = 30) {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get progress records
      const progressRecords = await prisma.hifzProgress.findMany({
        where: {
          studentId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'asc' }
      });

      if (progressRecords.length === 0) {
        return {
          message: 'No progress records found for the specified period',
          recordCount: 0
        };
      }

      // Get student's Hifz status
      const hifzStatus = await prisma.studentHifzStatus.findUnique({
        where: { studentId }
      });

      // Basic calculations
      const totalDays = progressRecords.length;
      const totalSabaqLines = progressRecords.reduce((sum, r) => sum + r.sabaqLines, 0);
      const totalSabqiLines = progressRecords.reduce((sum, r) => sum + r.sabqiLines, 0);
      const totalManzilLines = progressRecords.reduce((sum, r) => sum + r.manzilLines, 0);
      const totalMistakes = progressRecords.reduce((sum, r) => sum + r.totalMistakes, 0);
      const totalLines = totalSabaqLines + totalSabqiLines + totalManzilLines;

      // Current status
      const latestProgress = progressRecords[progressRecords.length - 1];
      const currentPara = latestProgress.currentPara || 1;
      const currentParaProgress = latestProgress.currentParaProgress || 0;
      const completedParas = latestProgress.completedParas || [];
      const alreadyMemorizedParas = hifzStatus?.alreadyMemorizedParas || [];

      // Averages
      const avgLinesPerDay = totalDays > 0 ? totalSabaqLines / totalDays : 0;
      const avgMistakesPerDay = totalDays > 0 ? totalMistakes / totalDays : 0;
      const mistakeRate = totalLines > 0 ? (totalMistakes / totalLines) * 100 : 0;

      // Completion calculations
      const linesPerPara = this.LINES_PER_PAGE * this.PAGES_PER_PARA;
      const alreadyMemorizedLines = alreadyMemorizedParas.length * linesPerPara;
      const completedParasLines = completedParas.length * linesPerPara;
      const currentParaLines = (linesPerPara * currentParaProgress) / 100;
      const totalMemorizedLines = alreadyMemorizedLines + completedParasLines + currentParaLines;

      const remainingParas = this.TOTAL_PARAS - alreadyMemorizedParas.length - completedParas.length;
      const currentParaRemainingLines = linesPerPara * (100 - currentParaProgress) / 100;
      const totalRemainingLines = this.TOTAL_LINES_IN_QURAN - totalMemorizedLines;

      // Estimate completion
      const estimatedDaysToComplete = avgLinesPerDay > 0 
        ? Math.ceil(totalRemainingLines / avgLinesPerDay) 
        : null;
      const estimatedCompletionDate = estimatedDaysToComplete
        ? new Date(Date.now() + estimatedDaysToComplete * 24 * 60 * 60 * 1000)
        : null;

      // Performance trends (last 7 days vs overall)
      const last7Days = progressRecords.slice(-7);
      const last7DaysAvg = last7Days.length > 0
        ? last7Days.reduce((sum, r) => sum + r.sabaqLines, 0) / last7Days.length
        : 0;
      const performanceTrend = last7DaysAvg > avgLinesPerDay ? 'Improving' :
                              last7DaysAvg < avgLinesPerDay ? 'Declining' : 'Stable';

      // High mistake days
      const highMistakeDays = progressRecords.filter(r =>
        r.totalMistakes > this.MISTAKE_THRESHOLD
      ).length;

      // Consistency score
      const dateRange = progressRecords.length > 0
        ? Math.ceil(
            (new Date(progressRecords[progressRecords.length - 1].date) -
             new Date(progressRecords[0].date)) / (1000 * 60 * 60 * 24)
          ) + 1
        : 0;
      const consistencyScore = dateRange > 0 ? (totalDays / dateRange) * 100 : 0;

      // Attendance analysis
      const presentDays = progressRecords.filter(r => r.attendance === 'PRESENT').length;
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      // Condition breakdown
      const conditionBreakdown = {
        excellent: progressRecords.filter(r => r.condition === 'Excellent').length,
        good: progressRecords.filter(r => r.condition === 'Good').length,
        medium: progressRecords.filter(r => r.condition === 'Medium').length,
        belowAverage: progressRecords.filter(r => r.condition === 'Below Average').length
      };

      // Generate alerts
      const alerts = this.generateAlerts({
        avgMistakesPerDay,
        avgLinesPerDay,
        performanceTrend,
        consistencyScore,
        last7DaysAvg,
        highMistakeDays,
        progressRecords
      });

      return {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalDays
        },
        lines: {
          totalSabaqLines,
          totalSabqiLines,
          totalManzilLines,
          totalLines,
          avgLinesPerDay: parseFloat(avgLinesPerDay.toFixed(1))
        },
        mistakes: {
          totalMistakes,
          avgMistakesPerDay: parseFloat(avgMistakesPerDay.toFixed(1)),
          mistakeRate: parseFloat(mistakeRate.toFixed(1)),
          highMistakeDays
        },
        paraProgress: {
          currentPara,
          currentParaProgress: parseFloat(currentParaProgress.toFixed(1)),
          completedParas: completedParas.length,
          completedParasList: completedParas,
          alreadyMemorizedParas: alreadyMemorizedParas.length,
          alreadyMemorizedParasList: alreadyMemorizedParas,
          remainingParas,
          totalMemorizedLines: Math.round(totalMemorizedLines),
          totalRemainingLines: Math.round(totalRemainingLines),
          overallCompletionPercentage: parseFloat(
            ((totalMemorizedLines / this.TOTAL_LINES_IN_QURAN) * 100).toFixed(1)
          )
        },
        projection: {
          estimatedDaysToComplete,
          estimatedCompletionDate: estimatedCompletionDate?.toISOString()
        },
        performance: {
          performanceTrend,
          last7DaysAvg: parseFloat(last7DaysAvg.toFixed(1)),
          consistencyScore: parseFloat(consistencyScore.toFixed(1)),
          attendanceRate: parseFloat(attendanceRate.toFixed(1)),
          presentDays,
          conditionBreakdown
        },
        alerts,
        recordCount: totalDays
      };

    } catch (error) {
      console.error('Calculate analytics error:', error);
      throw error;
    }
  }

  // Generate alerts based on performance metrics
  static generateAlerts(metrics) {
    const alerts = [];

    // High mistakes alert
    if (metrics.avgMistakesPerDay > this.MISTAKE_THRESHOLD) {
      alerts.push({
        type: 'HIGH_MISTAKES',
        severity: 'warning',
        message: `Averaging ${metrics.avgMistakesPerDay.toFixed(1)} mistakes per day (threshold: ${this.MISTAKE_THRESHOLD})`,
        recommendation: 'Focus on improving accuracy. Review difficult sections more frequently and practice with teacher.'
      });
    }

    // Low progress alert
    if (metrics.avgLinesPerDay < this.LOW_PROGRESS_THRESHOLD) {
      alerts.push({
        type: 'LOW_PROGRESS',
        severity: 'warning',
        message: `Only memorizing ${metrics.avgLinesPerDay.toFixed(1)} lines per day (threshold: ${this.LOW_PROGRESS_THRESHOLD})`,
        recommendation: 'Try to increase daily memorization target. Consistency is key to steady progress.'
      });
    }

    // Declining performance alert
    if (metrics.performanceTrend === 'Declining') {
      alerts.push({
        type: 'DECLINING_PERFORMANCE',
        severity: 'info',
        message: `Performance declining: Last 7 days avg (${metrics.last7DaysAvg.toFixed(1)}) < Overall avg (${metrics.avgLinesPerDay.toFixed(1)})`,
        recommendation: 'Review your study schedule and ensure adequate rest. Consider discussing challenges with your teacher.'
      });
    }

    // Low consistency alert
    if (metrics.consistencyScore < 70) {
      alerts.push({
        type: 'LOW_CONSISTENCY',
        severity: 'warning',
        message: `Low consistency: ${metrics.consistencyScore.toFixed(1)}% attendance (should be >70%)`,
        recommendation: 'Maintain regular attendance for better progress. Consistency is crucial for memorization.'
      });
    }

    // Consecutive high mistakes alert
    const recentRecords = metrics.progressRecords.slice(-3);
    const consecutiveHighMistakes = recentRecords.length === 3 &&
      recentRecords.every(r => r.totalMistakes > this.MISTAKE_THRESHOLD);
    
    if (consecutiveHighMistakes) {
      alerts.push({
        type: 'CONSECUTIVE_HIGH_MISTAKES',
        severity: 'critical',
        message: `Critical: 3 consecutive days with high mistakes (>${this.MISTAKE_THRESHOLD})`,
        recommendation: 'Immediate attention needed. Schedule extra revision sessions and consult with teacher about current pace.'
      });
    }

    // Positive feedback
    if (alerts.length === 0) {
      alerts.push({
        type: 'EXCELLENT_PERFORMANCE',
        severity: 'success',
        message: 'Excellent performance! All metrics within healthy ranges.',
        recommendation: 'Continue maintaining your current pace and accuracy. Keep up the great work!'
      });
    }

    return alerts;
  }

  // Compare student performance with class average
  static async compareWithClassAverage(studentId) {
    try {
      // Get student's class
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          currentEnrollment: {
            include: {
              classRoom: true
            }
          }
        }
      });

      if (!student?.currentEnrollment) {
        throw new Error('Student not enrolled in any class');
      }

      const classId = student.currentEnrollment.classRoomId;

      // Get all students in the same class
      const classmates = await prisma.student.findMany({
        where: {
          currentEnrollment: {
            classRoomId: classId
          }
        },
        select: {
          id: true
        }
      });

      // Calculate class analytics for last 30 days
      const classAnalytics = await Promise.all(
        classmates.map(s => this.calculateStudentAnalytics(s.id, 30))
      );

      const validAnalytics = classAnalytics.filter(a => a.recordCount > 0);

      if (validAnalytics.length === 0) {
        return {
          message: 'No class data available for comparison'
        };
      }

      // Calculate class averages
      const classAvgLinesPerDay = validAnalytics.reduce(
        (sum, a) => sum + a.lines.avgLinesPerDay, 0
      ) / validAnalytics.length;

      const classAvgMistakesPerDay = validAnalytics.reduce(
        (sum, a) => sum + a.mistakes.avgMistakesPerDay, 0
      ) / validAnalytics.length;

      const classAvgConsistency = validAnalytics.reduce(
        (sum, a) => sum + a.performance.consistencyScore, 0
      ) / validAnalytics.length;

      // Get student's analytics
      const studentAnalytics = await this.calculateStudentAnalytics(studentId, 30);

      if (studentAnalytics.recordCount === 0) {
        return {
          message: 'No student data available'
        };
      }

      // Compare
      return {
        student: {
          linesPerDay: studentAnalytics.lines.avgLinesPerDay,
          mistakesPerDay: studentAnalytics.mistakes.avgMistakesPerDay,
          consistency: studentAnalytics.performance.consistencyScore
        },
        classAverage: {
          linesPerDay: parseFloat(classAvgLinesPerDay.toFixed(1)),
          mistakesPerDay: parseFloat(classAvgMistakesPerDay.toFixed(1)),
          consistency: parseFloat(classAvgConsistency.toFixed(1))
        },
        comparison: {
          linesPerDay: studentAnalytics.lines.avgLinesPerDay > classAvgLinesPerDay ? 'Above Average' : 
                      studentAnalytics.lines.avgLinesPerDay < classAvgLinesPerDay ? 'Below Average' : 'Average',
          mistakesPerDay: studentAnalytics.mistakes.avgMistakesPerDay < classAvgMistakesPerDay ? 'Better' : 
                         studentAnalytics.mistakes.avgMistakesPerDay > classAvgMistakesPerDay ? 'Needs Improvement' : 'Average',
          consistency: studentAnalytics.performance.consistencyScore > classAvgConsistency ? 'More Consistent' : 
                      studentAnalytics.performance.consistencyScore < classAvgConsistency ? 'Less Consistent' : 'Average'
        },
        classSize: validAnalytics.length
      };

    } catch (error) {
      console.error('Compare with class error:', error);
      throw error;
    }
  }

  // Get class-wide analytics
  static async getClassAnalytics(classId, days = 30) {
    try {
      // Get all students in class
      const students = await prisma.student.findMany({
        where: {
          currentEnrollment: {
            classRoomId: classId
          }
        },
        include: {
          user: {
            select: {
              name: true
            }
          },
          currentEnrollment: {
            select: {
              rollNumber: true
            }
          }
        }
      });

      const studentAnalytics = await Promise.all(
        students.map(async (student) => {
          const analytics = await this.calculateStudentAnalytics(student.id, days);
          return {
            studentId: student.id,
            studentName: student.user.name,
            admissionNo: student.admissionNo,
            rollNumber: student.currentEnrollment?.rollNumber,
            analytics
          };
        })
      );

      // Filter out students with no data
      const validData = studentAnalytics.filter(s => s.analytics.recordCount > 0);

      // Calculate class totals and averages
      const classStats = {
        totalStudents: students.length,
        activeStudents: validData.length,
        avgLinesPerDay: validData.length > 0 
          ? validData.reduce((sum, s) => sum + s.analytics.lines.avgLinesPerDay, 0) / validData.length 
          : 0,
        avgMistakesPerDay: validData.length > 0
          ? validData.reduce((sum, s) => sum + s.analytics.mistakes.avgMistakesPerDay, 0) / validData.length
          : 0,
        avgConsistency: validData.length > 0
          ? validData.reduce((sum, s) => sum + s.analytics.performance.consistencyScore, 0) / validData.length
          : 0,
        topPerformers: validData
          .sort((a, b) => b.analytics.lines.avgLinesPerDay - a.analytics.lines.avgLinesPerDay)
          .slice(0, 5)
          .map(s => ({
            name: s.studentName,
            admissionNo: s.admissionNo,
            avgLinesPerDay: s.analytics.lines.avgLinesPerDay
          })),
        studentsNeedingAttention: validData
          .filter(s => 
            s.analytics.alerts.some(a => a.severity === 'warning' || a.severity === 'critical')
          )
          .map(s => ({
            name: s.studentName,
            admissionNo: s.admissionNo,
            alerts: s.analytics.alerts.filter(a => a.severity === 'warning' || a.severity === 'critical')
          }))
      };

      return {
        classStats,
        studentAnalytics: validData
      };

    } catch (error) {
      console.error('Get class analytics error:', error);
      throw error;
    }
  }
}

module.exports = HifzAnalyticsService;