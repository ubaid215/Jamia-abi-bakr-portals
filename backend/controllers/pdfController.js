const PDFDocument = require('pdfkit');
const prisma = require('../db/prismaClient');

class PDFController {
  constructor() {
    this.generateStudentProgressReport = this.generateStudentProgressReport.bind(this);
    this.generateExamMarkSheet = this.generateExamMarkSheet.bind(this);
    this.generateCustomPDF = this.generateCustomPDF.bind(this);
    this.getAllStudentsForPDF = this.getAllStudentsForPDF.bind(this);
    this.getAllClassroomsForPDF = this.getAllClassroomsForPDF.bind(this);
    this.getPDFStats = this.getPDFStats.bind(this);
    this.generateClassAttendanceSheet = this.generateClassAttendanceSheet.bind(this);
    this.addHeader = this.addHeader.bind(this);
    this.addFooter = this.addFooter.bind(this);
    this.drawAdvancedTable = this.drawAdvancedTable.bind(this);
    this.drawTable = this.drawTable.bind(this);
  }

  // ============================================
  // STUDENT PROGRESS REPORT PDF
  // ============================================
  async generateStudentProgressReport(req, res) {
    try {
      const { studentId } = req.params;
      const { startDate, endDate } = req.query;

      console.log('📄 Generating student progress report for:', studentId);

      // Try finding by userId first, then by id
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
      }

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Attendance data
      const attendanceWhere = { studentId: student.id };
      if (startDate && endDate) {
        attendanceWhere.date = { gte: new Date(startDate), lte: new Date(endDate) };
      }

      const attendances = await prisma.attendance.findMany({
        where: attendanceWhere,
        include: { subject: { select: { name: true } } },
        orderBy: { date: 'desc' }
      });

      const totalAttendance = attendances.length;
      const presentCount = attendances.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      const attendancePercentage = totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(2) : 0;

      // Progress data
      let progressData = null;
      if (student.currentEnrollment) {
        const classType = student.currentEnrollment.classRoom.type;

        if (classType === 'HIFZ') {
          const hifzProgress = await prisma.hifzProgress.findMany({
            where: { studentId: student.id }, orderBy: { date: 'desc' }, take: 10
          });
          const totalLines = hifzProgress.reduce((sum, p) => sum + p.sabaqLines, 0);
          progressData = {
            type: 'HIFZ', records: hifzProgress,
            summary: { totalLines, currentPara: hifzProgress[0]?.currentPara || 1, completionPercentage: ((totalLines / 540) * 100).toFixed(2) }
          };
        } else if (classType === 'NAZRA') {
          const nazraProgress = await prisma.nazraProgress.findMany({
            where: { studentId: student.id }, orderBy: { date: 'desc' }, take: 10
          });
          const totalLines = nazraProgress.reduce((sum, p) => sum + p.recitedLines, 0);
          progressData = {
            type: 'NAZRA', records: nazraProgress,
            summary: { totalLines, completionPercentage: ((totalLines / 540) * 100).toFixed(2) }
          };
        } else if (classType === 'REGULAR') {
          const subjectProgress = await prisma.subjectProgress.findMany({
            where: { studentId: student.id },
            include: { subject: { select: { name: true } } },
            orderBy: { date: 'desc' }, take: 20
          });
          const avgResult = await prisma.subjectProgress.aggregate({
            where: { studentId: student.id }, _avg: { percentage: true }
          });
          progressData = {
            type: 'REGULAR', records: subjectProgress,
            summary: { averagePercentage: (avgResult._avg.percentage || 0).toFixed(2), totalAssessments: subjectProgress.length }
          };
        }
      }

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=student-report-${student.admissionNo || student.id}.pdf`);
      doc.pipe(res);

      this.addHeader(doc, 'STUDENT PROGRESS REPORT');

      // Student Information
      doc.moveDown(1);
      doc.fontSize(14).fillColor('#1e3a8a').text('Student Information', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000000');
      doc.text(`Name: ${student.user?.name || 'N/A'}`);
      doc.text(`Admission No: ${student.admissionNo || 'N/A'}`);
      doc.text(`Email: ${student.user?.email || 'N/A'}`);
      doc.text(`Phone: ${student.user?.phone || 'N/A'}`);

      if (student.currentEnrollment) {
        doc.moveDown(0.5);
        doc.text(`Class: ${student.currentEnrollment.classRoom?.name || 'N/A'}`);
        doc.text(`Grade: ${student.currentEnrollment.classRoom?.grade || 'N/A'}`);
        doc.text(`Class Type: ${student.currentEnrollment.classRoom?.type || 'N/A'}`);
        doc.text(`Class Teacher: ${student.currentEnrollment.classRoom?.teacher?.user?.name || 'N/A'}`);
      }

      // Attendance Summary
      doc.moveDown(1);
      doc.fontSize(14).fillColor('#1e3a8a').text('Attendance Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000000');
      doc.text(`Total Attendance Records: ${totalAttendance}`);
      doc.text(`Present Days: ${presentCount}`);
      doc.text(`Attendance Percentage: ${attendancePercentage}%`);
      if (startDate || endDate) {
        doc.text(`Date Range: ${startDate || 'Start'} to ${endDate || 'End'}`);
      }

      // Progress Data
      if (progressData) {
        doc.moveDown(1);
        doc.fontSize(14).fillColor('#1e3a8a').text(`${progressData.type} Progress Summary`, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#000000');

        if (progressData.type === 'HIFZ') {
          doc.text(`Total Lines Memorized: ${progressData.summary.totalLines}`);
          doc.text(`Current Para: ${progressData.summary.currentPara}`);
          doc.text(`Completion Percentage: ${progressData.summary.completionPercentage}%`);
          if (progressData.records.length > 0) {
            doc.moveDown(1);
            doc.fontSize(12).fillColor('#1e3a8a').text('Recent Progress Records', { underline: true });
            doc.moveDown(0.5);
            const headers = ['Date', 'Sabaq Lines', 'Sabaq Mistakes', 'Sabqi Lines', 'Sabqi Mistakes'];
            const rows = progressData.records.map(record => [
              new Date(record.date).toLocaleDateString(),
              record.sabaqLines.toString(),
              record.sabaqMistakes?.toString() || '0',
              record.sabqiLines?.toString() || '0',
              record.sabqiMistakes?.toString() || '0'
            ]);
            this.drawTable(doc, headers, rows);
          }
        } else if (progressData.type === 'NAZRA') {
          doc.text(`Total Lines Recited: ${progressData.summary.totalLines}`);
          doc.text(`Completion Percentage: ${progressData.summary.completionPercentage}%`);
        } else if (progressData.type === 'REGULAR') {
          doc.text(`Average Percentage: ${progressData.summary.averagePercentage}%`);
          doc.text(`Total Assessments: ${progressData.summary.totalAssessments}`);
          if (progressData.records.length > 0) {
            doc.moveDown(1);
            doc.fontSize(12).fillColor('#1e3a8a').text('Recent Subject Progress', { underline: true });
            doc.moveDown(0.5);
            const headers = ['Date', 'Subject', 'Marks', 'Total', 'Percentage', 'Grade'];
            const rows = progressData.records.map(r => [
              new Date(r.date).toLocaleDateString(),
              r.subject?.name || 'N/A',
              r.marksObtained?.toString() || 'N/A',
              r.totalMarks?.toString() || 'N/A',
              `${r.percentage?.toFixed(1) || 0}%`,
              r.grade || 'N/A'
            ]);
            this.drawTable(doc, headers, rows);
          }
        }
      }

      // Parents
      if (student.parents && student.parents.length > 0) {
        doc.moveDown(1);
        doc.fontSize(14).fillColor('#1e3a8a').text('Parent/Guardian Information', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#000000');
        student.parents.forEach((parent, index) => {
          if (parent.user) {
            doc.text(`Parent ${index + 1}: ${parent.user.name || 'N/A'}`);
            doc.text(`Email: ${parent.user.email || 'N/A'}`);
            doc.text(`Phone: ${parent.user.phone || 'N/A'}`);
            doc.moveDown(0.3);
          }
        });
      }

      this.addFooter(doc);
      doc.end();

    } catch (error) {
      console.error('❌ Generate student progress report error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate report', details: error.message });
      } else {
        res.end();
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

      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId },
        include: {
          teacher: { include: { user: { select: { name: true } } } },
          enrollments: {
            where: { isCurrent: true },
            include: {
              student: { include: { user: { select: { name: true } } } }
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
      res.setHeader('Content-Disposition', `attachment; filename=exam-marksheet-${classRoom.name.replace(/\s+/g, '-')}.pdf`);
      doc.pipe(res);

      doc.fontSize(20).fillColor('#1e3a8a').text('EXAMINATION MARK SHEET', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000000');
      doc.text(`Class: ${classRoom.name}  |  Grade: ${classRoom.grade}  |  Type: ${classRoom.type}`, { align: 'center' });
      doc.text(`Class Teacher: ${classRoom.teacher?.user?.name || 'Not Assigned'}`, { align: 'center' });
      if (examName) doc.text(`Exam: ${examName}`, { align: 'center' });
      if (examDate) doc.text(`Date: ${new Date(examDate).toLocaleDateString()}`, { align: 'center' });
      if (subjectName) doc.text(`Subject: ${subjectName}`, { align: 'center' });
      if (totalMarks) doc.text(`Total Marks: ${totalMarks}`, { align: 'center' });

      doc.moveDown(1);
      doc.moveTo(30, doc.y).lineTo(812 - 30, doc.y).stroke();
      doc.moveDown(0.5);

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

      doc.moveDown(2);
      const currentY = doc.y;
      doc.fontSize(10).fillColor('#000000');
      doc.text(`Total Students: ${classRoom.enrollments.length}`, 30, currentY);
      doc.text('_______________________', 500, currentY + 40);
      doc.text("Teacher's Signature", 500, currentY + 60, { align: 'center', width: 200 });
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
  // FIX: Now properly renders content blocks (headings, paragraphs, lists)
  //      before tables, with full theme support
  // ============================================
  async generateCustomPDF(req, res) {
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

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const themeColors = {
        primary: '#1e3a8a',
        secondary: '#6b7280',
        accent: '#3b82f6',
        headerBg: '#e0e7ff',
        border: '#d1d5db',
        rowAlt: '#f9fafb',
        ...(theme || {})
      };

      doc = new PDFDocument({
        margin: pageMargins || 50,
        size: 'A4',
        layout: orientation === 'landscape' ? 'landscape' : 'portrait'
      });

      const filename = `custom-${title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      doc.pipe(res);

      /* ===== HEADER ===== */
      if (includeHeader !== false) {
        this.addHeader(doc, title);
        if (subtitle) {
          doc.moveDown(0.3);
          doc.fontSize(12).fillColor(themeColors.secondary).text(subtitle, { align: 'center' });
        }
      } else {
        // Minimal title if no full header
        doc.fontSize(20).fillColor(themeColors.primary).text(title, { align: 'center' });
        if (subtitle) {
          doc.fontSize(12).fillColor(themeColors.secondary).text(subtitle, { align: 'center' });
        }
      }

      if (includeDate !== false) {
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor(themeColors.secondary).text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
      }

      doc.moveDown(1);

      /* ===== CONTENT BLOCKS ===== */
      // FIX: Previously content blocks were never actually rendered in the PDF
      if (Array.isArray(content) && content.length > 0) {
        console.log(`🧱 Rendering ${content.length} content blocks`);

        content.forEach((section, idx) => {
          try {
            const color = section.color || (section.type === 'heading' ? themeColors.primary : '#000000');
            const size = section.size || (section.type === 'heading' ? 14 : 10);
            const align = section.align || 'left';

            if (section.type === 'heading') {
              doc.moveDown(0.5);
              doc.fontSize(size).fillColor(color).font('Helvetica-Bold').text(section.text || '', { align, underline: false });
              doc.font('Helvetica');
              doc.moveDown(0.3);

            } else if (section.type === 'paragraph') {
              doc.fontSize(size).fillColor(color).text(section.text || '', { align, lineGap: 2 });
              doc.moveDown(0.5);

            } else if (section.type === 'list') {
              const items = Array.isArray(section.items) ? section.items : [];
              items.forEach(item => {
                if (item && item.trim()) {
                  doc.fontSize(size).fillColor(color).text(`• ${item}`, {
                    align,
                    indent: 15,
                    lineGap: 2
                  });
                }
              });
              doc.moveDown(0.5);

            } else if (section.type === 'divider') {
              doc.moveDown(0.5);
              doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(themeColors.border).stroke();
              doc.moveDown(0.5);
            }

          } catch (blockErr) {
            console.error(`⚠️ Error rendering content block #${idx}:`, blockErr.message);
          }
        });
      }

      /* ===== TABLES ===== */
      if (Array.isArray(tables) && tables.length > 0) {
        console.log(`📊 Rendering ${tables.length} tables`);

        tables.forEach((table, tableIndex) => {
          if (!table?.headers || !Array.isArray(table.headers) || table.headers.length === 0) {
            console.warn(`⚠️ Table #${tableIndex + 1} missing headers — skipping`);
            return;
          }
          if (!Array.isArray(table.rows)) {
            console.warn(`⚠️ Table #${tableIndex + 1} has no rows array — skipping`);
            return;
          }

          // FIX: Normalize rows to ensure they match header column count
          const colCount = table.headers.length;
          const normalizedRows = table.rows.map(row => {
            if (!Array.isArray(row)) return Array(colCount).fill('');
            if (row.length < colCount) return [...row, ...Array(colCount - row.length).fill('')];
            if (row.length > colCount) return row.slice(0, colCount);
            return row;
          });

          doc.moveDown(1);

          if (table.title) {
            doc.fontSize(12).fillColor(themeColors.primary).font('Helvetica-Bold').text(table.title, { underline: true });
            doc.font('Helvetica');
            doc.moveDown(0.5);
          }

          // FIX: Validate columnWidths length vs header count
          let colWidths = table.columnWidths;
          if (!Array.isArray(colWidths) || colWidths.length !== colCount || !colWidths.every(w => Number.isFinite(w) && w > 0)) {
            const totalWidth = doc.page.width - 100;
            colWidths = Array(colCount).fill(totalWidth / colCount);
            console.warn(`⚠️ Table #${tableIndex + 1}: auto-calculated column widths`);
          }

          this.drawAdvancedTable(doc, {
            headers: table.headers,
            rows: normalizedRows,
            columnWidths: colWidths,
            headerColor: table.headerColor || themeColors.primary,
            headerBgColor: table.headerBgColor || themeColors.headerBg,
            rowColors: Array.isArray(table.rowColors) ? table.rowColors : ['#ffffff', themeColors.rowAlt],
            borderColor: table.borderColor || themeColors.border,
            fontSize: table.fontSize || 9,
            columnSettings: table.columnSettings || {}
          });
        });
      }

      /* ===== FOOTER ===== */
      if (includeFooter !== false) {
        this.addFooter(doc, footerText);
      }

      doc.end();
      console.log('✅ Custom PDF generation completed');

    } catch (error) {
      console.error('🔥 Generate custom PDF error:', error);
      if (doc && !doc.ended) {
        try { doc.end(); } catch (_) {}
      }
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate PDF', message: error.message });
      }
    }
  }

  // ============================================
  // GET ALL STUDENTS FOR PDF
  // FIX: Response shape now matches what PDFContext/frontend expects
  //      Frontend reads: response.data.data — this returns { success, data[], pagination }
  // ============================================
  async getAllStudentsForPDF(req, res) {
    try {
      const { classId, search, page = 1, limit = 100 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {};
      if (search) {
        where.OR = [
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { admissionNo: { contains: search, mode: 'insensitive' } },
          { guardianName: { contains: search, mode: 'insensitive' } }
        ];
      }
      if (classId) {
        where.currentEnrollment = { classRoomId: classId, isCurrent: true };
      }

      const [students, total] = await Promise.all([
        prisma.student.findMany({
          where, skip, take: parseInt(limit),
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, profileImage: true } },
            currentEnrollment: {
              include: {
                classRoom: { select: { id: true, name: true, grade: true, section: true, type: true } }
              }
            }
          },
          orderBy: { user: { name: 'asc' } }
        }),
        prisma.student.count({ where })
      ]);

      // FIX: Consistent data shape that frontend filteredStudents code expects
      const formattedStudents = students.map(student => ({
        id: student.id,
        userId: student.userId,
        admissionNo: student.admissionNo || 'N/A',
        guardianName: student.guardianName || '',
        guardianPhone: student.guardianPhone || '',
        user: {
          id: student.user.id,
          name: student.user.name || 'Unknown Student',
          email: student.user.email || '',
          phone: student.user.phone || '',
          profileImage: student.user.profileImage || ''
        },
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
      res.status(500).json({ success: false, error: 'Failed to fetch students', details: error.message });
    }
  }

  // ============================================
  // GET ALL CLASSROOMS FOR PDF
  // ============================================
  async getAllClassroomsForPDF(req, res) {
    try {
      const { type, teacherId, page = 1, limit = 50, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

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
          where, skip, take: parseInt(limit),
          include: {
            teacher: {
              include: {
                user: { select: { id: true, name: true, email: true, phone: true } }
              }
            },
            _count: {
              select: { enrollments: { where: { isCurrent: true } }, subjects: true }
            }
          },
          orderBy: [{ grade: 'asc' }, { name: 'asc' }]
        }),
        prisma.classRoom.count({ where })
      ]);

      // FIX: Shape matches frontend filter logic which looks at classroom.type, classroom.grade, etc.
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
        teacherName: classroom.teacher?.user?.name || null,
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
      res.status(500).json({ success: false, error: 'Failed to fetch classrooms', details: error.message });
    }
  }

  // ============================================
  // GET PDF STATS
  // FIX: Response uses field names the frontend stats mapping expects:
  //      { students, teachers, classes, reportsThisMonth }
  // ============================================
  async getPDFStats(req, res) {
    try {
      const [totalStudents, totalTeachers, totalClassRooms, totalActiveEnrollments] = await Promise.all([
        prisma.student.count(),
        prisma.teacher.count(),
        prisma.classRoom.count(),
        prisma.enrollment.count({ where: { isCurrent: true } })
      ]);

      const classTypeDistribution = await prisma.classRoom.groupBy({
        by: ['type'],
        _count: { id: true }
      });

      // FIX: Frontend PDFGenerate maps stats.students, stats.teachers, stats.classes, stats.reportsThisMonth
      //      But old controller returned totalStudents, totalTeachers, totalClassRooms
      //      PDFContext.getStats returns the raw data.data object — fix field names here
      res.json({
        success: true,
        data: {
          // Fields that match PDFGenerate component's stats mapping
          students: totalStudents,
          teachers: totalTeachers,
          classes: totalClassRooms,
          reportsThisMonth: 0, // Tracked separately or via audit logs
          // Extra fields still available
          totalActiveEnrollments,
          classTypeDistribution: classTypeDistribution.map(ct => ({
            type: ct.type,
            count: ct._count.id
          }))
        }
      });

    } catch (error) {
      console.error('❌ Get PDF stats error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch PDF stats', details: error.message });
    }
  }

  // ============================================
  // CLASS ATTENDANCE SHEET
  // ============================================
  async generateClassAttendanceSheet(req, res) {
    try {
      const { classRoomId } = req.params;
      const { date } = req.query;

      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId },
        include: {
          teacher: { include: { user: { select: { name: true } } } },
          enrollments: {
            where: { isCurrent: true },
            include: { student: { include: { user: { select: { name: true } } } } },
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

      doc.fontSize(18).fillColor('#1e3a8a').text('CLASS ATTENDANCE SHEET', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(12).fillColor('#000000');
      doc.text(`Class: ${classRoom.name}  |  Date: ${date || new Date().toLocaleDateString()}`, { align: 'center' });
      doc.text(`Teacher: ${classRoom.teacher?.user?.name || 'Not Assigned'}`, { align: 'center' });
      doc.moveDown(1);

      this.drawAdvancedTable(doc, {
        headers: ['Roll', 'Student Name', 'Father Name', 'Present', 'Absent', 'Late', 'Excused', 'Remarks'],
        rows: classRoom.enrollments.map(e => [
          e.rollNumber.toString(),
          e.student.user.name,
          e.student.guardianName || 'N/A',
          '[ ]', '[ ]', '[ ]', '[ ]',
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
    doc.fontSize(22).fillColor('#1e3a8a').font('Helvetica-Bold').text(title, { align: 'center' });
    doc.font('Helvetica');
    doc.fontSize(12).fillColor('#6b7280').text('Jamia Abi Bakar (R.A)', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#d1d5db').stroke();
  }

  addFooter(doc, customText) {
    const bottomY = doc.page.height - 80;
    doc.fontSize(8).fillColor('#6b7280');
    if (customText) {
      doc.text(customText, 50, bottomY, { align: 'center', width: doc.page.width - 100 });
    }
    doc.text(`Generated on: ${new Date().toLocaleString()} | Jamia Abi Bakar (R.A)`, 50, bottomY + 15, {
      align: 'center',
      width: doc.page.width - 100
    });
  }

  drawAdvancedTable(doc, options) {
    try {
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

      const startX = 50;
      let startY = doc.y;

      // Validate and compute column widths
      const isValidWidths =
        Array.isArray(columnWidths) &&
        columnWidths.length === headers.length &&
        columnWidths.every(w => Number.isFinite(w) && w > 0);

      let colWidths;
      if (isValidWidths) {
        colWidths = columnWidths;
      } else {
        const totalWidth = doc.page.width - 100;
        colWidths = headers.map(() => totalWidth / headers.length);
      }

      const tableWidth = colWidths.reduce((a, b) => a + b, 0);

      // Column X positions
      const colPositions = [startX];
      for (let i = 0; i < colWidths.length - 1; i++) {
        colPositions.push(colPositions[i] + colWidths[i]);
      }

      // Draw header row
      doc.fontSize(headerFontSize).font('Helvetica-Bold');
      doc.rect(startX, startY, tableWidth, rowHeight).fillAndStroke(headerBgColor, borderColor);
      headers.forEach((header, i) => {
        const colSettings = columnSettings[i] || {};
        const align = colSettings.headerAlign || headerTextAlign;
        const color = colSettings.headerColor || headerColor;
        const safeWidth = Math.max((colWidths[i] || 50) - cellPadding * 2, 10);

        doc.fillColor(color).text(
          String(header || ''),
          colPositions[i] + cellPadding,
          startY + Math.max((rowHeight - headerFontSize) / 2, 2),
          { width: safeWidth, align, ellipsis: true }
        );
      });
      doc.font('Helvetica');

      // Draw data rows
      let currentY = startY + rowHeight;
      doc.fontSize(fontSize);

      rows.forEach((row, rowIndex) => {
        // Page overflow
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 50;

          // Re-draw header on new page
          doc.fontSize(headerFontSize).font('Helvetica-Bold');
          doc.rect(startX, currentY, tableWidth, rowHeight).fillAndStroke(headerBgColor, borderColor);
          headers.forEach((header, i) => {
            const safeWidth = Math.max((colWidths[i] || 50) - cellPadding * 2, 10);
            doc.fillColor(headerColor).text(
              String(header || ''),
              colPositions[i] + cellPadding,
              currentY + Math.max((rowHeight - headerFontSize) / 2, 2),
              { width: safeWidth, align: headerTextAlign, ellipsis: true }
            );
          });
          doc.font('Helvetica');
          currentY += rowHeight;
          doc.fontSize(fontSize);
        }

        const rowBgColor = rowColors[rowIndex % rowColors.length] || '#ffffff';
        doc.rect(startX, currentY, tableWidth, rowHeight).fill(rowBgColor);

        if (Array.isArray(row)) {
          row.forEach((cell, i) => {
            const colSettings = columnSettings[i] || {};
            const align = colSettings.align || textAlign;
            const color = colSettings.color || '#000000';
            const bold = colSettings.bold || false;
            const safeWidth = Math.max((colWidths[i] || 50) - cellPadding * 2, 10);

            if (bold) doc.font('Helvetica-Bold');
            doc.fillColor(color).text(
              String(cell ?? ''),
              colPositions[i] + cellPadding,
              currentY + Math.max((rowHeight - fontSize) / 2, 2),
              { width: safeWidth, align, ellipsis: true }
            );
            if (bold) doc.font('Helvetica');
          });
        }

        // Row border
        doc.lineWidth(borderWidth);
        doc.rect(startX, currentY, tableWidth, rowHeight).stroke(borderColor);
        currentY += rowHeight;
      });

      doc.y = currentY + 10;

    } catch (err) {
      console.error('🔥 drawAdvancedTable failed:', err);
      throw err;
    }
  }

  drawTable(doc, headers, rows) {
    this.drawAdvancedTable(doc, { headers, rows });
  }
}

module.exports = new PDFController();