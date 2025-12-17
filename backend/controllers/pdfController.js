const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const prisma = require('../db/prismaClient');

class PDFController {
  // Generate student list PDF
  async generateStudentListPDF(req, res) {
    try {
      const { classRoomId, classType } = req.query;

      console.log(`📋 [PDF Student List] ClassRoomId: ${classRoomId}, ClassType: ${classType}`);

      // Build where clause for students
      const studentWhere = {
        role: 'STUDENT',
        status: 'ACTIVE'
      };

      // Get students with their details
      const students = await prisma.user.findMany({
        where: studentWhere,
        include: {
          studentProfile: {
            include: {
              currentEnrollment: {
                include: {
                  classRoom: {
                    include: {
                      subjects: {
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
                  }
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      // Filter students
      let filteredStudents = students.filter(student => 
        student.studentProfile?.currentEnrollment
      );

      if (classRoomId) {
        filteredStudents = filteredStudents.filter(student =>
          student.studentProfile?.currentEnrollment?.classRoomId === classRoomId
        );
      }

      if (classType) {
        filteredStudents = filteredStudents.filter(student =>
          student.studentProfile?.currentEnrollment?.classRoom?.type === classType
        );
      }

      if (filteredStudents.length === 0) {
        return res.status(404).json({ 
          error: 'No active students found with the specified criteria' 
        });
      }

      // Group students by class
      const studentsByClass = {};
      filteredStudents.forEach(student => {
        const classRoom = student.studentProfile.currentEnrollment.classRoom;
        const className = `${classRoom.name} - ${classRoom.type}`;
        
        if (!studentsByClass[className]) {
          studentsByClass[className] = {
            classRoom: classRoom,
            students: []
          };
        }
        
        studentsByClass[className].students.push({
          rollNumber: student.studentProfile.currentEnrollment.rollNumber,
          name: student.name,
          fatherName: student.studentProfile.guardianName || 'N/A',
          subjects: classRoom.subjects.map(subject => ({
            name: subject.name,
            teacher: subject.teacher?.user?.name || 'N/A'
          }))
        });
      });

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="student-list-${Date.now()}.pdf"`);

      // Pipe PDF to response
      doc.pipe(res);

      // Add header with institute name
      this.addHeader(doc, "Jamia Abi Bakar (R.A)", "Student List Report");

      // Add generation date
      const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      doc.fontSize(10)
         .fillColor('#666666')
         .text(`Generated on: ${currentDate}`, {
           align: 'right'
         })
         .moveDown(0.5);

      // Add summary
      doc.fontSize(11)
         .fillColor('#333333')
         .text('Report Summary:', {
           underline: true
         })
         .moveDown(0.3);

      doc.fontSize(10)
         .text(`• Total Classes: ${Object.keys(studentsByClass).length}`)
         .text(`• Total Students: ${filteredStudents.length}`);
      
      if (classRoomId) {
        const classRoom = filteredStudents[0]?.studentProfile?.currentEnrollment?.classRoom;
        if (classRoom) {
          doc.text(`• Class: ${classRoom.name} (${classRoom.type})`);
        }
      }
      
      if (classType) {
        doc.text(`• Class Type: ${classType}`);
      }

      doc.moveDown(1);

      // Create table for each class
      Object.keys(studentsByClass).forEach((className, classIndex) => {
        const classData = studentsByClass[className];
        
        if (classIndex > 0) {
          doc.addPage();
        }

        // Class header
        doc.fontSize(14)
           .fillColor('#2c3e50')
           .text(className, {
             align: 'center',
             underline: true
           })
           .moveDown(0.5);

        // Class teacher
        if (classData.classRoom.teacher) {
          doc.fontSize(10)
             .fillColor('#34495e')
             .text(`Class Teacher: ${classData.classRoom.teacher.user.name}`)
             .moveDown(0.5);
        }

        // Create table
        const tableTop = doc.y;
        const tableLeft = 50;
        const columnWidths = [60, 200, 150, 150]; // Adjust based on your needs
        
        // Table headers
        doc.fontSize(10)
           .fillColor('#ffffff')
           .rect(tableLeft, tableTop, columnWidths.reduce((a, b) => a + b, 0), 20)
           .fill('#2c3e50');
        
        let currentX = tableLeft;
        ['Roll No', 'Student Name', "Father's Name", "Subjects"].forEach((header, i) => {
          doc.text(header, currentX + 5, tableTop + 5, {
            width: columnWidths[i] - 10,
            align: 'left'
          });
          currentX += columnWidths[i];
        });

        // Table rows
        let yPosition = tableTop + 20;
        classData.students.forEach((student, index) => {
          // Alternate row colors
          if (index % 2 === 0) {
            doc.fillColor('#f8f9fa')
               .rect(tableLeft, yPosition, columnWidths.reduce((a, b) => a + b, 0), 40)
               .fill();
          }

          // Reset text color
          doc.fillColor('#333333');

          // Roll Number
          doc.text(student.rollNumber.toString(), tableLeft + 5, yPosition + 10, {
            width: columnWidths[0] - 10,
            align: 'center'
          });

          // Student Name
          doc.text(student.name, tableLeft + columnWidths[0] + 5, yPosition + 10, {
            width: columnWidths[1] - 10
          });

          // Father's Name
          doc.text(student.fatherName, tableLeft + columnWidths[0] + columnWidths[1] + 5, yPosition + 10, {
            width: columnWidths[2] - 10
          });

          // Subjects
          let subjectY = yPosition + 10;
          student.subjects.forEach(subject => {
            doc.fontSize(9)
               .text(`${subject.name}`, tableLeft + columnWidths[0] + columnWidths[1] + columnWidths[2] + 5, subjectY, {
                 width: columnWidths[3] - 10
               });
            doc.fontSize(8)
               .fillColor('#666666')
               .text(`(${subject.teacher})`, tableLeft + columnWidths[0] + columnWidths[1] + columnWidths[2] + 5, subjectY + 12, {
                 width: columnWidths[3] - 10
               });
            subjectY += 20;
            doc.fillColor('#333333');
          });

          yPosition += 40;
        });

        // Add class summary at bottom
        doc.moveDown(2);
        doc.fontSize(10)
           .fillColor('#27ae60')
           .text(`Total Students in ${className}: ${classData.students.length}`, {
             align: 'right'
           });
      });

      // Add footer on last page
      this.addFooter(doc);

      // Finalize PDF
      doc.end();

    } catch (error) {
      console.error('❌ Generate PDF error:', error);
      res.status(500).json({ 
        error: 'Failed to generate PDF',
        details: error.message 
      });
    }
  }

  // Generate attendance report PDF
  async generateAttendanceReportPDF(req, res) {
    try {
      const { startDate, endDate, classRoomId } = req.query;

      // Default to last 30 days
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);

      const start = startDate ? new Date(startDate) : defaultStartDate;
      const end = endDate ? new Date(endDate) : defaultEndDate;

      // Get attendance data
      const where = {
        date: {
          gte: start,
          lte: end
        }
      };

      if (classRoomId) {
        where.classRoomId = classRoomId;
      }

      const attendanceRecords = await prisma.attendance.findMany({
        where,
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
          classRoom: {
            select: {
              name: true,
              type: true
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
        },
        orderBy: {
          date: 'desc'
        }
      });

      if (attendanceRecords.length === 0) {
        return res.status(404).json({ 
          error: 'No attendance records found for the specified period' 
        });
      }

      // Calculate statistics
      const totalRecords = attendanceRecords.length;
      const presentCount = attendanceRecords.filter(a => a.status === 'PRESENT').length;
      const absentCount = attendanceRecords.filter(a => a.status === 'ABSENT').length;
      const lateCount = attendanceRecords.filter(a => a.status === 'LATE').length;
      const excusedCount = attendanceRecords.filter(a => a.status === 'EXCUSED').length;
      const attendancePercentage = totalRecords > 0 ? 
        ((presentCount + lateCount) / totalRecords * 100).toFixed(2) : 0;

      // Create PDF
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${Date.now()}.pdf"`);

      doc.pipe(res);

      // Add header
      this.addHeader(doc, "Jamia Abi Bakar (R.A)", "Attendance Report");

      // Report period
      doc.fontSize(10)
         .fillColor('#666666')
         .text(`Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`, {
           align: 'right'
         })
         .moveDown(1);

      // Summary section
      doc.fontSize(12)
         .fillColor('#333333')
         .text('Attendance Summary:', {
           underline: true
         })
         .moveDown(0.5);

      doc.fontSize(10)
         .text(`• Total Records: ${totalRecords}`)
         .text(`• Present: ${presentCount} (${(presentCount/totalRecords*100).toFixed(1)}%)`)
         .text(`• Absent: ${absentCount} (${(absentCount/totalRecords*100).toFixed(1)}%)`)
         .text(`• Late: ${lateCount} (${(lateCount/totalRecords*100).toFixed(1)}%)`)
         .text(`• Excused: ${excusedCount} (${(excusedCount/totalRecords*100).toFixed(1)}%)`)
         .text(`• Overall Attendance: ${attendancePercentage}%`)
         .moveDown(1);

      // Table for attendance records
      const tableTop = doc.y;
      const tableLeft = 50;
      const columnWidths = [80, 150, 100, 80, 100];

      // Table header
      doc.fontSize(10)
         .fillColor('#ffffff')
         .rect(tableLeft, tableTop, columnWidths.reduce((a, b) => a + b, 0), 20)
         .fill('#2c3e50');

      let currentX = tableLeft;
      ['Date', 'Student', 'Class', 'Status', 'Marked By'].forEach((header, i) => {
        doc.text(header, currentX + 5, tableTop + 5, {
          width: columnWidths[i] - 10,
          align: 'left'
        });
        currentX += columnWidths[i];
      });

      // Table rows
      let yPosition = tableTop + 20;
      attendanceRecords.forEach((record, index) => {
        if (index % 2 === 0) {
          doc.fillColor('#f8f9fa')
             .rect(tableLeft, yPosition, columnWidths.reduce((a, b) => a + b, 0), 20)
             .fill();
        }

        doc.fillColor('#333333');

        // Date
        doc.text(record.date.toLocaleDateString(), tableLeft + 5, yPosition + 5, {
          width: columnWidths[0] - 10
        });

        // Student Name
        doc.text(record.student.user.name, tableLeft + columnWidths[0] + 5, yPosition + 5, {
          width: columnWidths[1] - 10
        });

        // Class
        doc.text(record.classRoom.name, tableLeft + columnWidths[0] + columnWidths[1] + 5, yPosition + 5, {
          width: columnWidths[2] - 10
        });

        // Status with color coding
        let statusColor = '#333333';
        switch(record.status) {
          case 'PRESENT': statusColor = '#27ae60'; break;
          case 'ABSENT': statusColor = '#e74c3c'; break;
          case 'LATE': statusColor = '#f39c12'; break;
          case 'EXCUSED': statusColor = '#3498db'; break;
        }
        
        doc.fillColor(statusColor)
           .text(record.status, tableLeft + columnWidths[0] + columnWidths[1] + columnWidths[2] + 5, yPosition + 5, {
             width: columnWidths[3] - 10
           });

        // Marked By
        doc.fillColor('#333333')
           .text(record.teacher.user.name, tableLeft + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + 5, yPosition + 5, {
             width: columnWidths[4] - 10
           });

        yPosition += 20;

        // Add new page if needed
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      });

      // Add footer
      this.addFooter(doc);

      doc.end();

    } catch (error) {
      console.error('❌ Generate attendance PDF error:', error);
      res.status(500).json({ 
        error: 'Failed to generate attendance report',
        details: error.message 
      });
    }
  }

  // Generate teacher report PDF
  async generateTeacherReportPDF(req, res) {
    try {
      const { status } = req.query;

      const where = {
        role: 'TEACHER'
      };

      if (status) {
        where.status = status;
      }

      const teachers = await prisma.user.findMany({
        where,
        include: {
          teacherProfile: {
            include: {
              classes: {
                select: {
                  name: true,
                  type: true
                }
              },
              subjects: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      if (teachers.length === 0) {
        return res.status(404).json({ 
          error: 'No teachers found' 
        });
      }

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="teacher-report-${Date.now()}.pdf"`);

      doc.pipe(res);

      // Add header
      this.addHeader(doc, "Jamia Abi Bakar (R.A)", "Teacher Report");

      // Summary
      doc.fontSize(10)
         .fillColor('#666666')
         .text(`Total Teachers: ${teachers.length}`, {
           align: 'right'
         })
         .moveDown(1);

      // Teacher details
      const tableTop = doc.y;
      const tableLeft = 50;
      const columnWidths = [50, 150, 120, 150, 80];

      // Table header
      doc.fontSize(10)
         .fillColor('#ffffff')
         .rect(tableLeft, tableTop, columnWidths.reduce((a, b) => a + b, 0), 20)
         .fill('#2c3e50');

      let currentX = tableLeft;
      ['No.', 'Name', 'Contact', 'Specialization', 'Status'].forEach((header, i) => {
        doc.text(header, currentX + 5, tableTop + 5, {
          width: columnWidths[i] - 10,
          align: 'left'
        });
        currentX += columnWidths[i];
      });

      // Table rows
      let yPosition = tableTop + 20;
      teachers.forEach((teacher, index) => {
        if (index % 2 === 0) {
          doc.fillColor('#f8f9fa')
             .rect(tableLeft, yPosition, columnWidths.reduce((a, b) => a + b, 0), 30)
             .fill();
        }

        doc.fillColor('#333333');

        // Serial Number
        doc.text((index + 1).toString(), tableLeft + 5, yPosition + 10, {
          width: columnWidths[0] - 10,
          align: 'center'
        });

        // Name
        doc.text(teacher.name, tableLeft + columnWidths[0] + 5, yPosition + 10, {
          width: columnWidths[1] - 10
        });

        // Contact
        doc.text(teacher.phone || 'N/A', tableLeft + columnWidths[0] + columnWidths[1] + 5, yPosition + 10, {
          width: columnWidths[2] - 10
        });

        // Specialization
        const specialization = teacher.teacherProfile?.specialization || 'N/A';
        doc.text(specialization, tableLeft + columnWidths[0] + columnWidths[1] + columnWidths[2] + 5, yPosition + 10, {
          width: columnWidths[3] - 10
        });

        // Status with color
        let statusColor = teacher.status === 'ACTIVE' ? '#27ae60' : 
                         teacher.status === 'INACTIVE' ? '#f39c12' : 
                         '#e74c3c';
        doc.fillColor(statusColor)
           .text(teacher.status, tableLeft + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + 5, yPosition + 10, {
             width: columnWidths[4] - 10,
             align: 'center'
           });

        // Subjects and classes (smaller text below)
        if (teacher.teacherProfile) {
          const subjects = teacher.teacherProfile.subjects.map(s => s.name).join(', ');
          const classes = teacher.teacherProfile.classes.map(c => c.name).join(', ');
          
          doc.fontSize(8)
             .fillColor('#666666')
             .text(`Subjects: ${subjects || 'N/A'}`, tableLeft + columnWidths[0] + 5, yPosition + 25, {
               width: columnWidths[1] + columnWidths[2] + columnWidths[3] - 15
             });
             
          doc.text(`Classes: ${classes || 'N/A'}`, tableLeft + columnWidths[0] + columnWidths[1] + columnWidths[2] + 5, yPosition + 25, {
            width: columnWidths[3] + columnWidths[4] - 15
          });
        }

        yPosition += 40;

        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      });

      // Add footer
      this.addFooter(doc);

      doc.end();

    } catch (error) {
      console.error('❌ Generate teacher PDF error:', error);
      res.status(500).json({ 
        error: 'Failed to generate teacher report',
        details: error.message 
      });
    }
  }

  // Generate financial report PDF (if you have fee data)
  async generateFinancialReportPDF(req, res) {
    try {
      const { month, year } = req.query;
      
      // This is a template - you'll need to implement based on your fee structure
      const currentDate = new Date();
      const reportMonth = month || currentDate.getMonth() + 1;
      const reportYear = year || currentDate.getFullYear();

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="financial-report-${reportMonth}-${reportYear}.pdf"`);

      doc.pipe(res);

      // Add header
      this.addHeader(doc, "Jamia Abi Bakar (R.A)", "Financial Report");

      // Report period
      doc.fontSize(10)
         .fillColor('#666666')
         .text(`Month: ${reportMonth}/${reportYear}`, {
           align: 'right'
         })
         .moveDown(1);

      // Financial summary placeholder
      doc.fontSize(12)
         .fillColor('#333333')
         .text('Financial Summary:', {
           underline: true
         })
         .moveDown(0.5);

      doc.fontSize(10)
         .text('• Total Fees Collected: [Amount]')
         .text('• Pending Fees: [Amount]')
         .text('• Total Expenses: [Amount]')
         .text('• Net Balance: [Amount]')
         .moveDown(1);

      // Note for implementation
      doc.fontSize(9)
         .fillColor('#e74c3c')
         .text('Note: This report requires implementation of fee collection system.', {
           align: 'center'
         });

      // Add footer
      this.addFooter(doc);

      doc.end();

    } catch (error) {
      console.error('❌ Generate financial PDF error:', error);
      res.status(500).json({ 
        error: 'Failed to generate financial report',
        details: error.message 
      });
    }
  }

  // Generate custom report PDF
  async generateCustomReportPDF(req, res) {
    try {
      const { title, data, columns } = req.body;

      if (!title || !data || !Array.isArray(data)) {
        return res.status(400).json({
          error: 'Title and data array are required'
        });
      }

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="custom-report-${Date.now()}.pdf"`);

      doc.pipe(res);

      // Add header
      this.addHeader(doc, "Jamia Abi Bakar (R.A)", title);

      // Report details
      const currentDate = new Date().toLocaleDateString();
      doc.fontSize(10)
         .fillColor('#666666')
         .text(`Generated on: ${currentDate}`, {
           align: 'right'
         })
         .moveDown(1);

      // Calculate column widths
      const tableLeft = 50;
      const pageWidth = 595.28; // A4 width in points
      const availableWidth = pageWidth - (tableLeft * 2);
      const columnCount = columns ? columns.length : Object.keys(data[0] || {}).length;
      const columnWidth = availableWidth / columnCount;

      // Create table
      const tableTop = doc.y;

      // Table header
      if (columns && Array.isArray(columns)) {
        doc.fontSize(10)
           .fillColor('#ffffff')
           .rect(tableLeft, tableTop, availableWidth, 20)
           .fill('#2c3e50');

        let currentX = tableLeft;
        columns.forEach((column, i) => {
          doc.text(column.header || column, currentX + 5, tableTop + 5, {
            width: columnWidth - 10,
            align: 'left'
          });
          currentX += columnWidth;
        });
      }

      // Table rows
      let yPosition = tableTop + 20;
      data.forEach((row, index) => {
        if (index % 2 === 0) {
          doc.fillColor('#f8f9fa')
             .rect(tableLeft, yPosition, availableWidth, 20)
             .fill();
        }

        doc.fillColor('#333333');

        let currentX = tableLeft;
        
        if (columns && Array.isArray(columns)) {
          columns.forEach((column, i) => {
            const value = row[column.field] || row[i] || '';
            doc.text(value.toString(), currentX + 5, yPosition + 5, {
              width: columnWidth - 10
            });
            currentX += columnWidth;
          });
        } else {
          // Use object keys
          Object.values(row).forEach((value, i) => {
            doc.text(value.toString(), currentX + 5, yPosition + 5, {
              width: columnWidth - 10
            });
            currentX += columnWidth;
          });
        }

        yPosition += 20;

        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      });

      // Add footer
      this.addFooter(doc);

      doc.end();

    } catch (error) {
      console.error('❌ Generate custom PDF error:', error);
      res.status(500).json({ 
        error: 'Failed to generate custom report',
        details: error.message 
      });
    }
  }

  // Helper method to add header to PDF
  addHeader(doc, instituteName, reportTitle) {
    // Institute Logo/Header
    doc.fontSize(24)
       .fillColor('#2c3e50')
       .font('Helvetica-Bold')
       .text(instituteName, {
         align: 'center'
       })
       .moveDown(0.5);

    // Report Title
    doc.fontSize(18)
       .fillColor('#34495e')
       .text(reportTitle, {
         align: 'center'
       })
       .moveDown(1);

    // Separator line
    doc.strokeColor('#3498db')
       .lineWidth(2)
       .moveTo(50, doc.y)
       .lineTo(545.28, doc.y)
       .stroke()
       .moveDown(1.5);
  }

  // Helper method to add footer to PDF
  addFooter(doc) {
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Footer line
      doc.strokeColor('#bdc3c7')
         .lineWidth(0.5)
         .moveTo(50, 780)
         .lineTo(545.28, 780)
         .stroke();
      
      // Page number
      doc.fontSize(8)
         .fillColor('#7f8c8d')
         .text(`Page ${i + 1} of ${pageCount}`, 50, 785, {
           align: 'center',
           width: 495.28
         });
      
      // Copyright/institute info
      doc.text('© Jamia Abi Bakar (R.A) - Generated by School Management System', 50, 795, {
         align: 'center',
         width: 495.28
       });
    }
  }
}

module.exports = new PDFController();