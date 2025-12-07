const PDFDocument = require('pdfkit');
const prisma = require('../db/prismaClient');
const fs = require('fs');
const path = require('path');

class HifzReportController {
  // Constants for calculations
  static LINES_PER_PAGE = 15; // Average lines per Quran page
  static PAGES_PER_PARA = 20;  // Average pages per Para
  static TOTAL_PARAS = 30;
  static MISTAKE_THRESHOLD = 3; // Alert if mistakes exceed this
  static LOW_PROGRESS_THRESHOLD = 5; // Alert if daily average below this

  // Generate Hifz progress report for a student
  async generateHifzReport(req, res) {
    try {
      const { studentId, startDate, endDate } = req.query;

      if (!studentId) {
        return res.status(400).json({ error: 'Student ID is required' });
      }

      // Get student details
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
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (!student.currentEnrollment) {
        return res.status(400).json({ error: 'Student is not enrolled in any class' });
      }

      // Build date filter
      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.date = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      // Get Hifz progress records
      const progressRecords = await prisma.hifzProgress.findMany({
        where: {
          studentId,
          ...dateFilter
        },
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
        orderBy: { date: 'asc' }
      });

      if (progressRecords.length === 0) {
        return res.status(404).json({ error: 'No progress records found for the specified period' });
      }

      // Calculate projections and analytics
      const analytics = this.calculateAnalytics(progressRecords);

      // Check for alerts and notify if needed
      await this.checkAndNotifyAlerts(student, progressRecords, analytics);

      // Generate PDF
      const pdfBuffer = await this.generatePDF(student, progressRecords, analytics, startDate, endDate);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="hifz-report-${student.admissionNo}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      console.error('Generate Hifz report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Calculate comprehensive analytics
  calculateAnalytics(progressRecords) {
    const totalDays = progressRecords.length;
    const totalSabaqLines = progressRecords.reduce((sum, record) => sum + record.sabaqLines, 0);
    const totalSabqiLines = progressRecords.reduce((sum, record) => sum + record.sabqiLines, 0);
    const totalMistakes = progressRecords.reduce((sum, record) => sum + record.mistakes, 0);
    const totalLines = totalSabaqLines + totalSabqiLines;

    // Get latest record for current status
    const latestProgress = progressRecords[progressRecords.length - 1];
    const currentPara = latestProgress.currentPara || 1;
    const completedParas = latestProgress.completedParas || [];
    const paraProgress = latestProgress.paraProgress || 0;

    // Calculate averages
    const avgLinesPerDay = totalDays > 0 ? totalSabaqLines / totalDays : 0;
    const avgMistakesPerDay = totalDays > 0 ? totalMistakes / totalDays : 0;
    const mistakeRate = totalLines > 0 ? (totalMistakes / totalLines) * 100 : 0;

    // Calculate completion estimates
    const totalLinesPerPara = HifzReportController.LINES_PER_PAGE * HifzReportController.PAGES_PER_PARA;
    const remainingParas = HifzReportController.TOTAL_PARAS - completedParas.length;
    const currentParaRemainingLines = (totalLinesPerPara * (100 - paraProgress)) / 100;
    const totalRemainingLines = currentParaRemainingLines + ((remainingParas - 1) * totalLinesPerPara);

    // Estimate days to completion (based on Sabaq lines only)
    const estimatedDaysToComplete = avgLinesPerDay > 0 ? Math.ceil(totalRemainingLines / avgLinesPerDay) : 0;
    const estimatedCompletionDate = avgLinesPerDay > 0 
      ? new Date(Date.now() + (estimatedDaysToComplete * 24 * 60 * 60 * 1000))
      : null;

    // Performance trends (last 7 days vs overall)
    const last7Days = progressRecords.slice(-7);
    const last7DaysAvg = last7Days.length > 0 
      ? last7Days.reduce((sum, r) => sum + r.sabaqLines, 0) / last7Days.length 
      : 0;
    const performanceTrend = last7DaysAvg > avgLinesPerDay ? 'Improving' : 
                            last7DaysAvg < avgLinesPerDay ? 'Declining' : 'Stable';

    // Identify high mistake days
    const highMistakeDays = progressRecords.filter(r => 
      r.mistakes > HifzReportController.MISTAKE_THRESHOLD
    ).length;

    // Calculate consistency score (days with progress / total days in range)
    const dateRange = progressRecords.length > 0 
      ? Math.ceil((new Date(progressRecords[progressRecords.length - 1].date) - 
                   new Date(progressRecords[0].date)) / (1000 * 60 * 60 * 24)) + 1
      : 0;
    const consistencyScore = dateRange > 0 ? (totalDays / dateRange) * 100 : 0;

    return {
      totalDays,
      totalSabaqLines,
      totalSabqiLines,
      totalMistakes,
      totalLines,
      currentPara,
      completedParas: completedParas.length,
      completedParasList: completedParas,
      paraProgress: paraProgress.toFixed(1),
      avgLinesPerDay: avgLinesPerDay.toFixed(1),
      avgMistakesPerDay: avgMistakesPerDay.toFixed(1),
      mistakeRate: mistakeRate.toFixed(1),
      remainingParas,
      totalRemainingLines,
      estimatedDaysToComplete,
      estimatedCompletionDate,
      performanceTrend,
      highMistakeDays,
      consistencyScore: consistencyScore.toFixed(1),
      last7DaysAvg: last7DaysAvg.toFixed(1)
    };
  }

  // Check for alerts and notify admin and student
  async checkAndNotifyAlerts(student, progressRecords, analytics) {
    const alerts = [];

    // Check for high mistakes
    if (parseFloat(analytics.avgMistakesPerDay) > HifzReportController.MISTAKE_THRESHOLD) {
      alerts.push({
        type: 'HIGH_MISTAKES',
        severity: 'warning',
        message: `Student averaging ${analytics.avgMistakesPerDay} mistakes per day (threshold: ${HifzReportController.MISTAKE_THRESHOLD})`
      });
    }

    // Check for low progress
    if (parseFloat(analytics.avgLinesPerDay) < HifzReportController.LOW_PROGRESS_THRESHOLD) {
      alerts.push({
        type: 'LOW_PROGRESS',
        severity: 'warning',
        message: `Student memorizing only ${analytics.avgLinesPerDay} lines per day (threshold: ${HifzReportController.LOW_PROGRESS_THRESHOLD})`
      });
    }

    // Check for declining performance
    if (analytics.performanceTrend === 'Declining') {
      alerts.push({
        type: 'DECLINING_PERFORMANCE',
        severity: 'info',
        message: `Performance declining: Last 7 days avg (${analytics.last7DaysAvg}) < Overall avg (${analytics.avgLinesPerDay})`
      });
    }

    // Check for low consistency
    if (parseFloat(analytics.consistencyScore) < 70) {
      alerts.push({
        type: 'LOW_CONSISTENCY',
        severity: 'warning',
        message: `Low consistency: ${analytics.consistencyScore}% attendance (should be >70%)`
      });
    }

    // Check for recent high mistake streak (3+ consecutive days)
    const recentRecords = progressRecords.slice(-3);
    const consecutiveHighMistakes = recentRecords.every(r => 
      r.mistakes > HifzReportController.MISTAKE_THRESHOLD
    );
    if (consecutiveHighMistakes && recentRecords.length === 3) {
      alerts.push({
        type: 'CONSECUTIVE_HIGH_MISTAKES',
        severity: 'critical',
        message: `Critical: 3 consecutive days with high mistakes (>${HifzReportController.MISTAKE_THRESHOLD})`
      });
    }

    // If there are alerts, create notifications
    if (alerts.length > 0) {
      await this.createNotifications(student, alerts);
    }

    return alerts;
  }

  // Create notifications for alerts
  async createNotifications(student, alerts) {
    try {
      // Get admin users
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' }
      });

      // Create notifications for each alert
      for (const alert of alerts) {
        // Notification for student
        await prisma.notification.create({
          data: {
            userId: student.userId,
            type: alert.type,
            title: 'Hifz Progress Alert',
            message: alert.message,
            severity: alert.severity,
            read: false
          }
        }).catch(err => console.error('Student notification error:', err));

        // Notifications for admins
        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: alert.type,
              title: `Hifz Alert: ${student.user.name}`,
              message: `${student.user.name} (${student.admissionNo}): ${alert.message}`,
              severity: alert.severity,
              read: false,
              metadata: JSON.stringify({
                studentId: student.id,
                studentName: student.user.name,
                admissionNo: student.admissionNo
              })
            }
          }).catch(err => console.error('Admin notification error:', err));
        }
      }

      // Also notify class teacher
      if (student.currentEnrollment?.classRoom?.teacherId) {
        const teacher = await prisma.teacher.findUnique({
          where: { id: student.currentEnrollment.classRoom.teacherId },
          include: { user: true }
        });

        if (teacher) {
          for (const alert of alerts) {
            await prisma.notification.create({
              data: {
                userId: teacher.userId,
                type: alert.type,
                title: `Hifz Alert: ${student.user.name}`,
                message: `Your student ${student.user.name}: ${alert.message}`,
                severity: alert.severity,
                read: false
              }
            }).catch(err => console.error('Teacher notification error:', err));
          }
        }
      }
    } catch (error) {
      console.error('Create notifications error:', error);
    }
  }

  // Generate PDF document
  async generatePDF(student, progressRecords, analytics, startDate, endDate) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 50,
          size: 'A4'
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header Section
        this.addHeader(doc, student, startDate, endDate);

        // Summary Section
        this.addSummarySection(doc, analytics);

        // Completion Projection Section
        this.addProjectionSection(doc, analytics);

        // Performance Analysis Section
        this.addPerformanceAnalysis(doc, analytics);

        // Progress Table
        this.addProgressTable(doc, progressRecords);

        // Footer
        this.addFooter(doc);

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  // Add header to PDF
  addHeader(doc, student, startDate, endDate) {
    // Madrasa Name and Logo Area
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Khanqah Saifia', 50, 50, { align: 'center' });

    doc.fontSize(14)
       .font('Helvetica')
       .fillColor('#7f8c8d')
       .text('Hifz Program Progress Report', 50, 75, { align: 'center' });

    // Student Information
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Student Information:', 50, 120);

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#34495e')
       .text(`Name: ${student.user.name}`, 50, 140)
       .text(`Admission No: ${student.admissionNo}`, 50, 155)
       .text(`Roll No: ${student.currentEnrollment.rollNumber || 'N/A'}`, 50, 170);

    // Teacher Information
    const classTeacher = student.currentEnrollment.classRoom.teacher;
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Teacher Information:', 300, 120);

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#34495e')
       .text(`Name: ${classTeacher ? classTeacher.user.name : 'Not Assigned'}`, 300, 140)
       .text(`Class: ${student.currentEnrollment.classRoom.name}`, 300, 155);

    // Report Period
    const periodText = startDate && endDate 
      ? `Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
      : `Generated on: ${new Date().toLocaleDateString()}`;

    doc.fontSize(10)
       .font('Helvetica-Oblique')
       .fillColor('#7f8c8d')
       .text(periodText, 50, 190, { align: 'left' });

    // Separator line
    doc.moveTo(50, 210)
       .lineTo(545, 210)
       .strokeColor('#bdc3c7')
       .lineWidth(1)
       .stroke();

    doc.y = 230;
  }

  // Add summary section
  addSummarySection(doc, analytics) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Progress Summary', 50, doc.y);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#34495e');

    const startY = doc.y + 20;

    // First column - Basic Stats
    doc.text(`Total Days: ${analytics.totalDays}`, 50, startY)
       .text(`Total Sabaq Lines: ${analytics.totalSabaqLines}`, 50, startY + 15)
       .text(`Total Sabqi Lines: ${analytics.totalSabqiLines}`, 50, startY + 30)
       .text(`Total Mistakes: ${analytics.totalMistakes}`, 50, startY + 45);

    // Second column - Para Progress
    doc.text(`Current Para: ${analytics.currentPara}/30`, 200, startY)
       .text(`Completed Paras: ${analytics.completedParas}`, 200, startY + 15)
       .text(`Current Para Progress: ${analytics.paraProgress}%`, 200, startY + 30)
       .text(`Remaining Paras: ${analytics.remainingParas}`, 200, startY + 45);

    // Third column - Averages
    doc.text(`Avg Lines/Day: ${analytics.avgLinesPerDay}`, 350, startY)
       .text(`Avg Mistakes/Day: ${analytics.avgMistakesPerDay}`, 350, startY + 15)
       .text(`Mistake Rate: ${analytics.mistakeRate}%`, 350, startY + 30)
       .text(`Consistency: ${analytics.consistencyScore}%`, 350, startY + 45);

    doc.y = startY + 70;
  }

  // Add projection section
  addProjectionSection(doc, analytics) {
    // Add separator
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#ecf0f1')
       .lineWidth(1)
       .stroke();

    doc.y += 15;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Completion Projection', 50, doc.y);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#34495e');

    const startY = doc.y + 20;

    // Completion estimates
    doc.text(`Remaining Lines: ${analytics.totalRemainingLines}`, 50, startY)
       .text(`Estimated Days to Complete: ${analytics.estimatedDaysToComplete || 'N/A'}`, 50, startY + 15);

    if (analytics.estimatedCompletionDate) {
      doc.text(`Projected Completion Date: ${analytics.estimatedCompletionDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, 50, startY + 30);
    }

    // Visual progress bar for overall completion
    const completionPercentage = (analytics.completedParas / HifzReportController.TOTAL_PARAS) * 100;
    
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .text('Overall Completion:', 50, startY + 50);

    // Progress bar background
    doc.rect(50, startY + 65, 300, 15)
       .fillColor('#ecf0f1')
       .fill();

    // Progress bar fill
    const progressWidth = (completionPercentage / 100) * 300;
    doc.rect(50, startY + 65, progressWidth, 15)
       .fillColor('#27ae60')
       .fill();

    // Percentage text
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#2c3e50')
       .text(`${completionPercentage.toFixed(1)}%`, 355, startY + 68);

    doc.y = startY + 95;
  }

  // Add performance analysis section
  addPerformanceAnalysis(doc, analytics) {
    // Add separator
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#ecf0f1')
       .lineWidth(1)
       .stroke();

    doc.y += 15;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Performance Analysis', 50, doc.y);

    doc.fontSize(9)
       .font('Helvetica');

    const startY = doc.y + 20;

    // Performance trend with color coding
    const trendColor = analytics.performanceTrend === 'Improving' ? '#27ae60' :
                      analytics.performanceTrend === 'Declining' ? '#e74c3c' : '#f39c12';
    
    doc.fillColor('#34495e')
       .text('Performance Trend: ', 50, startY, { continued: true })
       .fillColor(trendColor)
       .font('Helvetica-Bold')
       .text(analytics.performanceTrend);

    doc.font('Helvetica')
       .fillColor('#34495e')
       .text(`Last 7 Days Average: ${analytics.last7DaysAvg} lines/day`, 50, startY + 15)
       .text(`High Mistake Days: ${analytics.highMistakeDays} days`, 50, startY + 30);

    // Performance rating
    let rating = 'Excellent';
    let ratingColor = '#27ae60';
    
    if (parseFloat(analytics.avgLinesPerDay) < 5) {
      rating = 'Needs Improvement';
      ratingColor = '#e74c3c';
    } else if (parseFloat(analytics.avgLinesPerDay) < 10) {
      rating = 'Good';
      ratingColor = '#f39c12';
    }

    doc.text('Overall Rating: ', 50, startY + 45, { continued: true })
       .fillColor(ratingColor)
       .font('Helvetica-Bold')
       .text(rating);

    doc.y = startY + 70;
  }

  // Add progress table
  addProgressTable(doc, progressRecords) {
    // Check if we need a new page
    if (doc.y > 600) {
      doc.addPage();
      doc.y = 50;
    }

    // Add separator
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#ecf0f1')
       .lineWidth(1)
       .stroke();

    doc.y += 15;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Daily Progress Records', 50, doc.y);

    doc.y += 20;

    // Table Header
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .rect(50, doc.y, 495, 20)
       .fill('#2c3e50');

    const headerY = doc.y + 5;
    doc.text('Date', 55, headerY)
       .text('Sabaq', 115, headerY)
       .text('Sabqi', 160, headerY)
       .text('Manzil', 205, headerY)
       .text('Mistakes', 265, headerY)
       .text('Para', 320, headerY)
       .text('Progress', 370, headerY)
       .text('Status', 445, headerY);

    doc.y += 25;

    // Table Rows
    let rowY = doc.y;
    const rowHeight = 18;
    const maxRowsPerPage = 25;
    let rowCount = 0;

    progressRecords.forEach((record, index) => {
      // Check if we need a new page
      if (rowCount >= maxRowsPerPage) {
        doc.addPage();
        this.addTableHeaderOnNewPage(doc);
        rowY = doc.y;
        rowCount = 0;
      }

      // Alternate row colors
      const fillColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      
      doc.rect(50, rowY, 495, rowHeight)
         .fillColor(fillColor)
         .fill();

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#2c3e50');

      // Date
      doc.text(new Date(record.date).toLocaleDateString(), 55, rowY + 5);

      // Sabaq Lines
      doc.text(record.sabaqLines.toString(), 120, rowY + 5, { width: 30, align: 'center' });

      // Sabqi Lines
      doc.text(record.sabqiLines.toString(), 165, rowY + 5, { width: 30, align: 'center' });

      // Manzil
      doc.text(record.manzilPara || '-', 210, rowY + 5, { width: 40, align: 'center' });

      // Mistakes with color coding
      const mistakeColor = record.mistakes > HifzReportController.MISTAKE_THRESHOLD ? '#e74c3c' : '#2c3e50';
      doc.fillColor(mistakeColor);
      const mistakeText = record.mistakes > HifzReportController.MISTAKE_THRESHOLD 
        ? `${record.mistakes} ⚠️` 
        : record.mistakes.toString();
      doc.text(mistakeText, 270, rowY + 5, { width: 40, align: 'center' });

      // Current Para
      doc.fillColor('#2c3e50');
      doc.text(record.currentPara ? `${record.currentPara}/30` : '-', 325, rowY + 5, { width: 35, align: 'center' });

      // Para Progress
      const progressText = record.paraProgress ? `${record.paraProgress.toFixed(0)}%` : '-';
      doc.text(progressText, 375, rowY + 5, { width: 55, align: 'center' });

      // Status/Condition
      const condition = this.determineCondition(record);
      const conditionColor = condition === 'Excellent' ? '#27ae60' :
                            condition.includes('Review') || condition.includes('Focus') ? '#e74c3c' : '#f39c12';
      doc.fillColor(conditionColor)
         .fontSize(7);
      doc.text(condition, 450, rowY + 5, { width: 85, align: 'center' });

      rowY += rowHeight;
      rowCount++;
      doc.y = rowY;
    });

    doc.y += 10;
  }

  // Add table header on new page
  addTableHeaderOnNewPage(doc) {
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .rect(50, 50, 495, 20)
       .fill('#2c3e50');

    doc.text('Date', 55, 55)
       .text('Sabaq', 115, 55)
       .text('Sabqi', 160, 55)
       .text('Manzil', 205, 55)
       .text('Mistakes', 265, 55)
       .text('Para', 320, 55)
       .text('Progress', 370, 55)
       .text('Status', 445, 55);

    doc.y = 80;
  }

  // Determine condition based on mistakes and progress
  determineCondition(record) {
    const totalLines = record.sabaqLines + record.sabqiLines;
    
    if (record.mistakes === 0 && totalLines > 0) {
      return 'Excellent';
    } else if (record.sabaqLines > 0 && record.mistakes > HifzReportController.MISTAKE_THRESHOLD) {
      return 'Review Sabaq';
    } else if (record.sabqiLines > 0 && record.mistakes > HifzReportController.MISTAKE_THRESHOLD) {
      return 'Focus Sabqi';
    } else if (record.manzilPara && record.mistakes > HifzReportController.MISTAKE_THRESHOLD) {
      return 'Focus Manzil';
    } else if (record.mistakes <= 2 && totalLines > 0) {
      return 'Good';
    } else if (totalLines === 0) {
      return 'No Progress';
    } else {
      return 'Average';
    }
  }

  // Add footer to PDF
  addFooter(doc) {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 50;

    doc.fontSize(8)
       .font('Helvetica-Oblique')
       .fillColor('#7f8c8d')
       .text('Generated by Khanqah Saifia Management System', 50, footerY, { align: 'center' })
       .text(`Generated on ${new Date().toLocaleString()}`, 50, footerY + 12, { align: 'center' });
  }

  // Auto-generate report when progress is recorded
  async autoGenerateReport(studentId, progressRecord) {
    try {
      // Get last 30 days of progress for comprehensive report
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const progressRecords = await prisma.hifzProgress.findMany({
        where: {
          studentId,
          date: {
            gte: thirtyDaysAgo
          }
        },
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
        orderBy: { date: 'asc' }
      });

      if (progressRecords.length > 0) {
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
        });

        // Calculate analytics
        const analytics = this.calculateAnalytics(progressRecords);

        // Check for alerts
        await this.checkAndNotifyAlerts(student, progressRecords, analytics);

        // Generate PDF
        const pdfBuffer = await this.generatePDF(
          student, 
          progressRecords,
          analytics,
          thirtyDaysAgo.toISOString().split('T')[0],
          new Date().toISOString().split('T')[0]
        );

        // Save PDF to storage
        const fileName = `hifz-report-${student.admissionNo}-${Date.now()}.pdf`;
        const filePath = path.join(__dirname, '../reports', fileName);
        
        // Ensure reports directory exists
        const reportsDir = path.dirname(filePath);
        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }

        fs.writeFileSync(filePath, pdfBuffer);

        return {
          success: true,
          filePath,
          fileName,
          analytics
        };
      }

      return { success: false, message: 'No progress records found' };
    } catch (error) {
      console.error('Auto-generate report error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get student progress analytics (for API endpoint)
  async getStudentAnalytics(req, res) {
    try {
      const { studentId } = req.params;
      const { days = 30 } = req.query;

      if (!studentId) {
        return res.status(400).json({ error: 'Student ID is required' });
      }

      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Get progress records
      const progressRecords = await prisma.hifzProgress.findMany({
        where: {
          studentId,
          date: {
            gte: startDate
          }
        },
        orderBy: { date: 'asc' }
      });

      if (progressRecords.length === 0) {
        return res.status(404).json({ error: 'No progress records found' });
      }

      // Calculate analytics
      const analytics = this.calculateAnalytics(progressRecords);

      // Get student info
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      });

      res.json({
        student: {
          id: student.id,
          name: student.user.name,
          admissionNo: student.admissionNo
        },
        analytics,
        recordCount: progressRecords.length,
        dateRange: {
          from: startDate.toISOString(),
          to: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update student para completion (called by teacher)
  async updateParaCompletion(req, res) {
    try {
      const { studentId } = req.params;
      const { completedParas, currentPara, paraProgress } = req.body;

      if (!studentId) {
        return res.status(400).json({ error: 'Student ID is required' });
      }

      // Validate para numbers
      if (currentPara && (currentPara < 1 || currentPara > 30)) {
        return res.status(400).json({ error: 'Current Para must be between 1 and 30' });
      }

      if (completedParas && !Array.isArray(completedParas)) {
        return res.status(400).json({ error: 'Completed Paras must be an array' });
      }

      if (completedParas && completedParas.some(p => p < 1 || p > 30)) {
        return res.status(400).json({ error: 'Para numbers must be between 1 and 30' });
      }

      if (paraProgress !== undefined && (paraProgress < 0 || paraProgress > 100)) {
        return res.status(400).json({ error: 'Para progress must be between 0 and 100' });
      }

      // Get latest progress record
      const latestRecord = await prisma.hifzProgress.findFirst({
        where: { studentId },
        orderBy: { date: 'desc' }
      });

      if (!latestRecord) {
        return res.status(404).json({ error: 'No progress records found for student' });
      }

      // Update the latest record
      const updatedRecord = await prisma.hifzProgress.update({
        where: { id: latestRecord.id },
        data: {
          ...(completedParas !== undefined && { completedParas }),
          ...(currentPara !== undefined && { currentPara }),
          ...(paraProgress !== undefined && { paraProgress })
        }
      });

      // Recalculate analytics with updated data
      const allRecords = await prisma.hifzProgress.findMany({
        where: { studentId },
        orderBy: { date: 'asc' }
      });

      const analytics = this.calculateAnalytics(allRecords);

      // Get student for notifications
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
      });

      // Check if para was completed
      if (completedParas && completedParas.length > (latestRecord.completedParas?.length || 0)) {
        const newlyCompletedParas = completedParas.filter(p => 
          !(latestRecord.completedParas || []).includes(p)
        );

        // Create celebration notification
        await prisma.notification.create({
          data: {
            userId: student.userId,
            type: 'PARA_COMPLETED',
            title: '🎉 Para Completed!',
            message: `Congratulations! You have completed Para ${newlyCompletedParas.join(', ')}. Keep up the excellent work!`,
            severity: 'success',
            read: false
          }
        }).catch(err => console.error('Celebration notification error:', err));

        // Notify admins about completion
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN' }
        });

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'PARA_COMPLETED',
              title: `Student Achievement: ${student.user.name}`,
              message: `${student.user.name} has completed Para ${newlyCompletedParas.join(', ')}! Total completed: ${completedParas.length}/30`,
              severity: 'success',
              read: false
            }
          }).catch(err => console.error('Admin notification error:', err));
        }
      }

      res.json({
        success: true,
        message: 'Para completion updated successfully',
        updatedRecord,
        analytics
      });

    } catch (error) {
      console.error('Update para completion error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all student alerts
  async getStudentAlerts(req, res) {
    try {
      const { studentId } = req.params;

      if (!studentId) {
        return res.status(400).json({ error: 'Student ID is required' });
      }

      // Get recent progress records (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const progressRecords = await prisma.hifzProgress.findMany({
        where: {
          studentId,
          date: {
            gte: thirtyDaysAgo
          }
        },
        orderBy: { date: 'asc' }
      });

      if (progressRecords.length === 0) {
        return res.json({
          alerts: [],
          message: 'No recent progress records found'
        });
      }

      // Calculate analytics
      const analytics = this.calculateAnalytics(progressRecords);

      // Generate alerts
      const alerts = [];

      // Check for high mistakes
      if (parseFloat(analytics.avgMistakesPerDay) > HifzReportController.MISTAKE_THRESHOLD) {
        alerts.push({
          type: 'HIGH_MISTAKES',
          severity: 'warning',
          message: `Averaging ${analytics.avgMistakesPerDay} mistakes per day`,
          recommendation: 'Focus on improving accuracy. Review difficult sections more frequently.'
        });
      }

      // Check for low progress
      if (parseFloat(analytics.avgLinesPerDay) < HifzReportController.LOW_PROGRESS_THRESHOLD) {
        alerts.push({
          type: 'LOW_PROGRESS',
          severity: 'warning',
          message: `Only memorizing ${analytics.avgLinesPerDay} lines per day`,
          recommendation: 'Try to increase daily memorization target. Consistency is key.'
        });
      }

      // Check for declining performance
      if (analytics.performanceTrend === 'Declining') {
        alerts.push({
          type: 'DECLINING_PERFORMANCE',
          severity: 'info',
          message: `Performance declining: Last 7 days (${analytics.last7DaysAvg}) < Overall average (${analytics.avgLinesPerDay})`,
          recommendation: 'Review your study schedule and ensure adequate rest.'
        });
      }

      // Check for low consistency
      if (parseFloat(analytics.consistencyScore) < 70) {
        alerts.push({
          type: 'LOW_CONSISTENCY',
          severity: 'warning',
          message: `Attendance consistency: ${analytics.consistencyScore}%`,
          recommendation: 'Maintain regular attendance for better progress.'
        });
      }

      // Positive feedback
      if (alerts.length === 0) {
        alerts.push({
          type: 'EXCELLENT_PERFORMANCE',
          severity: 'success',
          message: 'Excellent performance! Keep up the great work!',
          recommendation: 'Continue maintaining your current pace and accuracy.'
        });
      }

      res.json({
        alerts,
        analytics,
        generatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get student alerts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Bulk generate reports for all students (admin function)
  async bulkGenerateReports(req, res) {
    try {
      const { classId, startDate, endDate } = req.query;

      // Build filter
      const filter = {};
      if (classId) {
        filter.currentEnrollment = {
          classRoomId: classId
        };
      }

      // Get all students
      const students = await prisma.student.findMany({
        where: filter,
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      });

      const results = [];

      for (const student of students) {
        try {
          const result = await this.autoGenerateReport(student.id);
          results.push({
            studentId: student.id,
            studentName: student.user.name,
            admissionNo: student.admissionNo,
            ...result
          });
        } catch (error) {
          results.push({
            studentId: student.id,
            studentName: student.user.name,
            admissionNo: student.admissionNo,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      res.json({
        totalStudents: students.length,
        successCount,
        failCount,
        results
      });

    } catch (error) {
      console.error('Bulk generate reports error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new HifzReportController();