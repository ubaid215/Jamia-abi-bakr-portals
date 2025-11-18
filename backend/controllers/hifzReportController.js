const PDFDocument = require('pdfkit');
const prisma = require('../db/prismaClient');
const fs = require('fs');
const path = require('path');

class HifzReportController {
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
              name: true
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

      // Generate PDF
      const pdfBuffer = await this.generatePDF(student, progressRecords, startDate, endDate);

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

  // Generate PDF document
  async generatePDF(student, progressRecords, startDate, endDate) {
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
        this.addSummarySection(doc, progressRecords);

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
  addSummarySection(doc, progressRecords) {
    // Calculate summary statistics
    const totalSabaqLines = progressRecords.reduce((sum, record) => sum + record.sabaqLines, 0);
    const totalSabqiLines = progressRecords.reduce((sum, record) => sum + record.sabqiLines, 0);
    const totalMistakes = progressRecords.reduce((sum, record) => sum + record.mistakes, 0);
    const totalDays = progressRecords.length;
    const averageLinesPerDay = totalDays > 0 ? (totalSabaqLines + totalSabqiLines) / totalDays : 0;

    const latestProgress = progressRecords[progressRecords.length - 1];
    const currentPara = latestProgress.currentPara || 1;
    const completedParas = latestProgress.completedParas ? latestProgress.completedParas.length : 0;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Progress Summary', 50, doc.y);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#34495e');

    // First column
    doc.text(`Total Days: ${totalDays}`, 50, doc.y + 20)
       .text(`Current Para: ${currentPara}`, 50, doc.y + 35)
       .text(`Completed Paras: ${completedParas}`, 50, doc.y + 50);

    // Second column
    doc.text(`Total Sabaq Lines: ${totalSabaqLines}`, 200, doc.y + 20)
       .text(`Total Sabqi Lines: ${totalSabqiLines}`, 200, doc.y + 35)
       .text(`Average Lines/Day: ${averageLinesPerDay.toFixed(1)}`, 200, doc.y + 50);

    // Third column
    doc.text(`Total Mistakes: ${totalMistakes}`, 350, doc.y + 20)
       .text(`Mistake Rate: ${((totalMistakes / (totalSabaqLines + totalSabqiLines)) * 100).toFixed(1)}%`, 350, doc.y + 35);

    doc.y += 80;
  }

  // Add progress table
  addProgressTable(doc, progressRecords) {
    // Table Header
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .rect(50, doc.y, 495, 20)
       .fill('#2c3e50');

    doc.text('Date', 55, doc.y + 5)
       .text('Sabaq', 120, doc.y + 5)
       .text('Mistakes', 170, doc.y + 5)
       .text('Sabqi', 230, doc.y + 5)
       .text('Mistakes', 280, doc.y + 5)
       .text('Manzil', 340, doc.y + 5)
       .text('Mistakes', 420, doc.y + 5)
       .text('Condition', 480, doc.y + 5);

    doc.y += 25;

    // Table Rows
    let rowY = doc.y;
    const rowHeight = 15;
    const maxRowsPerPage = 20;
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
      doc.text(new Date(record.date).toLocaleDateString(), 55, rowY + 4);

      // Sabaq
      doc.text(record.sabaqLines.toString(), 125, rowY + 4, { width: 30, align: 'center' });

      // Sabaq Mistakes (should be 0 as per requirement)
      const sabaqMistakes = record.mistakes > 0 && record.sabaqLines > 0 ? record.mistakes : 0;
      doc.text(sabaqMistakes.toString(), 175, rowY + 4, { width: 30, align: 'center' });

      // Sabqi
      doc.text(record.sabqiLines.toString(), 235, rowY + 4, { width: 30, align: 'center' });

      // Sabqi Mistakes
      const sabqiMistakes = record.sabqiLines > 0 ? record.mistakes : 0;
      doc.text(sabqiMistakes > 2 ? `${sabqiMistakes} ⚠️` : sabqiMistakes.toString(), 285, rowY + 4, { width: 30, align: 'center' });

      // Manzil
      doc.text(record.manzilPara || '-', 345, rowY + 4, { width: 60, align: 'center' });

      // Manzil Mistakes
      const manzilMistakes = record.manzilPara ? record.mistakes : 0;
      doc.text(manzilMistakes > 2 ? `${manzilMistakes} ⚠️` : manzilMistakes.toString(), 425, rowY + 4, { width: 30, align: 'center' });

      // Condition
      const condition = this.determineCondition(record);
      doc.text(condition, 485, rowY + 4, { width: 50, align: 'center' });

      rowY += rowHeight;
      rowCount++;
      doc.y = rowY;
    });

    doc.y += 10;
  }

  // Add table header on new page
  addTableHeaderOnNewPage(doc) {
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .rect(50, 50, 495, 20)
       .fill('#2c3e50');

    doc.text('Date', 55, 55)
       .text('Sabaq', 120, 55)
       .text('Mistakes', 170, 55)
       .text('Sabqi', 230, 55)
       .text('Mistakes', 280, 55)
       .text('Manzil', 340, 55)
       .text('Mistakes', 420, 55)
       .text('Condition', 480, 55);

    doc.y = 80;
  }

  // Determine condition based on mistakes
  determineCondition(record) {
    if (record.sabaqLines > 0 && record.mistakes > 0) {
      return 'Review Sabaq';
    } else if (record.sabqiLines > 0 && record.mistakes > 2) {
      return 'Focus Sabqi';
    } else if (record.manzilPara && record.mistakes > 2) {
      return 'Focus Manzil';
    } else if (record.mistakes === 0) {
      return 'Excellent';
    } else {
      return 'Good';
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
       .text(`Page ${doc.page.number}`, 50, footerY + 12, { align: 'center' });
  }

  // Auto-generate report when progress is recorded (to be called from progressController)
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
                name: true
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

        const pdfBuffer = await this.generatePDF(
          student, 
          progressRecords, 
          thirtyDaysAgo.toISOString().split('T')[0],
          new Date().toISOString().split('T')[0]
        );

        // Save PDF to storage (you can modify this to save to your preferred storage)
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
          fileName
        };
      }

      return { success: false, message: 'No progress records found' };
    } catch (error) {
      console.error('Auto-generate report error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new HifzReportController();