const PDFDocument = require('pdfkit');
const prisma = require('../db/prismaClient');
const HifzAnalyticsService = require('../services/HifzAnalyticsService');
const fs = require('fs');
const path = require('path');

class HifzPDFController {
  // Generate and download Hifz progress PDF report
  async generateReport(req, res) {
    try {
      const { studentId, startDate, endDate, days = 30 } = req.query;

      if (!studentId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Student ID is required' 
        });
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
          },
          hifzStatus: true
        }
      });

      if (!student) {
        return res.status(404).json({ 
          success: false, 
          error: 'Student not found' 
        });
      }

      // Build date filter
      let dateFilter = {};
      if (startDate && endDate) {
        dateFilter = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      } else {
        // Default to last N days
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));
        dateFilter = {
          gte: daysAgo,
          lte: new Date()
        };
      }

      // Get progress records
      const progressRecords = await prisma.hifzProgress.findMany({
        where: {
          studentId,
          date: dateFilter
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
        return res.status(404).json({ 
          success: false, 
          error: 'No progress records found for the specified period' 
        });
      }

      // Calculate analytics
      const analytics = await HifzAnalyticsService.calculateStudentAnalytics(
        studentId, 
        parseInt(days)
      );

      // Generate PDF
      const pdfBuffer = await this.createPDF(
        student, 
        progressRecords, 
        analytics, 
        startDate, 
        endDate
      );

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename="hifz-report-${student.admissionNo}-${Date.now()}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      console.error('Generate PDF report error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }

  // Create PDF document
  async createPDF(student, progressRecords, analytics, startDate, endDate) {
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

        // Build PDF content
        this.addHeader(doc, student, startDate, endDate);
        this.addStudentInfo(doc, student);
        this.addSummarySection(doc, analytics);
        this.addProgressOverview(doc, analytics, student.hifzStatus);
        this.addPerformanceAnalysis(doc, analytics);
        this.addAlertsSection(doc, analytics);
        
        // Check if new page needed for table
        if (doc.y > 500) {
          doc.addPage();
        }
        
        this.addProgressTable(doc, progressRecords);
        this.addFooter(doc);

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  // Add header
  addHeader(doc, student, startDate, endDate) {
    // Madrasa name
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Khanqah Saifia', 50, 50, { align: 'center' });

    doc.fontSize(14)
       .font('Helvetica')
       .fillColor('#7f8c8d')
       .text('Hifz Program Progress Report', 50, 75, { align: 'center' });

    // Date range
    const periodText = startDate && endDate 
      ? `Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
      : `Generated on: ${new Date().toLocaleDateString()}`;

    doc.fontSize(10)
       .font('Helvetica-Oblique')
       .text(periodText, 50, 95, { align: 'center' });

    // Separator
    doc.moveTo(50, 115)
       .lineTo(545, 115)
       .strokeColor('#bdc3c7')
       .lineWidth(1)
       .stroke();

    doc.y = 130;
  }

  // Add student information
  addStudentInfo(doc, student) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Student Information', 50, doc.y);

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#34495e');

    const startY = doc.y + 15;

    // Left column
    doc.text(`Name: ${student.user.name}`, 50, startY)
       .text(`Admission No: ${student.admissionNo}`, 50, startY + 15)
       .text(`Roll No: ${student.currentEnrollment?.rollNumber || 'N/A'}`, 50, startY + 30);

    // Right column
    const classRoom = student.currentEnrollment?.classRoom;
    const teacher = classRoom?.teacher;

    doc.text(`Class: ${classRoom?.name || 'N/A'}`, 300, startY)
       .text(`Teacher: ${teacher ? teacher.user.name : 'Not Assigned'}`, 300, startY + 15)
       .text(`Status: Active`, 300, startY + 30);

    doc.y = startY + 55;
  }

  // Add summary section
  addSummarySection(doc, analytics) {
    // Separator
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#ecf0f1')
       .lineWidth(1)
       .stroke();

    doc.y += 15;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Progress Summary', 50, doc.y);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#34495e');

    const startY = doc.y + 20;

    // First column - Period & Days
    doc.text(`Report Period: ${analytics.period.totalDays} days`, 50, startY)
       .text(`Attendance Rate: ${analytics.performance.attendanceRate}%`, 50, startY + 15)
       .text(`Present Days: ${analytics.performance.presentDays}`, 50, startY + 30)
       .text(`Consistency: ${analytics.performance.consistencyScore}%`, 50, startY + 45);

    // Second column - Lines
    doc.text(`Total Lines (Sabaq): ${analytics.lines.totalSabaqLines}`, 200, startY)
       .text(`Avg Lines/Day: ${analytics.lines.avgLinesPerDay}`, 200, startY + 15)
       .text(`Total Lines (All): ${analytics.lines.totalLines}`, 200, startY + 30)
       .text(`Performance: ${analytics.performance.performanceTrend}`, 200, startY + 45);

    // Third column - Mistakes
    doc.text(`Total Mistakes: ${analytics.mistakes.totalMistakes}`, 370, startY)
       .text(`Avg Mistakes/Day: ${analytics.mistakes.avgMistakesPerDay}`, 370, startY + 15)
       .text(`Mistake Rate: ${analytics.mistakes.mistakeRate}%`, 370, startY + 30)
       .text(`High Mistake Days: ${analytics.mistakes.highMistakeDays}`, 370, startY + 45);

    doc.y = startY + 70;
  }

  // Add progress overview with visual representation
  addProgressOverview(doc, analytics, hifzStatus) {
    // Separator
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#ecf0f1')
       .lineWidth(1)
       .stroke();

    doc.y += 15;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Para Progress Overview', 50, doc.y);

    const startY = doc.y + 20;

    // Para statistics
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#34495e');

    const alreadyMemorized = hifzStatus?.alreadyMemorizedParas?.length || 0;
    const completed = analytics.paraProgress.completedParas;
    const current = analytics.paraProgress.currentPara;
    const currentProgress = analytics.paraProgress.currentParaProgress;

    doc.text(`Already Memorized (Before Joining): ${alreadyMemorized} Para${alreadyMemorized !== 1 ? 's' : ''}`, 50, startY)
       .text(`Completed During Training: ${completed} Para${completed !== 1 ? 's' : ''}`, 50, startY + 15)
       .text(`Total Memorized: ${alreadyMemorized + completed}/30 Paras`, 50, startY + 30)
       .text(`Current Para: Para ${current} (${currentProgress}% complete)`, 50, startY + 45)
       .text(`Remaining: ${analytics.paraProgress.remainingParas} Paras`, 50, startY + 60);

    // Overall progress bar
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .text('Overall Completion:', 50, startY + 85);

    // Progress bar background
    doc.rect(50, startY + 100, 400, 20)
       .fillColor('#ecf0f1')
       .fill();

    // Progress bar fill
    const completionPercentage = analytics.paraProgress.overallCompletionPercentage;
    const progressWidth = (completionPercentage / 100) * 400;
    
    const barColor = completionPercentage >= 75 ? '#27ae60' :
                    completionPercentage >= 50 ? '#f39c12' :
                    completionPercentage >= 25 ? '#3498db' : '#e74c3c';

    doc.rect(50, startY + 100, progressWidth, 20)
       .fillColor(barColor)
       .fill();

    // Percentage text
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text(`${completionPercentage}%`, 455, startY + 103);

    // Projection
    if (analytics.projection.estimatedDaysToComplete) {
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#34495e')
         .text(`Estimated Days to Complete: ${analytics.projection.estimatedDaysToComplete}`, 50, startY + 130);
      
      if (analytics.projection.estimatedCompletionDate) {
        const completionDate = new Date(analytics.projection.estimatedCompletionDate);
        doc.text(`Projected Completion: ${completionDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`, 50, startY + 145);
      }
    }

    doc.y = startY + 170;
  }

  // Add performance analysis
  addPerformanceAnalysis(doc, analytics) {
    // Check if new page needed
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 50;
    }

    // Separator
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

    const startY = doc.y + 20;

    // Condition breakdown
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#34495e')
       .text('Daily Condition Breakdown:', 50, startY);

    const breakdown = analytics.performance.conditionBreakdown;
    const total = breakdown.excellent + breakdown.good + breakdown.medium + breakdown.belowAverage;

    doc.text(`Excellent: ${breakdown.excellent} (${total > 0 ? ((breakdown.excellent/total)*100).toFixed(0) : 0}%)`, 70, startY + 15, { continued: true })
       .fillColor('#27ae60')
       .text(' ●', { continued: false });

    doc.fillColor('#34495e')
       .text(`Good: ${breakdown.good} (${total > 0 ? ((breakdown.good/total)*100).toFixed(0) : 0}%)`, 70, startY + 30, { continued: true })
       .fillColor('#3498db')
       .text(' ●', { continued: false });

    doc.fillColor('#34495e')
       .text(`Medium: ${breakdown.medium} (${total > 0 ? ((breakdown.medium/total)*100).toFixed(0) : 0}%)`, 70, startY + 45, { continued: true })
       .fillColor('#f39c12')
       .text(' ●', { continued: false });

    doc.fillColor('#34495e')
       .text(`Below Average: ${breakdown.belowAverage} (${total > 0 ? ((breakdown.belowAverage/total)*100).toFixed(0) : 0}%)`, 70, startY + 60, { continued: true })
       .fillColor('#e74c3c')
       .text(' ●', { continued: false });

    // Performance trend
    doc.fillColor('#34495e')
       .text('Recent Trend: ', 300, startY + 15, { continued: true });
    
    const trendColor = analytics.performance.performanceTrend === 'Improving' ? '#27ae60' :
                      analytics.performance.performanceTrend === 'Declining' ? '#e74c3c' : '#f39c12';
    
    doc.fillColor(trendColor)
       .font('Helvetica-Bold')
       .text(analytics.performance.performanceTrend);

    doc.font('Helvetica')
       .fillColor('#34495e')
       .text(`Last 7 Days Avg: ${analytics.performance.last7DaysAvg} lines/day`, 300, startY + 30);

    doc.y = startY + 85;
  }

  // Add alerts section
  addAlertsSection(doc, analytics) {
    if (!analytics.alerts || analytics.alerts.length === 0) return;

    // Check if new page needed
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 50;
    }

    // Separator
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#ecf0f1')
       .lineWidth(1)
       .stroke();

    doc.y += 15;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Alerts & Recommendations', 50, doc.y);

    doc.y += 20;

    analytics.alerts.forEach((alert, index) => {
      const severityColor = alert.severity === 'critical' ? '#e74c3c' :
                           alert.severity === 'warning' ? '#f39c12' :
                           alert.severity === 'success' ? '#27ae60' : '#3498db';

      // Alert icon
      doc.fontSize(10)
         .fillColor(severityColor)
         .text('●', 50, doc.y, { continued: true });

      // Alert message
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#2c3e50')
         .text(` ${alert.message}`, { continued: false });

      // Recommendation
      if (alert.recommendation) {
        doc.fontSize(8)
           .font('Helvetica-Oblique')
           .fillColor('#7f8c8d')
           .text(`   ${alert.recommendation}`, 50, doc.y + 2);
      }

      doc.y += 15;
    });

    doc.y += 5;
  }

  // Add progress table
  addProgressTable(doc, progressRecords) {
    // New page for table
    if (doc.y > 600) {
      doc.addPage();
      doc.y = 50;
    }

    // Separator
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

    // Table header
    this.drawTableHeader(doc);
    doc.y += 5;

    // Table rows
    let rowCount = 0;
    const maxRowsPerPage = 20;

    progressRecords.forEach((record, index) => {
      // Check if new page needed
      if (rowCount >= maxRowsPerPage) {
        doc.addPage();
        this.drawTableHeader(doc);
        doc.y += 5;
        rowCount = 0;
      }

      this.drawTableRow(doc, record, index);
      rowCount++;
    });
  }

  // Draw table header
  drawTableHeader(doc) {
    const headerY = doc.y;

    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .rect(50, headerY, 495, 18)
       .fill('#2c3e50');

    const y = headerY + 5;
    doc.text('Date', 55, y)
       .text('Sabaq', 105, y)
       .text('Sabqi', 145, y)
       .text('Manzil', 185, y)
       .text('Mistakes', 235, y)
       .text('Para', 290, y)
       .text('Progress', 330, y)
       .text('Attendance', 390, y)
       .text('Status', 460, y);

    doc.y = headerY + 23;
  }

  // Draw table row
  drawTableRow(doc, record, index) {
    const rowY = doc.y;
    const rowHeight = 16;

    // Alternate row colors
    const fillColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
    
    doc.rect(50, rowY, 495, rowHeight)
       .fillColor(fillColor)
       .fill();

    doc.fontSize(7)
       .font('Helvetica')
       .fillColor('#2c3e50');

    const y = rowY + 4;

    // Date
    doc.text(new Date(record.date).toLocaleDateString(), 55, y);

    // Lines
    doc.text(record.sabaqLines.toString(), 110, y);
    doc.text(record.sabqiLines.toString(), 150, y);
    doc.text(record.manzilLines.toString(), 195, y);

    // Mistakes (with color)
    const mistakeColor = record.totalMistakes > 3 ? '#e74c3c' : '#2c3e50';
    doc.fillColor(mistakeColor)
       .text(record.totalMistakes.toString(), 250, y);

    // Para
    doc.fillColor('#2c3e50')
       .text(record.currentPara ? `${record.currentPara}` : '-', 295, y);

    // Progress
    const progress = record.currentParaProgress ? `${record.currentParaProgress.toFixed(0)}%` : '-';
    doc.text(progress, 340, y);

    // Attendance
    const attendanceColor = record.attendance === 'PRESENT' ? '#27ae60' : '#e74c3c';
    doc.fillColor(attendanceColor)
       .text(record.attendance, 395, y);

    // Condition
    const conditionColor = record.condition === 'Excellent' ? '#27ae60' :
                          record.condition === 'Good' ? '#3498db' :
                          record.condition === 'Medium' ? '#f39c12' : '#e74c3c';
    doc.fillColor(conditionColor)
       .fontSize(6)
       .text(record.condition || 'N/A', 465, y);

    doc.y = rowY + rowHeight;
  }

  // Add footer
  addFooter(doc) {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 50;

    doc.fontSize(8)
       .font('Helvetica-Oblique')
       .fillColor('#7f8c8d')
       .text('Generated by Khanqah Saifia Management System', 50, footerY, { align: 'center' })
       .text(`Generated on ${new Date().toLocaleString()}`, 50, footerY + 12, { align: 'center' });
  }

  // Save PDF to file system (for auto-generation or storage)
  async savePDF(studentId, days = 30) {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { name: true, email: true } },
          currentEnrollment: {
            include: {
              classRoom: {
                include: {
                  teacher: {
                    include: { user: { select: { name: true } } }
                  }
                }
              }
            }
          },
          hifzStatus: true
        }
      });

      if (!student) {
        throw new Error('Student not found');
      }

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));

      const progressRecords = await prisma.hifzProgress.findMany({
        where: {
          studentId,
          date: { gte: daysAgo }
        },
        include: {
          teacher: {
            include: { user: { select: { name: true } } }
          }
        },
        orderBy: { date: 'asc' }
      });

      if (progressRecords.length === 0) {
        throw new Error('No progress records found');
      }

      const analytics = await HifzAnalyticsService.calculateStudentAnalytics(studentId, days);
      const pdfBuffer = await this.createPDF(student, progressRecords, analytics);

      // Save to file system
      const fileName = `hifz-report-${student.admissionNo}-${Date.now()}.pdf`;
      const reportsDir = path.join(__dirname, '../reports');
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filePath = path.join(reportsDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);

      return {
        success: true,
        filePath,
        fileName,
        analytics
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