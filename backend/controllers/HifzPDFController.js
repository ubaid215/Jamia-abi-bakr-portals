const PDFDocument = require('pdfkit');
const prisma = require('../db/prismaClient');
const HifzCalculationHelper = require('../services/HifzCalculationHelper');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

class HifzPDFController {
  // Generate and download Hifz progress PDF report
  async generateReport(req, res) {
    const requestStartTime = Date.now();

    try {
      console.log('📄 [HIFZ PDF REPORT] Generate report request received');

      const { studentId } = req.params;
      const {
        days = 30,
        type = 'comprehensive', // Default to comprehensive if not specified
        startDate,
        endDate,
        includeCharts = 'true',
        reportTitle = 'Hifz Progress Report'
      } = req.query;

      console.log('📋 Request Details:', {
        studentId,
        days,
        type,
        startDate,
        endDate,
        includeCharts
      });

      if (!studentId) {
        return res.status(400).json({
          success: false,
          error: 'Student ID is required'
        });
      }

      // Calculate date range
      let dateFilter = {};
      let periodText = '';

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        dateFilter = {
          date: {
            gte: start,
            lte: end
          }
        };
        periodText = `${moment(start).format('DD MMM YYYY')} - ${moment(end).format('DD MMM YYYY')}`;
      } else {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - parseInt(days));
        dateFilter = {
          date: {
            gte: start,
            lte: end
          }
        };
        periodText = `Last ${days} days (up to ${moment(end).format('DD MMM YYYY')})`;
      }

      // Fetch student with all related data
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          },
          hifzStatus: true,
          hifzProgress: {
            where: dateFilter,
            orderBy: {
              date: 'desc'
            },
            include: {
              teacher: {
                include: {
                  user: {
                    select: { name: true }
                  }
                }
              }
            }
          },
          currentEnrollment: {
            include: {
              classRoom: {
                include: {
                  teacher: {
                    include: {
                      user: {
                        select: { name: true }
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
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }

      console.log(`✅ Student found: ${student.user.name}`);
      console.log(`📊 Progress records: ${student.hifzProgress?.length || 0}`);

      // Calculate analytics
      const analytics = await this.calculateAnalytics(student, dateFilter);

      // Generate PDF
      const pdfBuffer = await this.createPDF(student, analytics, {
        type,
        includeCharts: includeCharts === 'true',
        reportTitle,
        periodText,
        dateFilter
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="hifz-report-${student.admissionNo}-${student.user.name.replace(/\s+/g, '-')}-${Date.now()}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

      console.log(`✅ Report generated in ${Date.now() - requestStartTime}ms`);

    } catch (error) {
      console.error('🔥 Report generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
        message: error.message
      });
    }
  }

  // ✅ NEW ADDITION: Generate Hifz-only PDF report
  async generateHifzOnlyReport(req, res) {
    req.query.type = 'hifz-only';
    req.query.reportTitle = 'Hifz Specific Report';
    return this.generateReport(req, res);
  }

  // ✅ NEW ADDITION: Generate Full PDF report
  async generateFullReport(req, res) {
    req.query.type = 'comprehensive';
    req.query.reportTitle = 'Full Progress Report';
    return this.generateReport(req, res);
  }

  // Calculate analytics with improved logic
  async calculateAnalytics(student, dateFilter) {
    const progressRecords = student.hifzProgress || [];
    const hifzStatus = student.hifzStatus || {};

    console.log(`📈 Processing ${progressRecords.length} progress records`);

    // Determine period days
    const periodStart = dateFilter.date?.gte || new Date(new Date().setDate(new Date().getDate() - 30));
    const periodEnd = dateFilter.date?.lte || new Date();
    const totalDaysInPeriod = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1;

    // Filter present days
    const presentRecords = progressRecords.filter(r =>
      r.attendance === 'PRESENT' || r.attendance === 'Present'
    );
    const presentDays = presentRecords.length;

    // Calculate attendance rate
    const attendanceRate = totalDaysInPeriod > 0 ? (presentDays / totalDaysInPeriod) * 100 : 0;

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

      if (parseInt(report.totalMistakes) > 5) {
        highMistakeDays++;
      }
    });

    const totalLines = totalSabaqLines + totalSabqiLines + totalManzilLines;

    // Calculate averages based on PRESENT days only
    const avgLinesPerDay = presentDays > 0 ? totalLines / presentDays : 0;
    const avgSabaqLinesPerDay = presentDays > 0 ? totalSabaqLines / presentDays : 0;
    const avgMistakesPerDay = presentDays > 0 ? totalMistakes / presentDays : 0;
    const mistakeRate = totalLines > 0 ? (totalMistakes / totalLines) * 100 : 0;

    // Para progress calculations
    const alreadyMemorizedParas = hifzStatus.alreadyMemorizedParas || [];
    const completedParas = hifzStatus.completedParas || [];

    // Remove duplicates
    const uniqueAlreadyMemorized = alreadyMemorizedParas.filter(p => !completedParas.includes(p));
    const uniqueCompleted = completedParas.filter(p => !alreadyMemorizedParas.includes(p));

    const totalUniqueMemorizedParas = uniqueAlreadyMemorized.length + uniqueCompleted.length;
    const currentPara = hifzStatus.currentPara || 1;
    const currentParaProgress = hifzStatus.currentParaProgress || 0;
    const remainingParas = 30 - totalUniqueMemorizedParas;
    const overallCompletion = (totalUniqueMemorizedParas / 30) * 100;

    // Condition breakdown
    const conditionBreakdown = {
      excellent: progressRecords.filter(r => r.condition === 'Excellent').length,
      good: progressRecords.filter(r => r.condition === 'Good').length,
      medium: progressRecords.filter(r => r.condition === 'Medium').length,
      belowAverage: progressRecords.filter(r => r.condition === 'Below Average').length,
      na: progressRecords.filter(r => r.condition === 'N/A' || !r.condition).length
    };

    // Performance trend (last 7 days)
    const last7Days = progressRecords.slice(0, 7);
    const last7DaysPresent = last7Days.filter(r =>
      r.attendance === 'PRESENT' || r.attendance === 'Present'
    );

    const last7Avg = last7DaysPresent.length > 0 ?
      last7DaysPresent.reduce((sum, r) => sum + (parseInt(r.sabaqLines) || 0), 0) / last7DaysPresent.length : 0;

    // Performance trend analysis
    let performanceTrend = "Stable";
    let trendIcon = "→";

    if (last7Days.length >= 3) {
      const firstHalf = last7Days.slice(0, 3).filter(r =>
        r.attendance === 'PRESENT' || r.attendance === 'Present'
      );
      const secondHalf = last7Days.slice(4).filter(r =>
        r.attendance === 'PRESENT' || r.attendance === 'Present'
      );

      if (firstHalf.length > 0 && secondHalf.length > 0) {
        const firstAvg = firstHalf.reduce((sum, r) => sum + (parseInt(r.sabaqLines) || 0), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, r) => sum + (parseInt(r.sabaqLines) || 0), 0) / secondHalf.length;

        if (secondAvg > firstAvg * 1.2) {
          performanceTrend = "Improving";
          trendIcon = "↑";
        } else if (secondAvg < firstAvg * 0.8) {
          performanceTrend = "Declining";
          trendIcon = "↓";
        }
      }
    }

    // Calculate consistency score
    const consistencyScore = Math.min(100, Math.max(0,
      (attendanceRate * 0.3) +
      ((100 - Math.min(mistakeRate, 100)) * 0.3) +
      (overallCompletion * 0.2) +
      ((conditionBreakdown.excellent / Math.max(presentDays, 1)) * 100 * 0.2)
    ));

    // Projections
    let estimatedDaysToComplete = null;
    let estimatedCompletionDate = null;
    let timeDescription = "Not enough data";

    if (avgSabaqLinesPerDay > 0 && remainingParas > 0) {
      const totalLinesNeeded = remainingParas * 20; // 20 lines per para average
      estimatedDaysToComplete = Math.ceil(totalLinesNeeded / avgSabaqLinesPerDay);

      // Add buffer for revision and consolidation
      estimatedDaysToComplete = Math.ceil(estimatedDaysToComplete * 1.2);

      estimatedCompletionDate = new Date();
      estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + estimatedDaysToComplete);

      // Human readable time description
      const months = Math.floor(estimatedDaysToComplete / 30);
      const weeks = Math.floor((estimatedDaysToComplete % 30) / 7);
      const daysRemain = estimatedDaysToComplete % 7;

      if (months > 0) {
        timeDescription = `About ${months} month${months > 1 ? 's' : ''}`;
        if (weeks > 0) {
          timeDescription += ` and ${weeks} week${weeks > 1 ? 's' : ''}`;
        }
      } else if (weeks > 0) {
        timeDescription = `About ${weeks} week${weeks > 1 ? 's' : ''}`;
        if (daysRemain > 0) {
          timeDescription += ` and ${daysRemain} day${daysRemain > 1 ? 's' : ''}`;
        }
      } else {
        timeDescription = `About ${daysRemain} day${daysRemain > 1 ? 's' : ''}`;
      }
    }

    // Calculate milestone progress
    const milestones = [
      { target: 1, label: 'First Para', achieved: totalUniqueMemorizedParas >= 1 },
      { target: 5, label: '5 Paras', achieved: totalUniqueMemorizedParas >= 5 },
      { target: 10, label: '1/3 Quran', achieved: totalUniqueMemorizedParas >= 10 },
      { target: 15, label: 'Halfway', achieved: totalUniqueMemorizedParas >= 15 },
      { target: 20, label: '20 Paras', achieved: totalUniqueMemorizedParas >= 20 },
      { target: 25, label: '25 Paras', achieved: totalUniqueMemorizedParas >= 25 },
      { target: 30, label: 'Complete', achieved: totalUniqueMemorizedParas >= 30 }
    ];

    const nextMilestone = milestones.find(m => !m.achieved);
    const parasToNextMilestone = nextMilestone ? nextMilestone.target - totalUniqueMemorizedParas : 0;

    // Generate alerts and recommendations
    const alerts = this.generateAlerts(
      attendanceRate,
      mistakeRate,
      totalUniqueMemorizedParas,
      avgSabaqLinesPerDay,
      presentDays,
      totalDaysInPeriod,
      conditionBreakdown,
      uniqueAlreadyMemorized,
      uniqueCompleted
    );

    // Calculate daily statistics for charts
    const dailyStats = progressRecords.map(record => ({
      date: moment(record.date).format('DD/MM'),
      sabaqLines: parseInt(record.sabaqLines) || 0,
      sabqiLines: record.sabqi || '-', // Use string directly
      manzilLines: record.manzil || '-', // Use string directly
      mistakes: parseInt(record.totalMistakes) || 0,
      condition: record.condition || 'N/A',
      attendance: record.attendance || 'ABSENT'
    }));

    return {
      period: {
        startDate: periodStart,
        endDate: periodEnd,
        totalDays: totalDaysInPeriod,
        presentDays,
        attendanceRate: parseFloat(attendanceRate.toFixed(1))
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
        completedDuringTraining: uniqueCompleted.length,
        totalMemorized: totalUniqueMemorizedParas,
        currentPara,
        currentParaProgress,
        remainingParas,
        overallCompletionPercentage: parseFloat(overallCompletion.toFixed(1)),
        overlaps: alreadyMemorizedParas.filter(p => completedParas.includes(p)),
        uniqueAlreadyMemorized,
        uniqueCompleted
      },
      performance: {
        totalReports: progressRecords.length,
        consistencyScore: parseFloat(consistencyScore.toFixed(1)),
        conditionBreakdown,
        last7DaysAvg: parseFloat(last7Avg.toFixed(1)),
        performanceTrend,
        trendIcon,
        dailyStats
      },
      projection: {
        estimatedDaysToComplete,
        estimatedCompletionDate,
        timeDescription
      },
      milestones: {
        all: milestones,
        nextMilestone,
        parasToNextMilestone,
        progressToNext: nextMilestone ?
          ((totalUniqueMemorizedParas / nextMilestone.target) * 100).toFixed(0) : 100
      },
      alerts,
      recommendations: alerts.map(alert => ({
        priority: alert.severity === 'critical' ? 'High' :
          alert.severity === 'warning' ? 'Medium' : 'Low',
        action: alert.recommendation
      }))
    };
  }

  // Generate alerts based on analytics
  generateAlerts(attendanceRate, mistakeRate, totalMemorizedParas, avgSabaqLinesPerDay,
    presentDays, totalDays, conditionBreakdown, alreadyMemorized, completedParas) {
    const alerts = [];

    // Attendance alerts
    if (presentDays > 0) {
      if (attendanceRate < 50) {
        alerts.push({
          severity: 'critical',
          message: `Very low attendance (${attendanceRate.toFixed(1)}%)`,
          recommendation: 'Immediate intervention needed. Contact parents and discuss importance of regular attendance.'
        });
      } else if (attendanceRate < 70) {
        alerts.push({
          severity: 'warning',
          message: `Low attendance (${attendanceRate.toFixed(1)}%)`,
          recommendation: 'Monitor attendance closely. Set attendance goals with student.'
        });
      }
    }

    // Accuracy alerts
    if (mistakeRate > 15) {
      alerts.push({
        severity: 'critical',
        message: `High mistake rate (${mistakeRate.toFixed(1)}%)`,
        recommendation: 'Focus on accuracy over speed. Reduce new memorization and increase revision time.'
      });
    } else if (mistakeRate > 10) {
      alerts.push({
        severity: 'warning',
        message: `Moderate mistake rate (${mistakeRate.toFixed(1)}%)`,
        recommendation: 'Review previous lessons regularly. Slow down memorization pace.'
      });
    }

    // Progress alerts
    if (totalMemorizedParas === 0 && presentDays >= 5) {
      alerts.push({
        severity: 'warning',
        message: 'No paras memorized yet',
        recommendation: 'Start with small targets (1-2 lines daily). Focus on consistency rather than quantity.'
      });
    }

    if (avgSabaqLinesPerDay < 3 && presentDays >= 5) {
      alerts.push({
        severity: 'info',
        message: `Low memorization rate (${avgSabaqLinesPerDay.toFixed(1)} lines/day)`,
        recommendation: 'Gradually increase daily targets. Celebrate small achievements to build confidence.'
      });
    }

    // Performance alerts
    const totalConditions = conditionBreakdown.excellent + conditionBreakdown.good +
      conditionBreakdown.medium + conditionBreakdown.belowAverage;

    if (conditionBreakdown.belowAverage > 0 && totalConditions > 0) {
      const belowAvgPercent = (conditionBreakdown.belowAverage / totalConditions) * 100;
      if (belowAvgPercent > 30) {
        alerts.push({
          severity: 'critical',
          message: `High number of below average days (${belowAvgPercent.toFixed(0)}%)`,
          recommendation: 'Review teaching methodology. Provide additional support and consider reducing workload.'
        });
      }
    }

    // Overlap detection
    const overlaps = alreadyMemorized.filter(p => completedParas.includes(p));
    if (overlaps.length > 0) {
      alerts.push({
        severity: 'info',
        message: `Para overlap detected (${overlaps.join(', ')})`,
        recommendation: 'Ensure paras are not counted twice. Review already memorized vs completed lists.'
      });
    }

    // Consistency alert
    if (presentDays > 10 && conditionBreakdown.excellent / presentDays < 0.3) {
      alerts.push({
        severity: 'warning',
        message: 'Low percentage of excellent days',
        recommendation: 'Focus on quality of memorization. Ensure student is well-rested before class.'
      });
    }

    return alerts;
  }

  // Create PDF document
  async createPDF(student, analytics, options = {}) {
    const {
      type = 'comprehensive',
      includeCharts = true,
      reportTitle = 'Hifz Progress Report',
      periodText = '',
      dateFilter = {}
    } = options;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 40,
          size: 'A4',
          font: 'Helvetica',
          info: {
            Title: reportTitle,
            Author: 'Khanqah Saifia Management System',
            Subject: `Hifz Progress Report for ${student.user.name}`,
            Keywords: 'Hifz, Quran, Memorization, Progress, Report',
            Creator: 'Khanqah Saifia',
            CreationDate: new Date()
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Add content in proper order
        this.addHeader(doc, student, reportTitle, periodText);
        doc.moveDown(0.5);
        this.addStudentInfo(doc, student);
        this.addSummarySection(doc, analytics);
        this.addParaProgressSection(doc, analytics, student);

        if (type === 'detailed' || type === 'comprehensive' || type === 'hifz-only') {
          this.addPerformanceAnalysis(doc, analytics);
          // Only show detailed attendance analysis for comprehensive/detailed reports, not hifz-only
          if (type !== 'hifz-only') {
            this.addAttendanceAnalysis(doc, analytics);
          }

          if (includeCharts) {
            this.addProgressCharts(doc, analytics);
          }
        }

        if (type === 'comprehensive') {
          this.addMilestonesSection(doc, analytics);
          this.addProjectionsSection(doc, analytics);
          this.addAlertsSection(doc, analytics);
          this.addProgressTable(doc, student.hifzProgress);
        }

        // For Hifz-only, we might still want the progress table but maybe simpler? 
        // Let's include the table for hifz-only as well so they see the logs
        if (type === 'hifz-only') {
          this.addProgressTable(doc, student.hifzProgress);
        }

        this.addFooter(doc, student);
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  // Add header with title and period - FIXED
  addHeader(doc, student, title, periodText) {
    // Top banner
    doc.rect(0, 0, doc.page.width, 80)
      .fillColor('#1a365d')
      .fill();

    // Madrasa Name
    doc.fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('KHANQAH SAIFIA', 40, 30, { align: 'left' });

    doc.fontSize(14)
      .font('Helvetica')
      .text('Hifz Program', 40, 55, { align: 'left' });

    // Report title and period
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text(title, 0, 100, { align: 'center' });

    if (periodText) {
      doc.fontSize(11)
        .font('Helvetica-Oblique')
        .fillColor('#4a5568')
        .text(`Period: ${periodText}`, 0, 120, { align: 'center' });
    }

    // Generated date
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#718096')
      .text(`Generated: ${generatedDate}`, 40, 140);

    doc.y = 160;
  }

  // Add student information - FIXED
  addStudentInfo(doc, student) {
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Student Information', 40, doc.y);

    doc.moveDown(0.3);

    // Create info box
    const infoBoxY = doc.y;
    const infoBoxHeight = 80;

    doc.rect(40, infoBoxY, 515, infoBoxHeight)
      .fillColor('#f7fafc')
      .fill();

    doc.rect(40, infoBoxY, 515, infoBoxHeight)
      .strokeColor('#e2e8f0')
      .stroke();

    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#4a5568');

    const infoY = infoBoxY + 15;
    const col1X = 55;
    const col2X = 230;
    const col3X = 405;
    const lineHeight = 16;

    // Left column
    doc.text(`Name: ${student.user.name}`, col1X, infoY)
      .text(`Admission No: ${student.admissionNo || 'N/A'}`, col1X, infoY + lineHeight)
      .text(`Roll No: ${student.currentEnrollment?.rollNumber || 'N/A'}`, col1X, infoY + (lineHeight * 2))
      .text(`Phone: ${student.user.phone || 'N/A'}`, col1X, infoY + (lineHeight * 3));

    // Middle column
    doc.text(`Class: ${student.currentEnrollment?.classRoom?.name || 'N/A'}`, col2X, infoY)
      .text(`Teacher: ${student.currentEnrollment?.classRoom?.teacher?.user?.name || 'Not Assigned'}`, col2X, infoY + lineHeight)
      .text(`Email: ${student.user.email || 'N/A'}`, col2X, infoY + (lineHeight * 2))
      .text(`Status: ${student.hifzStatus ? 'Active' : 'Not Initialized'}`, col2X, infoY + (lineHeight * 3));

    // Right column - Para info
    if (student.hifzStatus) {
      const hifzStatus = student.hifzStatus;
      doc.text(`Current Para: ${hifzStatus.currentPara || 1}`, col3X, infoY)
        .text(`Progress: ${hifzStatus.currentParaProgress || 0}%`, col3X, infoY + lineHeight)
        .text(`Memorized: ${hifzStatus.completedParas?.length || 0} paras`, col3X, infoY + (lineHeight * 2))
        .text(`Total Days: ${hifzStatus.totalDaysActive || 0}`, col3X, infoY + (lineHeight * 3));
    } else {
      doc.text('Current Para: N/A', col3X, infoY)
        .text('Progress: N/A', col3X, infoY + lineHeight)
        .text('Memorized: N/A', col3X, infoY + (lineHeight * 2))
        .text('Total Days: N/A', col3X, infoY + (lineHeight * 3));
    }

    doc.y = infoBoxY + infoBoxHeight + 15;
  }

  // Add summary section - FIXED
  addSummarySection(doc, analytics) {
    // Check for page break
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 40;
    }

    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Progress Summary', 40, doc.y);

    doc.moveDown(0.3);

    // Summary boxes
    const boxWidth = 165;
    const boxHeight = 60;
    const gap = 15;
    const startX = 40;
    const startY = doc.y;

    // Box 1: Attendance
    doc.rect(startX, startY, boxWidth, boxHeight)
      .fillColor('#ebf8ff')
      .fill();

    doc.rect(startX, startY, boxWidth, boxHeight)
      .strokeColor('#4299e1')
      .stroke();

    doc.fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#2b6cb0')
      .text('Attendance', startX + 15, startY + 8);

    doc.fontSize(22)
      .font('Helvetica-Bold')
      .fillColor('#2c5282')
      .text(`${analytics.period.attendanceRate}%`, startX + 15, startY + 25);

    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#4a5568')
      .text(`${analytics.period.presentDays}/${analytics.period.totalDays} days`,
        startX + 15, startY + 45);

    // Box 2: Daily Average
    doc.rect(startX + boxWidth + gap, startY, boxWidth, boxHeight)
      .fillColor('#f0fff4')
      .fill();

    doc.rect(startX + boxWidth + gap, startY, boxWidth, boxHeight)
      .strokeColor('#48bb78')
      .stroke();

    doc.fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#276749')
      .text('Daily Average', startX + boxWidth + gap + 15, startY + 8);

    doc.fontSize(22)
      .font('Helvetica-Bold')
      .fillColor('#2f855a')
      .text(`${analytics.lines.avgSabaqLinesPerDay}`,
        startX + boxWidth + gap + 15, startY + 25);

    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#4a5568')
      .text('New lines/day', startX + boxWidth + gap + 15, startY + 45);

    // Box 3: Accuracy
    doc.rect(startX + (boxWidth + gap) * 2, startY, boxWidth, boxHeight)
      .fillColor('#fff5f5')
      .fill();

    doc.rect(startX + (boxWidth + gap) * 2, startY, boxWidth, boxHeight)
      .strokeColor('#f56565')
      .stroke();

    doc.fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#c53030')
      .text('Accuracy', startX + (boxWidth + gap) * 2 + 15, startY + 8);

    const accuracy = 100 - Math.min(analytics.mistakes.mistakeRate, 100);
    doc.fontSize(22)
      .font('Helvetica-Bold')
      .fillColor('#e53e3e')
      .text(`${accuracy.toFixed(1)}%`,
        startX + (boxWidth + gap) * 2 + 15, startY + 25);

    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#4a5568')
      .text(`Mistake rate: ${analytics.mistakes.mistakeRate.toFixed(1)}%`,
        startX + (boxWidth + gap) * 2 + 15, startY + 45);

    doc.y = startY + boxHeight + 20;

    // Consistency score
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Consistency Score:', 40, doc.y, { continued: true });

    const consistencyColor = analytics.performance.consistencyScore >= 80 ? '#48bb78' :
      analytics.performance.consistencyScore >= 60 ? '#ed8936' : '#e53e3e';

    doc.fillColor(consistencyColor)
      .text(` ${analytics.performance.consistencyScore}%`);

    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#4a5568')
      .text(analytics.performance.consistencyScore >= 80 ? 'Excellent consistency' :
        analytics.performance.consistencyScore >= 60 ? 'Good consistency' : 'Needs improvement',
        180, doc.y);

    doc.y += 20;
  }

  // Add para progress section - FIXED
  addParaProgressSection(doc, analytics, student) {
    // Check for page break
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 40;
    }

    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Para Progress Overview', 40, doc.y);

    doc.moveDown(0.3);

    // Progress details
    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#4a5568');

    const detailsY = doc.y;
    const col1X = 40;
    const col2X = 250;
    const lineHeight = 16;

    // Left column
    doc.text(`Already Memorized: ${analytics.paraProgress.alreadyMemorized} paras`,
      col1X, detailsY)
      .text(`Completed in Training: ${analytics.paraProgress.completedDuringTraining} paras`,
        col1X, detailsY + lineHeight)
      .text(`Total Memorized: ${analytics.paraProgress.totalMemorized}/30 paras`,
        col1X, detailsY + (lineHeight * 2))
      .text(`Remaining Paras: ${analytics.paraProgress.remainingParas}`,
        col1X, detailsY + (lineHeight * 3));

    // Right column
    doc.text(`Current Para: ${analytics.paraProgress.currentPara}`,
      col2X, detailsY)
      .text(`Progress: ${analytics.paraProgress.currentParaProgress}%`,
        col2X, detailsY + lineHeight)
      .text(`Overall Completion: ${analytics.paraProgress.overallCompletionPercentage}%`,
        col2X, detailsY + (lineHeight * 2));

    doc.y = detailsY + (lineHeight * 4) + 10;

    // Progress bar
    const barWidth = 400;
    const barHeight = 20;
    const barX = 40;
    const barY = doc.y;
    const progressPercent = analytics.paraProgress.overallCompletionPercentage;
    const progressWidth = (progressPercent / 100) * barWidth;

    // Background
    doc.rect(barX, barY, barWidth, barHeight)
      .fillColor('#e2e8f0')
      .fill();

    // Progress fill
    let progressColor;
    if (progressPercent >= 75) {
      progressColor = '#48bb78';
    } else if (progressPercent >= 50) {
      progressColor = '#ed8936';
    } else if (progressPercent >= 25) {
      progressColor = '#4299e1';
    } else {
      progressColor = '#e53e3e';
    }

    if (progressWidth > 0) {
      doc.rect(barX, barY, progressWidth, barHeight)
        .fillColor(progressColor)
        .fill();
    }

    // Border
    doc.rect(barX, barY, barWidth, barHeight)
      .strokeColor('#a0aec0')
      .stroke();

    // Percentage text
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text(`${progressPercent}%`,
        barX + barWidth + 10, barY + 2);

    doc.y = barY + barHeight + 25;

    // Para indicators title
    doc.fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#4a5568')
      .text('Para Status:', 40, doc.y);

    doc.y += 15;

    // FIXED: Para indicators with proper alignment
    const parasPerRow = 15;
    const paraBoxSize = 16;
    const paraGap = 4;
    const startX = 40;
    const startY = doc.y;

    for (let i = 0; i < 30; i++) {
      const row = Math.floor(i / parasPerRow);
      const col = i % parasPerRow;
      const x = startX + col * (paraBoxSize + paraGap);
      const y = startY + row * (paraBoxSize + paraGap + 2);

      const paraNum = i + 1;
      let boxColor = '#cbd5e0'; // Default: Not started

      if (analytics.paraProgress.uniqueAlreadyMemorized.includes(paraNum)) {
        boxColor = '#4299e1'; // Blue: Already memorized
      } else if (analytics.paraProgress.uniqueCompleted.includes(paraNum)) {
        boxColor = '#48bb78'; // Green: Completed in training
      } else if (paraNum === analytics.paraProgress.currentPara) {
        boxColor = '#ed8936'; // Orange: Current para
      }

      // Fill box
      doc.rect(x, y, paraBoxSize, paraBoxSize)
        .fillColor(boxColor)
        .fill();

      // Box border
      doc.rect(x, y, paraBoxSize, paraBoxSize)
        .strokeColor('#a0aec0')
        .lineWidth(0.5)
        .stroke();

      // Para number - centered
      const numStr = paraNum.toString();
      const numWidth = doc.widthOfString(numStr, { font: 'Helvetica-Bold', size: 7 });
      const textX = x + (paraBoxSize - numWidth) / 2;
      const textY = y + (paraBoxSize - 7) / 2;

      doc.fontSize(7)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(numStr, textX, textY);
    }

    doc.y = startY + (2 * (paraBoxSize + paraGap + 2)) + 15;
  }

  // Add performance analysis - FIXED
  addPerformanceAnalysis(doc, analytics) {
    // Check for page break
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 40;
    }

    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Performance Analysis', 40, doc.y);

    doc.moveDown(0.3);

    // Condition breakdown
    const conditions = [
      {
        label: 'Excellent',
        count: analytics.performance.conditionBreakdown.excellent,
        color: '#48bb78',
        icon: '✓'
      },
      {
        label: 'Good',
        count: analytics.performance.conditionBreakdown.good,
        color: '#4299e1',
        icon: '✓'
      },
      {
        label: 'Medium',
        count: analytics.performance.conditionBreakdown.medium,
        color: '#ed8936',
        icon: '●'
      },
      {
        label: 'Below Average',
        count: analytics.performance.conditionBreakdown.belowAverage,
        color: '#e53e3e',
        icon: '⚠'
      },
      {
        label: 'N/A',
        count: analytics.performance.conditionBreakdown.na,
        color: '#a0aec0',
        icon: '-'
      }
    ];

    const totalConditions = conditions.reduce((sum, c) => sum + c.count, 0);
    const startY = doc.y;
    const lineHeight = 18;

    conditions.forEach((condition, index) => {
      const y = startY + (index * lineHeight);
      const percentage = totalConditions > 0 ?
        ((condition.count / totalConditions) * 100).toFixed(1) : 0;

      // Condition icon
      doc.fontSize(10)
        .fillColor(condition.color)
        .text(condition.icon, 40, y);

      // Condition label and count
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text(`${condition.label}:`, 55, y, { continued: true });

      doc.font('Helvetica-Bold')
        .fillColor(condition.color)
        .text(` ${condition.count} days (${percentage}%)`);
    });

    doc.y = startY + (conditions.length * lineHeight) + 15;

    // Performance trend
    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#4a5568')
      .text('Performance Trend:', 40, doc.y, { continued: true });

    const trendColor = analytics.performance.performanceTrend === 'Improving' ? '#48bb78' :
      analytics.performance.performanceTrend === 'Declining' ? '#e53e3e' : '#ed8936';

    doc.font('Helvetica-Bold')
      .fillColor(trendColor)
      .text(` ${analytics.performance.trendIcon} ${analytics.performance.performanceTrend}`);

    doc.font('Helvetica')
      .fillColor('#4a5568')
      .text(`  Last 7 days average: ${analytics.performance.last7DaysAvg} new lines/day`,
        150, doc.y);

    doc.y += 20;
  }

  // Add attendance analysis - FIXED
  addAttendanceAnalysis(doc, analytics) {
    // Check for page break
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 40;
    }

    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Attendance Analysis', 40, doc.y);

    doc.moveDown(0.3);

    // Attendance statistics
    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#4a5568');

    const statsY = doc.y;
    const lineHeight = 16;

    doc.text(`Total Days in Period: ${analytics.period.totalDays}`, 40, statsY)
      .text(`Present Days: ${analytics.period.presentDays}`, 40, statsY + lineHeight)
      .text(`Absent Days: ${analytics.period.totalDays - analytics.period.presentDays}`,
        40, statsY + (lineHeight * 2))
      .text(`Attendance Rate: ${analytics.period.attendanceRate}%`, 40, statsY + (lineHeight * 3));

    // Simple attendance chart
    const chartWidth = 200;
    const chartHeight = 20;
    const chartX = 300;
    const chartY = statsY + 10;

    // Background
    doc.rect(chartX, chartY, chartWidth, chartHeight)
      .fillColor('#e2e8f0')
      .fill();

    // Attendance bar
    const attendanceWidth = Math.max(5, (analytics.period.attendanceRate / 100) * chartWidth);
    const attendanceColor = analytics.period.attendanceRate >= 80 ? '#48bb78' :
      analytics.period.attendanceRate >= 60 ? '#ed8936' : '#e53e3e';

    if (attendanceWidth > 0) {
      doc.rect(chartX, chartY, attendanceWidth, chartHeight)
        .fillColor(attendanceColor)
        .fill();
    }

    // Chart border
    doc.rect(chartX, chartY, chartWidth, chartHeight)
      .strokeColor('#a0aec0')
      .lineWidth(0.5)
      .stroke();

    // Chart labels
    doc.fontSize(8)
      .font('Helvetica')
      .fillColor('#4a5568')
      .text('0%', chartX - 12, chartY + 5)
      .text('100%', chartX + chartWidth + 3, chartY + 5);

    doc.y = statsY + (lineHeight * 4) + 20;
  }

  // Add progress charts 
  addProgressCharts(doc, analytics) {
    // Check for page break
    if (doc.y > 600) {
      doc.addPage();
      doc.y = 40;
    }

    if (analytics.performance.dailyStats.length === 0) return;

    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Daily Progress Trends', 40, doc.y);

    doc.moveDown(0.5);

    // Show last 10 days data
    const last10Days = analytics.performance.dailyStats.slice(0, 10).reverse();

    if (last10Days.length === 0) {
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#718096')
        .text('No daily data available for the selected period', 40, doc.y);
      doc.y += 20;
      return;
    }

    // FIXED: Table with proper column widths
    const tableStartY = doc.y;
    const tableX = 40;
    const tableWidth = 515;
    const rowHeight = 22;

    // Column definitions with proper widths
    const columns = [
      { header: 'Date', width: 70, align: 'left' },
      { header: 'New Lines', width: 75, align: 'center' },
      { header: 'Review', width: 75, align: 'center' },
      { header: 'Mistakes', width: 75, align: 'center' },
      { header: 'Condition', width: 100, align: 'left' }
    ];

    // Calculate column positions
    let xPos = tableX;
    columns.forEach(col => {
      col.x = xPos;
      xPos += col.width;
    });

    // Draw table header
    doc.rect(tableX, tableStartY, tableWidth, rowHeight)
      .fillColor('#2c5282')
      .fill();

    doc.fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#ffffff');

    columns.forEach(col => {
      const textX = col.align === 'center' ?
        col.x + (col.width / 2) - (doc.widthOfString(col.header) / 2) :
        col.x + 10;
      doc.text(col.header, textX, tableStartY + 7);
    });

    // Draw table rows
    last10Days.forEach((day, index) => {
      const rowY = tableStartY + rowHeight + (index * rowHeight);

      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(tableX, rowY, tableWidth, rowHeight)
          .fillColor('#f7fafc')
          .fill();
      }

      // Draw cell borders
      let cellX = tableX;
      columns.forEach(col => {
        doc.rect(cellX, rowY, col.width, rowHeight)
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .stroke();
        cellX += col.width;
      });

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#4a5568');

      // Date
      doc.text(day.date, columns[0].x + 10, rowY + 6);

      // New lines (Sabaq) - centered with color
      const newLines = day.sabaqLines;
      const newLinesColor = newLines >= 15 ? '#48bb78' :
        newLines >= 10 ? '#4299e1' :
          newLines >= 5 ? '#ed8936' : '#e53e3e';
      const newLinesStr = newLines.toString();
      const newLinesX = columns[1].x + (columns[1].width / 2) - (doc.widthOfString(newLinesStr) / 2);
      doc.fillColor(newLinesColor)
        .text(newLinesStr, newLinesX, rowY + 6);

      // Review lines (Sabqi + Manzil) - centered
      const reviewLines = day.sabqiLines + day.manzilLines;
      const reviewStr = reviewLines.toString();
      const reviewX = columns[2].x + (columns[2].width / 2) - (doc.widthOfString(reviewStr) / 2);
      doc.fillColor('#4a5568')
        .text(reviewStr, reviewX, rowY + 6);

      // Mistakes - centered with color
      const mistakes = day.mistakes;
      const mistakeColor = mistakes === 0 ? '#48bb78' :
        mistakes <= 2 ? '#4299e1' :
          mistakes <= 5 ? '#ed8936' : '#e53e3e';
      const mistakesStr = mistakes.toString();
      const mistakesX = columns[3].x + (columns[3].width / 2) - (doc.widthOfString(mistakesStr) / 2);
      doc.fillColor(mistakeColor)
        .text(mistakesStr, mistakesX, rowY + 6);

      // Condition with color
      const condition = day.condition || 'N/A';
      const condColor = condition === 'Excellent' ? '#48bb78' :
        condition === 'Good' ? '#4299e1' :
          condition === 'Medium' ? '#ed8936' :
            condition === 'Below Average' ? '#e53e3e' : '#a0aec0';
      doc.fillColor(condColor)
        .text(condition, columns[4].x + 10, rowY + 6);
    });

    doc.y = tableStartY + rowHeight + (last10Days.length * rowHeight) + 20;
  }

  // Add milestones section - FIXED
  addMilestonesSection(doc, analytics) {
    // Check for page break
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 40;
    }

    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Achievements & Milestones', 40, doc.y);

    doc.moveDown(0.3);

    const achieved = analytics.milestones.all.filter(m => m.achieved);

    if (achieved.length === 0) {
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#718096')
        .text('No milestones achieved yet. Keep going!', 40, doc.y);
      doc.y += 15;
    } else {
      achieved.forEach((milestone, index) => {
        const y = doc.y + (index * 18);
        doc.fontSize(10)
          .font('Helvetica')
          .fillColor('#48bb78')
          .text('✓ ', 40, y, { continued: true });

        doc.font('Helvetica-Bold')
          .fillColor('#2d3748')
          .text(milestone.label);
      });

      doc.y += (achieved.length * 18) + 10;
    }

    // Next milestone
    if (analytics.milestones.nextMilestone) {
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text('Next Milestone:', 40, doc.y, { continued: true });

      doc.font('Helvetica-Bold')
        .fillColor('#4299e1')
        .text(` ${analytics.milestones.nextMilestone.label}`);

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#718096')
        .text(`  (${analytics.milestones.parasToNextMilestone} paras remaining, ${analytics.milestones.progressToNext}% progress)`,
          40, doc.y + 12);

      doc.y += 25;
    }
  }

  // Add projections section - FIXED
  addProjectionsSection(doc, analytics) {
    // Check for page break
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 40;
    }

    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Completion Projections', 40, doc.y);

    doc.moveDown(0.3);

    if (!analytics.projection.estimatedDaysToComplete) {
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#718096')
        .text('Not enough data for projections. Continue regular memorization.', 40, doc.y);
      doc.y += 30;
      return;
    }

    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#4a5568');

    const projY = doc.y;
    const lineHeight = 16;

    doc.text(`Estimated Time Remaining: ${analytics.projection.timeDescription}`,
      40, projY)
      .text(`Projected Completion Date: ${analytics.projection.estimatedCompletionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, 40, projY + lineHeight);

    // Daily pace required
    const remainingParas = analytics.paraProgress.remainingParas;
    const currentPace = analytics.lines.avgSabaqLinesPerDay;
    const requiredPace = (remainingParas * 20) / analytics.projection.estimatedDaysToComplete;

    doc.text(`Current Daily Pace: ${currentPace.toFixed(1)} new lines`,
      40, projY + (lineHeight * 2))
      .text(`Required Pace: ${requiredPace.toFixed(1)} new lines/day`,
        40, projY + (lineHeight * 3));

    // Pace comparison
    const paceDiff = requiredPace - currentPace;
    if (paceDiff > 0) {
      doc.fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#ed8936')
        .text(`Note: Need to increase daily memorization by ${paceDiff.toFixed(1)} lines to meet projection`,
          40, projY + (lineHeight * 4) + 5);
      doc.y = projY + (lineHeight * 4) + 25;
    } else {
      doc.fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#48bb78')
        .text(`Current pace is sufficient to meet projection`,
          40, projY + (lineHeight * 4) + 5);
      doc.y = projY + (lineHeight * 4) + 25;
    }
  }

  // Add alerts section - FIXED
  addAlertsSection(doc, analytics) {
    // Check for page break
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 40;
    }

    if (analytics.alerts.length === 0) {
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#2d3748')
        .text('Status: All Good ✓', 40, doc.y);

      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#48bb78')
        .text('No critical issues detected. Keep up the good work!', 40, doc.y + 20);

      doc.y += 50;
      return;
    }

    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Alerts & Recommendations', 40, doc.y);

    doc.moveDown(0.3);

    // Sort alerts by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    const sortedAlerts = [...analytics.alerts].sort((a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity]
    );

    sortedAlerts.forEach((alert, index) => {
      // Check for page break
      if (doc.y > 650 && index > 0) {
        doc.addPage();
        doc.y = 40;
      }

      const y = doc.y;

      // Alert box
      const boxColor = alert.severity === 'critical' ? '#fed7d7' :
        alert.severity === 'warning' ? '#feebc8' : '#e6fffa';
      const borderColor = alert.severity === 'critical' ? '#fc8181' :
        alert.severity === 'warning' ? '#ed8936' : '#38b2ac';
      const textColor = alert.severity === 'critical' ? '#c53030' :
        alert.severity === 'warning' ? '#dd6b20' : '#234e52';

      // Calculate text height
      const messageLines = doc.heightOfString(alert.message, { width: 480 });
      const recLines = doc.heightOfString(alert.recommendation, { width: 480 });
      const boxHeight = Math.max(40, messageLines + recLines + 25);

      doc.rect(40, y, 515, boxHeight)
        .fillColor(boxColor)
        .fill();

      doc.rect(40, y, 515, boxHeight)
        .strokeColor(borderColor)
        .stroke();

      // Alert icon
      const icon = alert.severity === 'critical' ? '⚠' :
        alert.severity === 'warning' ? '⚠' : 'ℹ';

      doc.fontSize(12)
        .text(icon, 45, y + 12);

      // Alert message
      doc.fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(textColor)
        .text(alert.message, 65, y + 10);

      // Recommendation
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text(alert.recommendation, 65, y + 25, { width: 480 });

      doc.y += boxHeight + 10;
    });

    doc.y += 10;
  }

  // Add progress table - FIXED
  addProgressTable(doc, progressRecords) {
    if (!progressRecords || progressRecords.length === 0) {
      return;
    }

    // Check if we need a new page
    if (doc.y > 600) {
      doc.addPage();
      doc.y = 40;
    }

    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Detailed Progress Records', 40, doc.y);

    doc.moveDown(0.5);

    const tableStartY = doc.y;
    const tableX = 40;
    const tableWidth = 515;
    const rowHeight = 20;

    // Updated Column definitions to match StudentMonthlyReport
    // Date, Day, Sabaq, Sabaq Lines, Sabaq Mistakes, Sabqi, Sabqi Mistakes, Manzil, Manzil Mistakes, Condition
    const columns = [
      { header: 'Date', width: 55, align: 'left' },
      { header: 'Day', width: 25, align: 'left' },
      { header: 'Sabaq', width: 85, align: 'left' },
      { header: 'Lines', width: 30, align: 'center' },
      { header: 'Mist', width: 30, align: 'center' },
      { header: 'Sabqi', width: 85, align: 'left' },
      { header: 'Mist', width: 30, align: 'center' },
      { header: 'Manzil', width: 85, align: 'left' },
      { header: 'Mist', width: 30, align: 'center' },
      { header: 'Condition', width: 60, align: 'left' }
    ];

    // Calculate column positions
    let xPos = tableX;
    columns.forEach(col => {
      col.x = xPos;
      xPos += col.width;
    });

    // Function to draw table header
    const drawTableHeader = (yPos) => {
      // Header background
      doc.rect(tableX, yPos, tableWidth, rowHeight)
        .fillColor('#2c5282')
        .fill();

      // Header text
      doc.fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#ffffff');

      columns.forEach(col => {
        let textX;
        if (col.align === 'center') {
          const textWidth = doc.widthOfString(col.header);
          textX = col.x + (col.width / 2) - (textWidth / 2);
        } else {
          textX = col.x + 2;
        }
        doc.text(col.header, textX, yPos + 6);
      });

      // Draw vertical lines for header
      columns.forEach(col => {
        doc.moveTo(col.x, yPos)
          .lineTo(col.x, yPos + rowHeight)
          .strokeColor('#1a365d')
          .lineWidth(0.5)
          .stroke();
      });

      // Right border
      doc.moveTo(tableX + tableWidth, yPos)
        .lineTo(tableX + tableWidth, yPos + rowHeight)
        .strokeColor('#1a365d')
        .lineWidth(0.5)
        .stroke();
    };

    // Draw initial header
    drawTableHeader(tableStartY);

    let currentY = tableStartY + rowHeight;

    // Table rows (show last 31 records to match monthly view if possible, or all)
    // The previous code sliced 15, but for a monthly report we usually want all relevant records.
    // Let's stick to showing all records in the provided list (which is already filtered by date range).
    const displayRecords = progressRecords;

    displayRecords.forEach((report, index) => {
      // Check for page break
      if (currentY > 720) {
        doc.addPage();
        currentY = 40;
        drawTableHeader(currentY);
        currentY += rowHeight;
      }

      // Alternate row colors
      const isAbsent = report.attendance !== 'PRESENT' && report.attendance !== 'Present';
      const bgColor = isAbsent ? '#fff5f5' : (index % 2 === 0 ? '#ffffff' : '#f7fafc');

      doc.rect(tableX, currentY, tableWidth, rowHeight)
        .fillColor(bgColor)
        .fill();

      // Draw vertical lines for cells
      columns.forEach(col => {
        doc.moveTo(col.x, currentY)
          .lineTo(col.x, currentY + rowHeight)
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .stroke();
      });

      // Right border
      doc.moveTo(tableX + tableWidth, currentY)
        .lineTo(tableX + tableWidth, currentY + rowHeight)
        .strokeColor('#e2e8f0')
        .lineWidth(0.5)
        .stroke();

      // Horizontal line
      doc.moveTo(tableX, currentY + rowHeight)
        .lineTo(tableX + tableWidth, currentY + rowHeight)
        .strokeColor('#e2e8f0')
        .lineWidth(0.5)
        .stroke();

      doc.fontSize(8)
        .font('Helvetica');

      // Date
      const dateStr = moment(report.date).format('DD/MM/YY');
      doc.fillColor('#4a5568').text(dateStr, columns[0].x + 2, currentY + 6);

      // Day
      const dayStr = moment(report.date).format('ddd');
      doc.fillColor('#718096').text(dayStr, columns[1].x + 2, currentY + 6);

      if (isAbsent) {
        doc.fillColor('#e53e3e').font('Helvetica-Bold').text('ABSENT', columns[2].x + 2, currentY + 6);
      } else {
        // Sabaq
        const sabaqText = report.sabaq || '-';
        doc.fillColor('#2d3748').text(sabaqText, columns[2].x + 2, currentY + 6, { width: columns[2].width - 4, lineBreak: false, ellipsis: true });

        // Sabaq Lines
        const sabaqLines = parseInt(report.sabaqLines) || 0;
        const sabaqLinesStr = sabaqLines > 0 ? sabaqLines.toString() : '-';
        const sabaqLinesX = columns[3].x + (columns[3].width / 2) - (doc.widthOfString(sabaqLinesStr) / 2);
        doc.text(sabaqLinesStr, sabaqLinesX, currentY + 6);

        // Sabaq Mistakes
        const sMistakes = parseInt(report.sabaqMistakes) || 0;
        const sMistakesStr = sMistakes > 0 ? sMistakes.toString() : '-';
        const sMistakesX = columns[4].x + (columns[4].width / 2) - (doc.widthOfString(sMistakesStr) / 2);
        const sMistakesColor = sMistakes > 0 ? '#e53e3e' : '#cbd5e0';
        doc.fillColor(sMistakesColor).font(sMistakes > 0 ? 'Helvetica-Bold' : 'Helvetica').text(sMistakesStr, sMistakesX, currentY + 6);

        // Sabqi
        doc.font('Helvetica');
        const sabqiText = report.sabqi || '-';
        doc.fillColor('#2d3748').text(sabqiText, columns[5].x + 2, currentY + 6, { width: columns[5].width - 4, lineBreak: false, ellipsis: true });

        // Sabqi Mistakes
        const sabMistakes = parseInt(report.sabqiMistakes) || 0;
        const sabMistakesStr = sabMistakes > 0 ? sabMistakes.toString() : '-';
        const sabMistakesX = columns[6].x + (columns[6].width / 2) - (doc.widthOfString(sabMistakesStr) / 2);
        const sabMistakesColor = sabMistakes > 0 ? '#e53e3e' : '#cbd5e0';
        doc.fillColor(sabMistakesColor).font(sabMistakes > 0 ? 'Helvetica-Bold' : 'Helvetica').text(sabMistakesStr, sabMistakesX, currentY + 6);

        // Manzil
        doc.font('Helvetica');
        const manzilText = report.manzil || '-';
        doc.fillColor('#2d3748').text(manzilText, columns[7].x + 2, currentY + 6, { width: columns[7].width - 4, lineBreak: false, ellipsis: true });

        // Manzil Mistakes
        const mMistakes = parseInt(report.manzilMistakes) || 0;
        const mMistakesStr = mMistakes > 0 ? mMistakes.toString() : '-';
        const mMistakesX = columns[8].x + (columns[8].width / 2) - (doc.widthOfString(mMistakesStr) / 2);
        const mMistakesColor = mMistakes > 0 ? '#e53e3e' : '#cbd5e0';
        doc.fillColor(mMistakesColor).font(mMistakes > 0 ? 'Helvetica-Bold' : 'Helvetica').text(mMistakesStr, mMistakesX, currentY + 6);

        // Condition
        doc.font('Helvetica-Bold');
        const condition = report.condition || 'N/A';
        const condColor = condition === 'Excellent' ? '#48bb78' :
          condition === 'Good' ? '#4299e1' :
            condition === 'Medium' ? '#ed8936' :
              condition === 'Below Average' ? '#e53e3e' : '#a0aec0';
        doc.fillColor(condColor).text(condition, columns[9].x + 2, currentY + 6);
      }

      currentY += rowHeight;
    });

    doc.y = currentY + 10;
  }

  // Add footer - FIXED
  addFooter(doc, student) {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 50;

    // Footer separator
    doc.moveTo(40, footerY - 10)
      .lineTo(555, footerY - 10)
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();

    doc.fontSize(8)
      .font('Helvetica-Oblique')
      .fillColor('#718096')
      .text('Generated by Khanqah Saifia Hifz Management System',
        0, footerY, { align: 'center' })
      .text(`Report for: ${student.user.name} | Admission No: ${student.admissionNo}`,
        0, footerY + 12, { align: 'center' })
      .text(`Page ${doc.page.number}`, 40, footerY, { align: 'right' });
  }

  // Generate summary report for multiple students
  async generateBatchReport(req, res) {
    try {
      const { studentIds, startDate, endDate, reportType = 'summary' } = req.body;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Student IDs array is required'
        });
      }

      // Fetch all students
      const students = await prisma.student.findMany({
        where: {
          id: { in: studentIds }
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          hifzStatus: true,
          currentEnrollment: {
            include: {
              classRoom: {
                include: {
                  teacher: {
                    include: {
                      user: {
                        select: { name: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Generate combined PDF
      const pdfBuffer = await this.createBatchPDF(students, {
        startDate,
        endDate,
        reportType
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="batch-hifz-report-${Date.now()}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      console.error('Batch report generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate batch report'
      });
    }
  }

  // Create batch PDF for multiple students
  async createBatchPDF(students, options) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 40,
          size: 'A4',
          font: 'Helvetica'
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Add header
        this.addBatchHeader(doc, options);

        // Add student summaries
        students.forEach((student, index) => {
          if (index > 0) {
            doc.addPage();
          }
          this.addStudentSummary(doc, student, options);
        });

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  // Add batch header
  addBatchHeader(doc, options) {
    doc.fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#1a365d')
      .text('KHANQAH SAIFIA', 0, 40, { align: 'center' });

    doc.fontSize(16)
      .font('Helvetica')
      .fillColor('#4a5568')
      .text('Batch Hifz Progress Report', 0, 70, { align: 'center' });

    if (options.startDate && options.endDate) {
      doc.fontSize(12)
        .text(`${moment(options.startDate).format('DD MMM YYYY')} - ${moment(options.endDate).format('DD MMM YYYY')}`,
          0, 95, { align: 'center' });
    }

    doc.fontSize(10)
      .text(`Generated: ${new Date().toLocaleDateString()}`, 0, 115, { align: 'center' });

    doc.moveDown(2);
  }

  // Add student summary for batch report
  addStudentSummary(doc, student, options) {
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text(student.user.name, 40, doc.y);

    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#4a5568')
      .text(`Admission No: ${student.admissionNo} | Class: ${student.currentEnrollment?.classRoom?.name || 'N/A'}`,
        40, doc.y + 20);

    if (student.hifzStatus) {
      const status = student.hifzStatus;
      doc.text(`Current Para: ${status.currentPara || 1} | Progress: ${status.currentParaProgress || 0}% | Memorized: ${status.completedParas?.length || 0} paras`,
        40, doc.y + 35);
    }

    doc.moveDown(2);
  }

  // Save PDF to file system
  async savePDFToFile(studentId, options = {}) {
    try {
      const {
        days = 30,
        startDate,
        endDate,
        type = 'comprehensive',
        fileName = null
      } = options;

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { name: true } },
          hifzStatus: true
        }
      });

      if (!student) {
        throw new Error('Student not found');
      }

      // Calculate date range
      let dateFilter = {};
      let periodText = '';

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        dateFilter = {
          date: {
            gte: start,
            lte: end
          }
        };
        periodText = `${moment(start).format('DD MMM YYYY')} - ${moment(end).format('DD MMM YYYY')}`;
      } else {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - parseInt(days));
        dateFilter = {
          date: {
            gte: start,
            lte: end
          }
        };
        periodText = `Last ${days} days`;
      }

      // Fetch progress records
      const progressRecords = await prisma.hifzProgress.findMany({
        where: {
          studentId,
          ...dateFilter
        },
        orderBy: { date: 'desc' },
        include: {
          teacher: {
            include: {
              user: {
                select: { name: true }
              }
            }
          }
        }
      });

      const studentWithProgress = {
        ...student,
        hifzProgress: progressRecords
      };

      const analytics = await this.calculateAnalytics(studentWithProgress, dateFilter);
      const pdfBuffer = await this.createPDF(student, analytics, {
        type,
        periodText,
        dateFilter
      });

      // Save to file system
      const reportsDir = path.join(__dirname, '../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const finalFileName = fileName || `hifz-report-${student.admissionNo}-${Date.now()}.pdf`;
      const filePath = path.join(reportsDir, finalFileName);
      fs.writeFileSync(filePath, pdfBuffer);

      return {
        success: true,
        filePath,
        fileName: finalFileName,
        studentName: student.user.name,
        period: periodText
      };

    } catch (error) {
      console.error('Save PDF error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new HifzPDFController();