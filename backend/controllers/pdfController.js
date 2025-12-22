const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const prisma = require('../db/prismaClient');

class PDFController {
  
  // ============================================
  // STUDENT PROGRESS REPORT PDF
  // ============================================
  async generateStudentProgressReport(req, res) {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    console.log('📄 Generating student progress report for:', studentId);
    console.log('⏱ Date Range:', startDate, 'to', endDate);

    // Find student
    let student = await prisma.student.findFirst({
      where: { userId: studentId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, profileImage: true } },
        currentEnrollment: {
          include: {
            classRoom: {
              include: {
                teacher: { include: { user: { select: { name: true, phone: true } } } },
                subjects: { include: { teacher: { include: { user: { select: { name: true } } } } } }
              }
            }
          }
        },
        parents: { include: { user: { select: { name: true, email: true, phone: true } } } }
      }
    });

    console.log('🔍 Student found (by userId)?', !!student);

    if (!student) {
      student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, profileImage: true } },
          currentEnrollment: {
            include: {
              classRoom: {
                include: {
                  teacher: { include: { user: { select: { name: true, phone: true } } } },
                  subjects: { include: { teacher: { include: { user: { select: { name: true } } } } } }
                }
              }
            }
          },
          parents: { include: { user: { select: { name: true, email: true, phone: true } } } }
        }
      });
      console.log('🔍 Student found (by id)?', !!student);
    }

    if (!student) {
      console.warn('⚠️ Student not found:', studentId);
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get attendance data
    const attendanceWhere = { studentId: student.id };
    if (startDate && endDate) {
      attendanceWhere.date = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    console.log('📊 Fetching attendances with filter:', attendanceWhere);
    const attendances = await prisma.attendance.findMany({
      where: attendanceWhere,
      include: { subject: { select: { name: true } } },
      orderBy: { date: 'desc' }
    });
    console.log(`📊 Total attendance records found: ${attendances.length}`);

    // Calculate attendance statistics
    const totalAttendance = attendances.length;
    const presentCount = attendances.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendancePercentage = totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(2) : 0;
    console.log(`✅ Attendance - Total: ${totalAttendance}, Present: ${presentCount}, Percentage: ${attendancePercentage}%`);

    // Get progress based on class type
    let progressData = null;
    if (student.currentEnrollment) {
      const classType = student.currentEnrollment.classRoom.type;
      console.log('📚 Student class type:', classType);

      if (classType === 'HIFZ') {
        const hifzProgress = await prisma.hifzProgress.findMany({ where: { studentId: student.id }, orderBy: { date: 'desc' }, take: 10 });
        console.log('📄 HIFZ progress records found:', hifzProgress.length);
        const totalLines = hifzProgress.reduce((sum, p) => sum + p.sabaqLines, 0);
        progressData = {
          type: 'HIFZ',
          records: hifzProgress,
          summary: { totalLines, currentPara: hifzProgress[0]?.currentPara || 1, completionPercentage: ((totalLines / 540) * 100).toFixed(2) }
        };
      } else if (classType === 'NAZRA') {
        const nazraProgress = await prisma.nazraProgress.findMany({ where: { studentId: student.id }, orderBy: { date: 'desc' }, take: 10 });
        console.log('📄 NAZRA progress records found:', nazraProgress.length);
        const totalLines = nazraProgress.reduce((sum, p) => sum + p.recitedLines, 0);
        progressData = { type: 'NAZRA', records: nazraProgress, summary: { totalLines, completionPercentage: ((totalLines / 540) * 100).toFixed(2) } };
      } else if (classType === 'REGULAR') {
        const subjectProgress = await prisma.subjectProgress.findMany({
          where: { studentId: student.id },
          include: { subject: { select: { name: true } } },
          orderBy: { date: 'desc' },
          take: 20
        });
        console.log('📄 REGULAR subject progress records found:', subjectProgress.length);
        const avgResult = await prisma.subjectProgress.aggregate({ where: { studentId: student.id }, _avg: { percentage: true } });
        progressData = { type: 'REGULAR', records: subjectProgress, summary: { averagePercentage: (avgResult._avg.percentage || 0).toFixed(2), totalAssessments: subjectProgress.length } };
      }
    }

    console.log('📝 Progress data prepared:', progressData ? progressData.type : 'No progress data');

    // PDF generation logs
    console.log('📄 Generating PDF...');
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=student-report-${student.admissionNo}.pdf`);
    doc.pipe(res);

    this.addHeader(doc, 'STUDENT PROGRESS REPORT');
    console.log('📄 PDF header added');

    // Footer log
    doc.on('end', () => console.log('✅ PDF generation completed and sent to client'));

    doc.end();

  } catch (error) {
    console.error('❌ Generate student progress report error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate report', details: error.message });
    }
  }
}


  // ============================================
  // EXAM MARK SHEET PDF
  // ============================================
  async generateExamMarkSheet(req, res) {
    try {
      const { classRoomId } = req.params;
      const { examName, examDate, subjectName, totalMarks } = req.query;

      console.log('📄 Generating exam mark sheet for class:', classRoomId);

      // Get class details with enrolled students
      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId },
        include: {
          teacher: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          },
          enrollments: {
            where: { isCurrent: true },
            include: {
              student: {
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
              rollNumber: 'asc'
            }
          }
        }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class not found' });
      }

      // Create PDF in landscape for more space
      const doc = new PDFDocument({ 
        margin: 30, 
        size: 'A4',
        layout: 'landscape'
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=exam-marksheet-${classRoom.name.replace(/\s+/g, '-')}.pdf`);
      
      doc.pipe(res);

      // Header
      doc.fontSize(20).fillColor('#1e3a8a').text('EXAMINATION MARK SHEET', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000000');
      doc.text(`Class: ${classRoom.name}  |  Grade: ${classRoom.grade}  |  Type: ${classRoom.type}`, { align: 'center' });
      doc.text(`Class Teacher: ${classRoom.teacher?.user?.name || 'Not Assigned'}`, { align: 'center' });
      
      if (examName) {
        doc.text(`Exam: ${examName}`, { align: 'center' });
      }
      if (examDate) {
        doc.text(`Date: ${new Date(examDate).toLocaleDateString()}`, { align: 'center' });
      }
      if (subjectName) {
        doc.text(`Subject: ${subjectName}`, { align: 'center' });
      }
      if (totalMarks) {
        doc.text(`Total Marks: ${totalMarks}`, { align: 'center' });
      }

      doc.moveDown(1);

      // Draw line
      doc.moveTo(30, doc.y).lineTo(812 - 30, doc.y).stroke();
      doc.moveDown(0.5);

      // Use advanced table for mark sheet
      this.drawAdvancedTable(doc, {
        headers: ['Roll No', 'Student Name', 'Father Name', 'Marks Obtained', 'Grade', 'Remarks'],
        rows: classRoom.enrollments.map(e => [
          e.rollNumber.toString(),
          e.student.user.name,
          e.student.guardianName || 'N/A',
          '_____',
          '_____',
          '__________'
        ]),
        columnWidths: [50, 200, 150, 120, 120, 120],
        headerColor: '#1e3a8a',
        headerBgColor: '#e0e7ff',
        rowColors: ['#ffffff', '#f9fafb'],
        borderColor: '#d1d5db',
        fontSize: 9,
        rowHeight: 30
      });

      // Summary section
      doc.moveDown(2);
      const currentY = doc.y;
      doc.fontSize(10).fillColor('#000000');
      doc.text(`Total Students: ${classRoom.enrollments.length}`, 30, currentY);
      doc.text('_______________________', 500, currentY + 40);
      doc.text("Teacher's Signature", 500, currentY + 60, { align: 'center', width: 200 });

      // Footer
      doc.fontSize(8).fillColor('#6b7280');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 30, 570, { align: 'center', width: 752 });

      doc.end();

    } catch (error) {
      console.error('Generate exam mark sheet error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate mark sheet', details: error.message });
      }
    }
  }

  // ============================================
  // ENHANCED CUSTOM PDF GENERATOR
  // ============================================
 generateCustomPDF = async (req, res) => {
  let doc;

  try {
    const { 
      title, 
      subtitle,
      content, 
      tables, 
      includeDate,
      orientation,
      includeHeader,
      includeFooter,
      headerText,
      footerText,
      pageMargins,
      defaultFontSize,
      theme
    } = req.body;

    console.log('📄 Generating custom PDF:', title);
    console.log('📥 Incoming tables:', JSON.stringify(tables, null, 2));

    if (!title) {
      console.error('❌ Title missing');
      return res.status(400).json({ error: 'Title is required' });
    }

    const themeColors = theme || {
      primary: '#1e3a8a',
      secondary: '#6b7280',
      accent: '#3b82f6',
      headerBg: '#e0e7ff',
      border: '#d1d5db',
      rowAlt: '#f9fafb'
    };

    doc = new PDFDocument({ 
      margin: pageMargins || 50, 
      size: 'A4',
      layout: orientation || 'portrait'
    });

    console.log('📐 PDF created:', {
      margin: pageMargins || 50,
      orientation: orientation || 'portrait'
    });

    const filename = `custom-${title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    /* ================= CONTENT ================= */
    if (Array.isArray(content)) {
      console.log(`🧱 Rendering ${content.length} content blocks`);
    }

    /* ================= TABLES ================= */
    if (Array.isArray(tables)) {
      console.log(`📊 Rendering ${tables.length} tables`);

      tables.forEach((table, tableIndex) => {
        console.log(`➡️ Table #${tableIndex + 1}`, table);

        if (!table?.headers || !table?.rows) {
          console.warn(`⚠️ Table #${tableIndex + 1} missing headers or rows`);
          return;
        }

        console.log(`🧾 Headers count: ${table.headers.length}`);
        console.log(`📐 Column widths:`, table.columnWidths);

        if (
          table.columnWidths &&
          table.columnWidths.length !== table.headers.length
        ) {
          console.error(
            `❌ Column width mismatch in table #${tableIndex + 1}`,
            `headers=${table.headers.length}`,
            `widths=${table.columnWidths.length}`
          );
        }

        console.log(`📦 Rows count: ${table.rows.length}`);

        table.rows.forEach((row, rowIndex) => {
          if (!Array.isArray(row)) {
            console.error(
              `❌ Invalid row format in table #${tableIndex + 1}, row #${rowIndex + 1}`,
              row
            );
            return;
          }

          if (row.length !== table.headers.length) {
            console.error(
              `❌ Cell count mismatch in table #${tableIndex + 1}, row #${rowIndex + 1}`,
              `cells=${row.length}`,
              `headers=${table.headers.length}`
            );
          }
        });

        doc.moveDown(1);

        if (table.title) {
          doc.fontSize(12)
            .fillColor(themeColors.primary)
            .text(table.title, { underline: true });
          doc.moveDown(0.5);
        }

        console.log(`🛠 Drawing table #${tableIndex + 1}`);

        this.drawAdvancedTable(doc, {
          headers: table.headers,
          rows: table.rows,
          columnWidths: table.columnWidths,
          headerColor: table.headerColor || themeColors.primary,
          headerBgColor: table.headerBgColor || themeColors.headerBg,
          rowColors: table.rowColors || ['#fff', themeColors.rowAlt],
          borderColor: table.borderColor || themeColors.border,
          fontSize: table.fontSize || 9,
          columnSettings: table.columnSettings || {}
        });
      });
    }

    doc.end();
    console.log('✅ PDF generation completed successfully');

  } catch (error) {
    console.error('🔥 Generate custom PDF error:', error);

    if (doc && !doc.ended) {
      try { doc.end(); } catch {}
    }

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate PDF',
        message: error.message
      });
    }
  }
};



  // ============================================
  // ENHANCED DATA FETCHING METHODS
  // ============================================

  async getAllStudentsForPDF(req, res) {
    try {
      console.log('📋 Fetching students for PDF dropdown');
      
      const { 
        classId, 
        type, 
        search,
        page = 1,
        limit = 50
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause similar to ClassController
      const where = {};
      
      if (search) {
        where.user = {
          name: { contains: search, mode: 'insensitive' }
        };
      }

      // Filter by class if provided
      if (classId) {
        where.currentEnrollment = {
          classRoomId: classId,
          isCurrent: true
        };
      }

      const [students, total] = await Promise.all([
        prisma.student.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                profileImage: true
              }
            },
            currentEnrollment: {
              include: {
                classRoom: {
                  select: {
                    id: true,
                    name: true,
                    grade: true,
                    section: true,
                    type: true
                  }
                }
              }
            }
          },
          orderBy: {
            user: {
              name: 'asc'
            }
          }
        }),
        prisma.student.count({ where })
      ]);

      // Format the data for frontend
      const formattedStudents = students.map(student => ({
        id: student.id,
        userId: student.userId,
        admissionNo: student.admissionNo || 'N/A',
        user: {
          id: student.user.id,
          name: student.user.name || 'Unknown Student',
          email: student.user.email || '',
          phone: student.user.phone || '',
          profileImage: student.user.profileImage || ''
        },
        guardianName: student.guardianName || '',
        guardianPhone: student.guardianPhone || '',
        currentEnrollment: student.currentEnrollment ? {
          id: student.currentEnrollment.id,
          rollNumber: student.currentEnrollment.rollNumber,
          classRoom: student.currentEnrollment.classRoom
        } : null
      }));

      res.json({
        success: true,
        data: formattedStudents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });

    } catch (error) {
      console.error('❌ Get students for PDF error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch students',
        details: error.message 
      });
    }
  }

  async getAllClassroomsForPDF(req, res) {
    try {
      console.log('📋 Fetching classrooms for PDF dropdown');
      
      const { 
        type,
        teacherId,
        page = 1,
        limit = 20,
        search
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause (similar to ClassController.getClasses)
      const where = {};
      if (type) where.type = type;
      if (teacherId) where.teacherId = teacherId;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { grade: { contains: search, mode: 'insensitive' } },
          { section: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [classrooms, total] = await Promise.all([
        prisma.classRoom.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true
                  }
                }
              }
            },
            _count: {
              select: {
                enrollments: {
                  where: { isCurrent: true }
                },
                subjects: true
              }
            }
          },
          orderBy: [
            { grade: 'asc' },
            { name: 'asc' }
          ]
        }),
        prisma.classRoom.count({ where })
      ]);

      // Format the data for frontend
      const formattedClassrooms = classrooms.map(classroom => ({
        id: classroom.id,
        name: classroom.name || 'Unknown Class',
        grade: classroom.grade || 'N/A',
        section: classroom.section || '',
        type: classroom.type || 'REGULAR',
        description: classroom.description || '',
        teacher: classroom.teacher ? {
          id: classroom.teacher.id,
          user: classroom.teacher.user
        } : null,
        totalStudents: classroom._count.enrollments,
        totalSubjects: classroom._count.subjects,
        createdAt: classroom.createdAt,
        lastRollNumber: classroom.lastRollNumber || 0
      }));

      res.json({
        success: true,
        data: formattedClassrooms,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });

    } catch (error) {
      console.error('❌ Get classrooms for PDF error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch classrooms',
        details: error.message 
      });
    }
  }

  async getPDFStats(req, res) {
    try {
      console.log('📊 Fetching PDF generation stats');
      
      const [
        totalStudents,
        totalTeachers,
        totalClassRooms,
        totalActiveEnrollments
      ] = await Promise.all([
        prisma.student.count(),
        prisma.teacher.count(),
        prisma.classRoom.count(),
        prisma.enrollment.count({ where: { isCurrent: true } })
      ]);

      // Get class type distribution
      const classTypeDistribution = await prisma.classRoom.groupBy({
        by: ['type'],
        _count: {
          id: true
        }
      });

      // Get recent activity from audit logs
      const recentActivities = await prisma.auditLog.findMany({
        where: {
          action: {
            contains: 'PDF'
          },
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      }).catch(() => []); // Gracefully handle if auditLog doesn't exist

      res.json({
        success: true,
        data: {
          totalStudents,
          totalTeachers,
          totalClassRooms,
          totalActiveEnrollments,
          classTypeDistribution: classTypeDistribution.map(ct => ({
            type: ct.type,
            count: ct._count.id
          })),
          recentActivities: recentActivities.map(activity => ({
            action: activity.action,
            user: activity.user?.name || 'System',
            timestamp: activity.createdAt
          }))
        }
      });

    } catch (error) {
      console.error('❌ Get PDF stats error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch PDF stats',
        details: error.message 
      });
    }
  }

  // ============================================
  // CLASS ATTENDANCE SHEET (for manual marking)
  // ============================================
  async generateClassAttendanceSheet(req, res) {
    try {
      const { classRoomId } = req.params;
      const { date, month } = req.query;

      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId },
        include: {
          teacher: {
            include: {
              user: { select: { name: true } }
            }
          },
          enrollments: {
            where: { isCurrent: true },
            include: {
              student: {
                include: {
                  user: { select: { name: true } }
                }
              }
            },
            orderBy: { rollNumber: 'asc' }
          }
        }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class not found' });
      }

      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=attendance-${classRoom.name.replace(/\s+/g, '-')}.pdf`);
      
      doc.pipe(res);

      // Header
      doc.fontSize(18).fillColor('#1e3a8a').text('CLASS ATTENDANCE SHEET', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(12).fillColor('#000000');
      doc.text(`Class: ${classRoom.name}  |  Date: ${date || new Date().toLocaleDateString()}`, { align: 'center' });
      doc.text(`Teacher: ${classRoom.teacher?.user?.name || 'Not Assigned'}`, { align: 'center' });
      doc.moveDown(1);

      // Use advanced table for attendance
      this.drawAdvancedTable(doc, {
        headers: ['Roll', 'Student Name', 'Father Name', 'Present', 'Absent', 'Late', 'Excused', 'Remarks'],
        rows: classRoom.enrollments.map(e => [
          e.rollNumber.toString(),
          e.student.user.name,
          e.student.guardianName || 'N/A',
          '☐',
          '☐',
          '☐',
          '☐',
          '_______'
        ]),
        columnWidths: [40, 180, 120, 60, 60, 60, 60, 120],
        headerColor: '#1e3a8a',
        headerBgColor: '#e0e7ff',
        rowColors: ['#ffffff', '#f9fafb'],
        borderColor: '#d1d5db',
        fontSize: 8,
        rowHeight: 25
      });

      doc.end();

    } catch (error) {
      console.error('Generate attendance sheet error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate attendance sheet' });
      }
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  addHeader(doc, title) {
    doc.fontSize(22).fillColor('#1e3a8a').text(title, { align: 'center' });
    doc.fontSize(12).fillColor('#6b7280').text('Jamia Abi Bakar(R.A)', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#d1d5db');
  }

  addFooter(doc, customText) {
    const bottomY = doc.page.height - 80;
    doc.fontSize(8).fillColor('#6b7280');
    
    if (customText) {
      doc.text(customText, 50, bottomY, { align: 'center', width: doc.page.width - 100 });
    }
    
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, bottomY + 15, { 
      align: 'center', 
      width: doc.page.width - 100 
    });
  }

  /**
   * ENHANCED TABLE DRAWING METHOD
   * Supports full customization of colors, borders, fonts, and column-specific settings
   */
  drawAdvancedTable(doc, options) {
  try {
    console.log('🧱 drawAdvancedTable called');

    const {
      headers,
      rows,
      columnWidths,
      headerColor = '#1e3a8a',
      headerBgColor = '#e0e7ff',
      headerFontSize = 10,
      rowColors = ['#ffffff', '#f9fafb'],
      borderColor = '#d1d5db',
      fontSize = 9,
      rowHeight = 25,
      textAlign = 'left',
      headerTextAlign = 'left',
      cellPadding = 5,
      borderWidth = 1,
      columnSettings = {}
    } = options;

    console.log('📊 Headers:', headers);
    console.log('📦 Rows count:', rows?.length || 0);
    console.log('📐 Incoming columnWidths:', columnWidths);

    const startX = 50;
    let startY = doc.y;

    /* ===============================
       ✅ SAFE COLUMN WIDTH HANDLING
    =============================== */

    let colWidths;
    const isValidColumnWidths =
      Array.isArray(columnWidths) &&
      columnWidths.length === headers.length &&
      columnWidths.every(w => Number.isFinite(w) && w > 0);

    if (isValidColumnWidths) {
      colWidths = columnWidths;
      console.log('✅ Using provided columnWidths:', colWidths);
    } else {
      const totalWidth = doc.page.width - 100;
      colWidths = headers.map(() => totalWidth / headers.length);
      console.warn('⚠️ Invalid/empty columnWidths. Auto-calculated:', colWidths);
    }

    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    console.log('📐 Table width:', tableWidth);

    const colPositions = [startX];
    for (let i = 0; i < colWidths.length - 1; i++) {
      colPositions.push(colPositions[i] + colWidths[i]);
    }

    console.log('📍 Column positions:', colPositions);

    /* ===============================
       🧾 HEADER ROW
    =============================== */

    doc.fontSize(headerFontSize).fillColor(headerColor);
    doc.rect(startX, startY, tableWidth, rowHeight)
      .fillAndStroke(headerBgColor, borderColor);

    headers.forEach((header, i) => {
      const colSettings = columnSettings[i] || {};
      const align = colSettings.headerAlign || headerTextAlign;
      const color = colSettings.headerColor || headerColor;

      const safeWidth = Number.isFinite(colWidths[i])
        ? colWidths[i] - (cellPadding * 2)
        : 50;

      doc.fillColor(color).text(
        header || '',
        colPositions[i] + cellPadding,
        startY + (rowHeight - headerFontSize) / 2,
        { width: safeWidth, align, ellipsis: true }
      );
    });

    /* ===============================
       📄 DATA ROWS
    =============================== */

    let currentY = startY + rowHeight;
    doc.fontSize(fontSize);

    rows.forEach((row, rowIndex) => {
      if (currentY > doc.page.height - 100) {
        console.log('📄 New page added');
        doc.addPage();
        currentY = 50;

        // Redraw header
        doc.fontSize(headerFontSize).fillColor(headerColor);
        doc.rect(startX, currentY, tableWidth, rowHeight)
          .fillAndStroke(headerBgColor, borderColor);

        headers.forEach((header, i) => {
          const safeWidth = Number.isFinite(colWidths[i])
            ? colWidths[i] - (cellPadding * 2)
            : 50;

          doc.text(
            header || '',
            colPositions[i] + cellPadding,
            currentY + (rowHeight - headerFontSize) / 2,
            { width: safeWidth, align: headerTextAlign, ellipsis: true }
          );
        });

        currentY += rowHeight;
        doc.fontSize(fontSize);
      }

      const rowBgColor = rowColors[rowIndex % rowColors.length] || rowColors[0];
      doc.rect(startX, currentY, tableWidth, rowHeight).fill(rowBgColor);

      if (Array.isArray(row)) {
        row.forEach((cell, i) => {
          const colSettings = columnSettings[i] || {};
          const align = colSettings.align || textAlign;
          const color = colSettings.color || '#000000';
          const bold = colSettings.bold || false;

          const safeWidth = Number.isFinite(colWidths[i])
            ? colWidths[i] - (cellPadding * 2)
            : 50;

          if (bold) doc.font('Helvetica-Bold');

          doc.fillColor(color).text(
            cell?.toString() || '',
            colPositions[i] + cellPadding,
            currentY + (rowHeight - fontSize) / 2,
            { width: safeWidth, align, ellipsis: true }
          );

          if (bold) doc.font('Helvetica');
        });
      }

      doc.lineWidth(borderWidth);
      doc.rect(startX, currentY, tableWidth, rowHeight).stroke(borderColor);

      currentY += rowHeight;
    });

    doc.y = currentY + 10;
    console.log('✅ Table rendered successfully');
  } catch (err) {
    console.error('🔥 drawAdvancedTable failed:', err);
    throw err; // important: let controller handle response properly
  }
}


  // Legacy table method for backward compatibility
  drawTable(doc, headers, rows) {
    this.drawAdvancedTable(doc, {
      headers,
      rows
    });
  }
}

module.exports = new PDFController();