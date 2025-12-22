const PDFDocument = require('pdfkit');
const prisma = require('../db/prismaClient');
const HifzAnalyticsService = require('../services/HifzAnalyticsService');
const HifzCalculationHelper = require('../services/HifzCalculationHelper');
const fs = require('fs');
const path = require('path');

class HifzPDFController {
  // Generate and download Hifz progress PDF report
   async generateReport(req, res) {
    const requestStartTime = Date.now();

    try {
      console.log('📄 [HIFZ REPORT] Generate report request received');
      
      const { studentId } = req.params;
      const { days = 30, type = 'comprehensive' } = req.query;

      console.log('📋 Request Details:', { studentId, days, type });

      if (!studentId) {
        return res.status(400).json({
          success: false,
          error: 'Student ID is required'
        });
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
          // Changed from dailyReports to hifzProgress
          hifzProgress: {
            where: {
              date: {
                gte: new Date(new Date().setDate(new Date().getDate() - parseInt(days)))
              }
            },
            orderBy: {
              date: 'desc'
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
      const analytics = await this.calculateAnalytics(student, parseInt(days));
      
      // Generate PDF
      const pdfBuffer = await this.createPDF(student, analytics, type);
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="hifz-report-${student.user.name.replace(/\s+/g, '-')}-${Date.now()}.pdf"`
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

  // Calculate analytics from hifzProgress
  async calculateAnalytics(student, days) {
    const progressRecords = student.hifzProgress || [];
    const hifzStatus = student.hifzStatus || {};
    
    console.log(`📈 Processing ${progressRecords.length} progress records`);
    
    // Basic statistics
    const totalReports = progressRecords.length;
    const presentDays = progressRecords.filter(r => r.attendance === 'PRESENT' || r.attendance === 'Present').length;
    const attendanceRate = totalReports > 0 ? (presentDays / totalReports) * 100 : 0;
    
    // Lines and mistakes calculations
    let totalSabaqLines = 0;
    let totalSabqiLines = 0;
    let totalManzilLines = 0;
    let totalMistakes = 0;
    
    progressRecords.forEach(report => {
      const attendance = report.attendance || 'PRESENT';
      if (attendance === 'PRESENT' || attendance === 'Present') {
        totalSabaqLines += parseInt(report.sabaqLines) || 0;
        totalSabqiLines += parseInt(report.sabqiLines) || 0;
        totalManzilLines += parseInt(report.manzilLines) || 0;
        totalMistakes += parseInt(report.totalMistakes) || 
                         (parseInt(report.sabaqMistakes) || 0) + 
                         (parseInt(report.sabqiMistakes) || 0) + 
                         (parseInt(report.manzilMistakes) || 0);
      }
    });
    
    const totalLines = totalSabaqLines + totalSabqiLines + totalManzilLines;
    const avgLinesPerDay = totalReports > 0 ? totalLines / totalReports : 0;
    const avgMistakesPerDay = totalReports > 0 ? totalMistakes / totalReports : 0;
    const mistakeRate = totalLines > 0 ? (totalMistakes / totalLines) * 100 : 0;
    
    // Para progress
    const alreadyMemorizedParas = hifzStatus.alreadyMemorizedParas || [];
    const completedParas = hifzStatus.completedParas || [];
    const totalMemorizedParas = alreadyMemorizedParas.length + completedParas.length;
    const currentPara = hifzStatus.currentPara || 1;
    const currentParaProgress = hifzStatus.currentParaProgress || 0;
    const remainingParas = 30 - totalMemorizedParas;
    const overallCompletion = (totalMemorizedParas / 30) * 100;
    
    // Condition breakdown
    const conditionBreakdown = {
      excellent: progressRecords.filter(r => r.condition === 'Excellent').length,
      good: progressRecords.filter(r => r.condition === 'Good').length,
      medium: progressRecords.filter(r => r.condition === 'Medium').length,
      belowAverage: progressRecords.filter(r => r.condition === 'Below Average').length
    };
    
    // Performance trend (last 7 days average)
    const last7Reports = progressRecords.slice(0, 7);
    const last7Avg = last7Reports.length > 0 
      ? last7Reports.reduce((sum, r) => {
          const attendance = r.attendance || 'PRESENT';
          return sum + ((attendance === 'PRESENT' || attendance === 'Present') ? (parseInt(r.sabaqLines) || 0) : 0);
        }, 0) / last7Reports.length 
      : 0;
    
    // Determine performance trend
    let performanceTrend = "No Data";
    if (last7Reports.length >= 3) {
      const firstHalfAvg = last7Reports.slice(0, 3).reduce((sum, r) => 
        sum + (parseInt(r.sabaqLines) || 0), 0) / 3;
      const secondHalfAvg = last7Reports.slice(4).reduce((sum, r) => 
        sum + (parseInt(r.sabaqLines) || 0), 0) / 3;
      
      if (secondHalfAvg > firstHalfAvg * 1.1) {
        performanceTrend = "Improving";
      } else if (secondHalfAvg < firstHalfAvg * 0.9) {
        performanceTrend = "Declining";
      } else {
        performanceTrend = "Stable";
      }
    }
    
    // Projections
    let estimatedDaysToComplete = null;
    let estimatedCompletionDate = null;
    
    if (avgLinesPerDay > 0 && remainingParas > 0) {
      // Assuming 20 lines per para on average
      const totalLinesNeeded = remainingParas * 20;
      estimatedDaysToComplete = Math.ceil(totalLinesNeeded / avgLinesPerDay);
      estimatedCompletionDate = new Date(new Date().setDate(new Date().getDate() + estimatedDaysToComplete));
    }
    
    // Time description
    let timeDescription = "Not enough data";
    if (estimatedDaysToComplete) {
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
    
    // Alerts
    const alerts = [];
    
    if (attendanceRate < 80 && totalReports >= 5) {
      alerts.push({
        severity: 'warning',
        message: `Attendance rate is ${attendanceRate.toFixed(1)}% (below 80%)`,
        recommendation: 'Improve regular attendance for consistent progress'
      });
    }
    
    if (mistakeRate > 15 && totalLines > 50) {
      alerts.push({
        severity: 'warning',
        message: `Mistake rate is ${mistakeRate.toFixed(1)}% (above 15%)`,
        recommendation: 'Focus on accuracy and revise previous lessons regularly'
      });
    }
    
    if (totalMemorizedParas === 0 && days >= 14) {
      alerts.push({
        severity: 'info',
        message: 'No paras memorized yet',
        recommendation: 'Start para memorization and set achievable milestones'
      });
    }
    
    if (avgLinesPerDay < 10 && totalReports >= 5) {
      alerts.push({
        severity: 'info',
        message: `Low daily average (${avgLinesPerDay.toFixed(1)} lines/day)`,
        recommendation: 'Consider increasing daily memorization targets gradually'
      });
    }

    // Calculate high mistake days
    const highMistakeDays = progressRecords.filter(report => {
      const mistakes = parseInt(report.totalMistakes) || 
                      (parseInt(report.sabaqMistakes) || 0) + 
                      (parseInt(report.sabqiMistakes) || 0) + 
                      (parseInt(report.manzilMistakes) || 0);
      return mistakes > 5;
    }).length;

    return {
      period: {
        totalDays: days,
        startDate: new Date(new Date().setDate(new Date().getDate() - days)),
        endDate: new Date(),
        daysWithData: totalReports
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
        alreadyMemorized: alreadyMemorizedParas.length,
        completedDuringTraining: completedParas.length,
        totalMemorized: totalMemorizedParas,
        currentPara,
        currentParaProgress,
        remainingParas,
        overallCompletionPercentage: parseFloat(overallCompletion.toFixed(1)),
        // Check for overlapping paras
        overlaps: alreadyMemorizedParas.filter(para => completedParas.includes(para))
      },
      performance: {
        totalReports,
        presentDays,
        attendanceRate: parseFloat(attendanceRate.toFixed(1)),
        conditionBreakdown,
        last7DaysAvg: parseFloat(last7Avg.toFixed(1)),
        performanceTrend,
        consistencyScore: parseFloat((attendanceRate * 0.4 + (100 - mistakeRate) * 0.3 + overallCompletion * 0.3).toFixed(1))
      },
      projection: {
        estimatedDaysToComplete,
        estimatedCompletionDate,
        timeDescription
      },
      alerts
    };
  }


  // Create PDF document
  async createPDF(student, analytics, type) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 50,
          size: 'A4',
          font: 'Helvetica'
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Add content
        this.addHeader(doc, student);
        this.addStudentInfo(doc, student);
        this.addSummarySection(doc, analytics);
        this.addProgressSection(doc, analytics);
        this.addPerformanceSection(doc, analytics);
        
        if (type === 'detailed' || type === 'comprehensive') {
          this.addProgressTable(doc, student.hifzProgress);
        }
        
        this.addFooter(doc, student);
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  // Add Progress Table (updated for hifzProgress)
  addProgressTable(doc, progressRecords) {
    if (!progressRecords || progressRecords.length === 0) {
      // Add "No Data" message
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#e74c3c')
         .text('No Progress Records Found', 50, doc.y + 20, { align: 'center' });
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#7f8c8d')
         .text('Start recording daily progress to see detailed reports.', 
               50, doc.y + 40, { align: 'center' });
      
      doc.y += 80;
      return;
    }
    
    // Check if we need a new page
    if (doc.y > 600) {
      doc.addPage();
    }
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text('Daily Progress Records', 50, doc.y);
    
    doc.moveDown(0.5);
    
    // Table header
    const headerY = doc.y;
    const columnWidths = [60, 50, 40, 40, 50, 50, 50, 50, 60];
    
    // Header background
    doc.rect(50, headerY, 495, 20)
       .fillColor('#2d3748')
       .fill();
    
    // Header text
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('#ffffff');
    
    const headers = ['Date', 'Sabaq', 'Sabqi', 'Manzil', 'Mistakes', 'Para', 'Progress', 'Cond.', 'Attendance'];
    let x = 55;
    
    headers.forEach((header, i) => {
      doc.text(header, x, headerY + 6);
      x += columnWidths[i];
    });
    
    doc.y = headerY + 25;
    
    // Table rows
    progressRecords.forEach((report, index) => {
      // Check for page break
      if (doc.y > 750) {
        doc.addPage();
        doc.y = 50;
        // Redraw header on new page
        this.drawTableHeaderOnNewPage(doc, headers, columnWidths);
      }
      
      // Alternate row colors
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f7fafc';
      
      doc.rect(50, doc.y, 495, 15)
         .fillColor(bgColor)
         .fill();
      
      // Row data
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#4a5568');
      
      x = 55;
      
      // Date
      const dateStr = new Date(report.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      doc.text(dateStr, x, doc.y + 4);
      x += columnWidths[0];
      
      // Sabaq Lines (use the correct field name from your schema)
      const sabaqValue = report.sabaqLines || report.sabaq || '0';
      doc.text(sabaqValue.toString(), x, doc.y + 4);
      x += columnWidths[1];
      
      // Sabqi Lines
      const sabqiValue = report.sabqiLines || report.sabqi || '0';
      doc.text(sabqiValue.toString(), x, doc.y + 4);
      x += columnWidths[2];
      
      // Manzil Lines
      const manzilValue = report.manzilLines || report.manzil || '0';
      doc.text(manzilValue.toString(), x, doc.y + 4);
      x += columnWidths[3];
      
      // Total Mistakes
      const totalMistakes = report.totalMistakes || 
                           (report.sabaqMistakes || 0) + 
                           (report.sabqiMistakes || 0) + 
                           (report.manzilMistakes || 0);
      const mistakeColor = totalMistakes > 5 ? '#e53e3e' : '#4a5568';
      doc.fillColor(mistakeColor)
         .text(totalMistakes.toString(), x, doc.y + 4);
      x += columnWidths[4];
      
      // Current Para
      doc.fillColor('#4a5568')
         .text(report.currentPara ? `Para ${report.currentPara}` : '-', x, doc.y + 4);
      x += columnWidths[5];
      
      // Para Progress
      const progressText = report.currentParaProgress ? `${report.currentParaProgress}%` : '-';
      doc.text(progressText, x, doc.y + 4);
      x += columnWidths[6];
      
      // Condition
      const condition = report.condition || '';
      const condColor = condition === 'Excellent' ? '#48bb78' :
                       condition === 'Good' ? '#4299e1' :
                       condition === 'Medium' ? '#ed8936' : 
                       condition === 'Below Average' ? '#e53e3e' : '#718096';
      doc.fillColor(condColor)
         .text(condition || '-', x, doc.y + 4);
      x += columnWidths[7];
      
      // Attendance
      const attendance = report.attendance || 'PRESENT';
      const attColor = attendance === 'PRESENT' || attendance === 'Present' ? '#48bb78' : '#e53e3e';
      doc.fillColor(attColor)
         .text(attendance, x, doc.y + 4);
      
      doc.y += 15;
    });
    
    doc.moveDown(1);
  }

  // Helper method to draw table header on new page
  drawTableHeaderOnNewPage(doc, headers, columnWidths) {
    const headerY = doc.y;
    
    // Header background
    doc.rect(50, headerY, 495, 20)
       .fillColor('#2d3748')
       .fill();
    
    // Header text
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('#ffffff');
    
    let x = 55;
    headers.forEach((header, i) => {
      doc.text(header, x, headerY + 6);
      x += columnWidths[i];
    });
    
    doc.y = headerY + 25;
  }

  // Other methods (addHeader, addStudentInfo, addSummarySection, etc.) remain the same
  addHeader(doc, student) {
    // Madrasa Name
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#1a365d')
       .text('JAMIA ABI BAKAR (R.A)', { align: 'center' });
    
    doc.moveDown(0.5);
    
    doc.fontSize(16)
       .font('Helvetica')
       .fillColor('#4a5568')
       .text('Hifz Progress Report', { align: 'center' });
    
    doc.moveDown(1);
    
    // Separator line
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .lineWidth(1)
       .strokeColor('#e2e8f0')
       .stroke();
    
    doc.moveDown(1);
  }

  addStudentInfo(doc, student) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text('Student Information');
    
    doc.moveDown(0.5);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#4a5568');
    
    const infoY = doc.y;
    
    // Left column
    doc.text(`Name: ${student.user.name}`, 50, infoY)
       .text(`Admission No: ${student.admissionNo || 'N/A'}`, 50, infoY + 15)
       .text(`Roll No: ${student.currentEnrollment?.rollNumber || 'N/A'}`, 50, infoY + 30);
    
    // Right column
    doc.text(`Class: ${student.currentEnrollment?.classRoom?.name || 'N/A'}`, 300, infoY)
       .text(`Teacher: ${student.currentEnrollment?.classRoom?.teacher?.user?.name || 'Not Assigned'}`, 300, infoY + 15)
       .text(`Phone: ${student.user.phone || 'N/A'}`, 300, infoY + 30);
    
    doc.y = infoY + 50;
  }

  addSummarySection(doc, analytics) {
    // Box background
    doc.rect(50, doc.y, 495, 100)
       .fillColor('#f7fafc')
       .fill();
    
    doc.rect(50, doc.y, 495, 100)
       .strokeColor('#e2e8f0')
       .stroke();
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text('Progress Summary', 65, doc.y + 15);
    
    const startY = doc.y + 35;
    
    // Column 1: Basic Stats
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#4a5568')
       .text(`Report Period: ${analytics.period.totalDays} days`, 65, startY)
       .text(`Days with Data: ${analytics.period.daysWithData}`, 65, startY + 15)
       .text(`Attendance: ${analytics.performance.attendanceRate}%`, 65, startY + 30);
    
    // Column 2: Lines
    doc.text(`Total Lines: ${analytics.lines.totalLines}`, 230, startY)
       .text(`Avg Lines/Day: ${analytics.lines.avgLinesPerDay}`, 230, startY + 15)
       .text(`Total Mistakes: ${analytics.mistakes.totalMistakes}`, 230, startY + 30);
    
    // Column 3: Para Progress
    doc.text(`Paras Memorized: ${analytics.paraProgress.totalMemorized}/30`, 400, startY)
       .text(`Completion: ${analytics.paraProgress.overallCompletionPercentage}%`, 400, startY + 15)
       .text(`Consistency: ${analytics.performance.consistencyScore}%`, 400, startY + 30);
    
    doc.y += 110;
  }

  addProgressSection(doc, analytics) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text('Para Progress Details');
    
    doc.moveDown(0.5);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#4a5568');
    
    const progressY = doc.y;
    
    // Progress details
    doc.text(`Already Memorized (Before): ${analytics.paraProgress.alreadyMemorized} paras`, 50, progressY)
       .text(`Completed During Training: ${analytics.paraProgress.completedDuringTraining} paras`, 50, progressY + 15)
       .text(`Current Para: ${analytics.paraProgress.currentPara} (${analytics.paraProgress.currentParaProgress}% complete)`, 50, progressY + 30);
    
    // Progress bar
    const barWidth = 400;
    const barHeight = 20;
    const progressWidth = (analytics.paraProgress.overallCompletionPercentage / 100) * barWidth;
    
    // Background
    doc.rect(50, progressY + 50, barWidth, barHeight)
       .fillColor('#e2e8f0')
       .fill();
    
    // Progress fill
    const progressColor = analytics.paraProgress.overallCompletionPercentage >= 75 ? '#48bb78' :
                         analytics.paraProgress.overallCompletionPercentage >= 50 ? '#ed8936' :
                         analytics.paraProgress.overallCompletionPercentage >= 25 ? '#4299e1' : '#e53e3e';
    
    doc.rect(50, progressY + 50, progressWidth, barHeight)
       .fillColor(progressColor)
       .fill();
    
    // Percentage text
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text(`${analytics.paraProgress.overallCompletionPercentage}%`, 
             barWidth + 60, progressY + 52);
    
    doc.y = progressY + 80;
    
    // Projection
    if (analytics.projection.estimatedDaysToComplete) {
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#4a5568')
         .text(`Estimated completion: ${analytics.projection.timeDescription}`, 50, doc.y);
      
      if (analytics.projection.estimatedCompletionDate) {
        const dateStr = analytics.projection.estimatedCompletionDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        doc.text(`Projected date: ${dateStr}`, 50, doc.y + 15);
      }
      
      doc.y += 30;
    }
  }

  addPerformanceSection(doc, analytics) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text('Performance Analysis');
    
    doc.moveDown(0.5);
    
    // Condition breakdown
    const conditions = [
      { label: 'Excellent', count: analytics.performance.conditionBreakdown.excellent, color: '#48bb78' },
      { label: 'Good', count: analytics.performance.conditionBreakdown.good, color: '#4299e1' },
      { label: 'Medium', count: analytics.performance.conditionBreakdown.medium, color: '#ed8936' },
      { label: 'Below Average', count: analytics.performance.conditionBreakdown.belowAverage, color: '#e53e3e' }
    ];
    
    const totalConditions = conditions.reduce((sum, c) => sum + c.count, 0);
    
    conditions.forEach((condition, index) => {
      const y = doc.y + (index * 20);
      const percentage = totalConditions > 0 ? ((condition.count / totalConditions) * 100).toFixed(1) : 0;
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#4a5568')
         .text(`${condition.label}:`, 50, y, { continued: true });
      
      doc.font('Helvetica-Bold')
         .fillColor(condition.color)
         .text(` ${condition.count} (${percentage}%)`);
    });
    
    doc.y += 90;
    
    // Performance trend
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#4a5568')
       .text(`Performance Trend: ${analytics.performance.performanceTrend}`, 50, doc.y);
    
    doc.text(`Last 7 Days Average: ${analytics.performance.last7DaysAvg} lines/day`, 50, doc.y + 15);
    
    doc.y += 40;
    
    // Alerts
    if (analytics.alerts && analytics.alerts.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#2d3748')
         .text('Alerts & Recommendations');
      
      doc.moveDown(0.5);
      
      analytics.alerts.forEach((alert, index) => {
        const alertColor = alert.severity === 'warning' ? '#ed8936' :
                          alert.severity === 'critical' ? '#e53e3e' : '#4299e1';
        
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor(alertColor)
           .text('•', 50, doc.y, { continued: true });
        
        doc.font('Helvetica')
           .fillColor('#4a5568')
           .text(` ${alert.message}`, { continued: false });
        
        if (alert.recommendation) {
          doc.fontSize(8)
             .font('Helvetica-Oblique')
             .fillColor('#718096')
             .text(`   Recommendation: ${alert.recommendation}`, 65, doc.y + 2);
          
          doc.y += 25;
        } else {
          doc.y += 15;
        }
      });
      
      doc.moveDown(1);
    }
  }

  addFooter(doc, student) {
    const footerY = doc.page.height - 50;
    
    doc.fontSize(8)
       .font('Helvetica-Oblique')
       .fillColor('#718096')
       .text('Generated by Jamia Abi Bakar (R.A) Management System', 
             50, footerY, { align: 'center' });
    
    doc.text(`Student: ${student.user.name} | Generated on ${new Date().toLocaleDateString()}`, 
             50, footerY + 12, { align: 'center' });
  }


  // Header
  addHeader(doc, student) {
    // Madrasa Name
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#1a365d')
       .text('JAMIA ABI BAKAR (R.A)', { align: 'center' });
    
    doc.moveDown(0.5);
    
    doc.fontSize(16)
       .font('Helvetica')
       .fillColor('#4a5568')
       .text('Hifz Progress Report', { align: 'center' });
    
    doc.moveDown(1);
    
    // Separator line
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .lineWidth(1)
       .strokeColor('#e2e8f0')
       .stroke();
    
    doc.moveDown(1);
  }

  // Student Information
  addStudentInfo(doc, student) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text('Student Information');
    
    doc.moveDown(0.5);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#4a5568');
    
    const infoY = doc.y;
    
    // Left column
    doc.text(`Name: ${student.user.name}`, 50, infoY)
       .text(`Admission No: ${student.admissionNo || 'N/A'}`, 50, infoY + 15)
       .text(`Roll No: ${student.currentEnrollment?.rollNumber || 'N/A'}`, 50, infoY + 30);
    
    // Right column
    doc.text(`Class: ${student.currentEnrollment?.classRoom?.name || 'N/A'}`, 300, infoY)
       .text(`Teacher: ${student.currentEnrollment?.classRoom?.teacher?.user?.name || 'Not Assigned'}`, 300, infoY + 15)
       .text(`Phone: ${student.user.phone || 'N/A'}`, 300, infoY + 30);
    
    doc.y = infoY + 50;
  }

  // Summary Section
  addSummarySection(doc, analytics) {
    // Box background
    doc.rect(50, doc.y, 495, 100)
       .fillColor('#f7fafc')
       .fill();
    
    doc.rect(50, doc.y, 495, 100)
       .strokeColor('#e2e8f0')
       .stroke();
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text('Progress Summary', 65, doc.y + 15);
    
    const startY = doc.y + 35;
    
    // Column 1: Basic Stats
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#4a5568')
       .text(`Report Period: ${analytics.period.totalDays} days`, 65, startY)
       .text(`Attendance Rate: ${analytics.performance.attendanceRate}%`, 65, startY + 15)
       .text(`Present Days: ${analytics.performance.presentDays}/${analytics.performance.totalReports}`, 65, startY + 30);
    
    // Column 2: Lines
    doc.text(`Total Lines: ${analytics.lines.totalLines}`, 230, startY)
       .text(`Avg Lines/Day: ${analytics.lines.avgLinesPerDay}`, 230, startY + 15)
       .text(`Total Mistakes: ${analytics.mistakes.totalMistakes}`, 230, startY + 30);
    
    // Column 3: Para Progress
    doc.text(`Paras Memorized: ${analytics.paraProgress.totalMemorized}/30`, 400, startY)
       .text(`Completion: ${analytics.paraProgress.overallCompletionPercentage}%`, 400, startY + 15)
       .text(`Remaining: ${analytics.paraProgress.remainingParas} paras`, 400, startY + 30);
    
    doc.y += 110;
  }

  // Progress Section
  addProgressSection(doc, analytics) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text('Para Progress Details');
    
    doc.moveDown(0.5);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#4a5568');
    
    const progressY = doc.y;
    
    // Progress details
    doc.text(`Already Memorized (Before): ${analytics.paraProgress.alreadyMemorized} paras`, 50, progressY)
       .text(`Completed During Training: ${analytics.paraProgress.completedDuringTraining} paras`, 50, progressY + 15)
       .text(`Current Para: ${analytics.paraProgress.currentPara} (${analytics.paraProgress.currentParaProgress}% complete)`, 50, progressY + 30);
    
    // Progress bar
    const barWidth = 400;
    const barHeight = 20;
    const progressWidth = (analytics.paraProgress.overallCompletionPercentage / 100) * barWidth;
    
    // Background
    doc.rect(50, progressY + 50, barWidth, barHeight)
       .fillColor('#e2e8f0')
       .fill();
    
    // Progress fill
    const progressColor = analytics.paraProgress.overallCompletionPercentage >= 75 ? '#48bb78' :
                         analytics.paraProgress.overallCompletionPercentage >= 50 ? '#ed8936' :
                         analytics.paraProgress.overallCompletionPercentage >= 25 ? '#4299e1' : '#e53e3e';
    
    doc.rect(50, progressY + 50, progressWidth, barHeight)
       .fillColor(progressColor)
       .fill();
    
    // Percentage text
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text(`${analytics.paraProgress.overallCompletionPercentage}%`, 
             barWidth + 60, progressY + 52);
    
    doc.y = progressY + 80;
    
    // Projection
    if (analytics.projection.estimatedDaysToComplete) {
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#4a5568')
         .text(`Estimated completion: ${analytics.projection.timeDescription}`, 50, doc.y);
      
      if (analytics.projection.estimatedCompletionDate) {
        doc.text(`Projected date: ${analytics.projection.estimatedCompletionDate.toLocaleDateString()}`, 
                 50, doc.y + 15);
      }
      
      doc.y += 30;
    }
  }

  // Performance Section
  addPerformanceSection(doc, analytics) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text('Performance Analysis');
    
    doc.moveDown(0.5);
    
    // Condition breakdown
    const conditions = [
      { label: 'Excellent', count: analytics.performance.conditionBreakdown.excellent, color: '#48bb78' },
      { label: 'Good', count: analytics.performance.conditionBreakdown.good, color: '#4299e1' },
      { label: 'Medium', count: analytics.performance.conditionBreakdown.medium, color: '#ed8936' },
      { label: 'Below Average', count: analytics.performance.conditionBreakdown.belowAverage, color: '#e53e3e' }
    ];
    
    const totalConditions = conditions.reduce((sum, c) => sum + c.count, 0);
    
    conditions.forEach((condition, index) => {
      const y = doc.y + (index * 20);
      const percentage = totalConditions > 0 ? ((condition.count / totalConditions) * 100).toFixed(1) : 0;
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#4a5568')
         .text(`${condition.label}:`, 50, y, { continued: true });
      
      doc.font('Helvetica-Bold')
         .fillColor(condition.color)
         .text(` ${condition.count} (${percentage}%)`);
    });
    
    doc.y += 90;
    
    // Alerts
    if (analytics.alerts && analytics.alerts.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#2d3748')
         .text('Alerts & Recommendations');
      
      doc.moveDown(0.5);
      
      analytics.alerts.forEach((alert, index) => {
        const alertColor = alert.severity === 'warning' ? '#ed8936' :
                          alert.severity === 'critical' ? '#e53e3e' : '#4299e1';
        
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor(alertColor)
           .text('•', 50, doc.y, { continued: true });
        
        doc.font('Helvetica')
           .fillColor('#4a5568')
           .text(` ${alert.message}`, { continued: false });
        
        if (alert.recommendation) {
          doc.fontSize(8)
             .font('Helvetica-Oblique')
             .fillColor('#718096')
             .text(`   Recommendation: ${alert.recommendation}`, 65, doc.y + 2);
          
          doc.y += 25;
        } else {
          doc.y += 15;
        }
      });
      
      doc.moveDown(1);
    }
  }

  // Daily Reports Table (for detailed reports)
  addDailyReportsTable(doc, reports) {
    if (reports.length === 0) return;
    
    // Check if we need a new page
    if (doc.y > 600) {
      doc.addPage();
    }
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text('Daily Progress Records');
    
    doc.moveDown(0.5);
    
    // Table header
    const headerY = doc.y;
    const columnWidths = [60, 50, 50, 50, 50, 60, 50, 50, 60];
    
    // Header background
    doc.rect(50, headerY, 495, 20)
       .fillColor('#2d3748')
       .fill();
    
    // Header text
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('#ffffff');
    
    const headers = ['Date', 'Sabaq', 'Sabqi', 'Manzil', 'Mistakes', 'Para', 'Progress', 'Cond.', 'Attendance'];
    let x = 55;
    
    headers.forEach((header, i) => {
      doc.text(header, x, headerY + 6);
      x += columnWidths[i];
    });
    
    doc.y = headerY + 25;
    
    // Table rows
    reports.forEach((report, index) => {
      // Check for page break
      if (doc.y > 750) {
        doc.addPage();
        doc.y = 50;
      }
      
      // Alternate row colors
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f7fafc';
      
      doc.rect(50, doc.y, 495, 15)
         .fillColor(bgColor)
         .fill();
      
      // Row data
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#4a5568');
      
      x = 55;
      
      // Date
      const dateStr = new Date(report.date).toLocaleDateString();
      doc.text(dateStr, x, doc.y + 4);
      x += columnWidths[0];
      
      // Sabaq
      doc.text(report.sabaqLines || '0', x, doc.y + 4);
      x += columnWidths[1];
      
      // Sabqi
      doc.text(report.sabqiLines || '0', x, doc.y + 4);
      x += columnWidths[2];
      
      // Manzil
      doc.text(report.manzilLines || '0', x, doc.y + 4);
      x += columnWidths[3];
      
      // Mistakes
      const mistakeColor = (report.totalMistakes || 0) > 5 ? '#e53e3e' : '#4a5568';
      doc.fillColor(mistakeColor)
         .text(report.totalMistakes?.toString() || '0', x, doc.y + 4);
      x += columnWidths[4];
      
      // Para
      doc.fillColor('#4a5568')
         .text(report.currentPara || '-', x, doc.y + 4);
      x += columnWidths[5];
      
      // Progress
      doc.text(report.currentParaProgress ? `${report.currentParaProgress}%` : '-', x, doc.y + 4);
      x += columnWidths[6];
      
      // Condition
      const condColor = report.condition === 'Excellent' ? '#48bb78' :
                       report.condition === 'Good' ? '#4299e1' :
                       report.condition === 'Medium' ? '#ed8936' : '#e53e3e';
      doc.fillColor(condColor)
         .text(report.condition || '-', x, doc.y + 4);
      x += columnWidths[7];
      
      // Attendance
      const attColor = report.attendance === 'Present' ? '#48bb78' : '#e53e3e';
      doc.fillColor(attColor)
         .text(report.attendance || '-', x, doc.y + 4);
      
      doc.y += 15;
    });
    
    doc.moveDown(1);
  }

  // Footer
  addFooter(doc, student) {
    const footerY = doc.page.height - 50;
    
    doc.fontSize(8)
       .font('Helvetica-Oblique')
       .fillColor('#718096')
       .text('Generated by Jamia Abi Bakar (R.A) Management System', 
             50, footerY, { align: 'center' });
    
    doc.text(`Student: ${student.user.name} | Generated on ${new Date().toLocaleDateString()}`, 
             50, footerY + 12, { align: 'center' });
  }


// Add this new method to handle "No Data" case
addNoDataSection(doc, analytics) {
  // Separator
  doc.moveTo(50, doc.y)
     .lineTo(545, doc.y)
     .strokeColor('#ecf0f1')
     .lineWidth(1)
     .stroke();

  doc.y += 20;

  // "No Data" message
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor('#e74c3c')
     .text('⚠️ No Progress Data Available', 50, doc.y, { align: 'center' });

  doc.y += 30;

  doc.fontSize(10)
     .font('Helvetica')
     .fillColor('#7f8c8d')
     .text('No progress records were found for the selected period.', 50, doc.y, {
       align: 'center',
       width: 495
     });

  doc.y += 20;

  doc.fontSize(10)
     .font('Helvetica')
     .fillColor('#34495e')
     .text('This report includes:', 50, doc.y);

  doc.y += 15;

  const bulletPoints = [
    '✓ Student information and enrollment details',
    '✓ Current Hifz status (if available)',
    '✓ Para progress overview',
    '✓ Recommended next steps'
  ];

  bulletPoints.forEach((point, index) => {
    doc.text(point, 70, doc.y + (index * 15));
  });

  doc.y += (bulletPoints.length * 15) + 20;

  // Show current status if available
  if (analytics.paraProgress.totalMemorized > 0) {
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#27ae60')
       .text('Current Progress:', 50, doc.y);

    doc.y += 15;

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#34495e')
       .text(`Total Paras Memorized: ${analytics.paraProgress.totalMemorized}/30`, 70, doc.y);

    doc.y += 15;

    doc.text(`Completion: ${analytics.paraProgress.overallCompletionPercentage.toFixed(1)}%`, 70, doc.y);

    doc.y += 25;
  }

  // Recommendation box
  doc.rect(50, doc.y, 495, 80)
     .fillColor('#f8f9fa')
     .fill();

  doc.rect(50, doc.y, 495, 80)
     .strokeColor('#bdc3c7')
     .stroke();

  doc.fontSize(11)
     .font('Helvetica-Bold')
     .fillColor('#2c3e50')
     .text('📝 Recommendations:', 65, doc.y + 15);

  doc.fontSize(9)
     .font('Helvetica')
     .fillColor('#34495e')
     .text('1. Start recording daily progress using the "Record Progress" form', 65, doc.y + 35, {
       width: 475
     });

  doc.text('2. Ensure the student is attending Hifz classes regularly', 65, doc.y + 50, {
    width: 475
  });

  doc.text('3. Track para completion milestones to monitor progress', 65, doc.y + 65, {
    width: 475
  });

  doc.y += 100;
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

// Updated addProgressOverview method
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

  // ⭐ Show overlap warning if detected
  if (analytics.paraProgress.overlaps && analytics.paraProgress.overlaps.length > 0) {
    doc.fontSize(8)
       .font('Helvetica-Oblique')
       .fillColor('#f39c12')
       .text(`⚠️ Note: Para ${analytics.paraProgress.overlaps.join(', ')} overlap detected (counted in "Already Memorized")`, 50, startY + 75);
  }

  // Overall progress bar
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#2c3e50')
     .text('Overall Completion:', 50, startY + 95);

  // Progress bar background
  doc.rect(50, startY + 110, 400, 20)
     .fillColor('#ecf0f1')
     .fill();

  // Progress bar fill
  const completionPercentage = analytics.paraProgress.overallCompletionPercentage;
  const progressWidth = (completionPercentage / 100) * 400;
  
  const barColor = completionPercentage >= 75 ? '#27ae60' :
                  completionPercentage >= 50 ? '#f39c12' :
                  completionPercentage >= 25 ? '#3498db' : '#e74c3c';

  doc.rect(50, startY + 110, progressWidth, 20)
     .fillColor(barColor)
     .fill();

  // Percentage text
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .fillColor('#2c3e50')
     .text(`${completionPercentage}%`, 455, startY + 113);

  // Projection
  let currentY = startY + 140;
  
  if (analytics.projection.estimatedDaysToComplete) {
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#34495e')
       .text(`Estimated Days to Complete: ${analytics.projection.estimatedDaysToComplete}`, 50, currentY);
    
    currentY += 15;
    
    if (analytics.projection.estimatedCompletionDate) {
      const completionDate = new Date(analytics.projection.estimatedCompletionDate);
      doc.text(`Projected Completion: ${completionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, 50, currentY);
      
      currentY += 15;
    }
    
    // ⭐ Add time description if available
    if (analytics.projection.timeDescription) {
      doc.fontSize(8)
         .font('Helvetica-Oblique')
         .fillColor('#7f8c8d')
         .text(`(About ${analytics.projection.timeDescription})`, 50, currentY);
      
      currentY += 15;
    }
  }

  // ⭐ Add milestone achievement
  const totalMemorizedParas = alreadyMemorized + completed;
  const milestones = HifzCalculationHelper.getMilestones(totalMemorizedParas);
  
  if (milestones.lastAchieved) {
    currentY += 5;
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('#27ae60')
       .text(`🌟 Achievement: ${milestones.lastAchieved.description}`, 50, currentY);
    
    currentY += 15;
  }
  
  if (milestones.nextMilestone && milestones.parasToNextMilestone <= 5) {
    doc.fontSize(8)
       .font('Helvetica-Oblique')
       .fillColor('#3498db')
       .text(`📍 Next Goal: ${milestones.nextMilestone.description} (${milestones.parasToNextMilestone} Para${milestones.parasToNextMilestone !== 1 ? 's' : ''} away)`, 50, currentY);
    
    currentY += 15;
  }

  doc.y = currentY + 10;
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