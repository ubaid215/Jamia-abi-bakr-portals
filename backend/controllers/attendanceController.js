const prisma = require('../db/prismaClient');

class AttendanceController {
  // Mark attendance for students (supports both individual and bulk marking)
 async markAttendance(req, res) {
  try {
    const {
      classRoomId,
      subjectId,
      date,
      attendanceRecords,
      bulkStatus,
      bulkRemarks,
      isWholeClass = false
    } = req.body;

    // Validate required fields
    if (!classRoomId || !date) {
      return res.status(400).json({ 
        error: 'Class room ID and date are required' 
      });
    }

    // Validate that either attendanceRecords or bulkStatus is provided
    if (!attendanceRecords && !bulkStatus) {
      return res.status(400).json({ 
        error: 'Either attendanceRecords or bulkStatus must be provided' 
      });
    }

    if (attendanceRecords && !Array.isArray(attendanceRecords)) {
      return res.status(400).json({ 
        error: 'attendanceRecords must be an array' 
      });
    }

    // Check if teacher is authorized
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
      include: {
        subjects: true,
        classes: true
      }
    });

    if (!teacher) {
      return res.status(403).json({ error: 'Only teachers can mark attendance' });
    }

    // Get class details
    const classRoom = await prisma.classRoom.findUnique({
      where: { id: classRoomId },
      include: {
        subjects: {
          include: {
            teacher: true
          }
        }
      }
    });

    if (!classRoom) {
      return res.status(404).json({ error: 'Class room not found' });
    }

    // Check if teacher is assigned to this class
    const isTeacherAssignedToClass = teacher.classes.some(cls => cls.id === classRoomId);
    if (!isTeacherAssignedToClass) {
      return res.status(403).json({ error: 'Teacher is not assigned to this class' });
    }

    // Get teacher's subjects in this class
    const teacherSubjectsInClass = classRoom.subjects.filter(subject => 
      subject.teacherId === teacher.id || teacher.subjects.some(tSub => tSub.id === subject.id)
    );

    // ============================================
    // FLEXIBLE VALIDATION - ALLOW WHOLE-CLASS WITHOUT SUBJECT
    // ============================================

    // For REGULAR classes in whole-class mode
    if (isWholeClass && classRoom.type === 'REGULAR' && !subjectId) {
      // Teacher must be assigned to at least one subject
      if (teacherSubjectsInClass.length === 0) {
        return res.status(403).json({ 
          error: 'Teacher is not assigned to any subject in this class for whole-class attendance' 
        });
      }
    } 
    // For REGULAR classes with subjectId
    else if (classRoom.type === 'REGULAR') {
      if (!subjectId) {
        return res.status(400).json({ 
          error: 'Subject ID is required for REGULAR classes' 
        });
      }

      const subject = classRoom.subjects.find(sub => sub.id === subjectId);
      if (!subject) {
        return res.status(404).json({ error: 'Subject not found in this class' });
      }

      const isTeacherAssignedToSubject = teacherSubjectsInClass.some(sub => sub.id === subjectId);
      if (!isTeacherAssignedToSubject) {
        return res.status(403).json({ error: 'Teacher is not assigned to this subject' });
      }
    }
    // For NAZRA/HIFZ classes
    else if (classRoom.type !== 'REGULAR') {
      if (subjectId) {
        const subject = classRoom.subjects.find(sub => sub.id === subjectId);
        if (!subject) {
          return res.status(404).json({ error: 'Subject not found in this class' });
        }
        if (subject.teacherId !== teacher.id) {
          return res.status(403).json({ error: 'Teacher is not assigned to this subject' });
        }
      }
    }

    // ============================================
    // CHECK FOR EXISTING ATTENDANCE
    // ============================================

    // Build query for existing attendance
    const existingAttendanceWhere = {
      classRoomId,
      date: new Date(date)
    };

    // For REGULAR classes, check specific subject if provided
    if (classRoom.type === 'REGULAR' && subjectId) {
      existingAttendanceWhere.subjectId = subjectId;
    }
    // For NAZRA/HIFZ with subjectId
    else if (subjectId) {
      existingAttendanceWhere.subjectId = subjectId;
    }
    // For whole-class without subject, we need to check if ANY attendance exists
    else if (isWholeClass) {
      // We'll check if any attendance exists for this class on this date
      const anyExistingAttendance = await prisma.attendance.findFirst({
        where: {
          classRoomId,
          date: new Date(date)
        }
      });

      if (anyExistingAttendance) {
        return res.status(400).json({ 
          error: `Attendance already marked for this class on ${date}` 
        });
      }
    }

    // For subject-specific, check exact match
    if (existingAttendanceWhere.subjectId !== undefined) {
      const existingAttendance = await prisma.attendance.findFirst({
        where: existingAttendanceWhere
      });

      if (existingAttendance) {
        return res.status(400).json({ 
          error: `Attendance already marked for this ${classRoom.type === 'REGULAR' ? 'subject' : 'class'} on ${date}` 
        });
      }
    }

    // ============================================
    // GET ENROLLED STUDENTS
    // ============================================

    const enrolledStudents = await prisma.enrollment.findMany({
      where: {
        classRoomId,
        isCurrent: true
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        rollNumber: 'asc'
      }
    });

    if (enrolledStudents.length === 0) {
      return res.status(400).json({ error: 'No students enrolled in this class' });
    }

    let finalAttendanceRecords = [];

    // ============================================
    // PREPARE ATTENDANCE RECORDS
    // ============================================

    if (bulkStatus) {
      // Validate bulk status
      const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY'];
      if (!validStatuses.includes(bulkStatus)) {
        return res.status(400).json({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }

      // For whole-class without subjectId (REGULAR classes only)
      if (isWholeClass && classRoom.type === 'REGULAR' && !subjectId) {
        // Create attendance for all teacher's subjects
        for (const subject of teacherSubjectsInClass) {
          enrolledStudents.forEach(enrollment => {
            finalAttendanceRecords.push({
              studentId: enrollment.studentId,
              status: bulkStatus,
              remarks: bulkRemarks || null,
              subjectId: subject.id
            });
          });
        }
      } else {
        // Single subject or special class bulk marking
        enrolledStudents.forEach(enrollment => {
          finalAttendanceRecords.push({
            studentId: enrollment.studentId,
            status: bulkStatus,
            remarks: bulkRemarks || null,
            subjectId: subjectId || null
          });
        });
      }
    } 
    else if (attendanceRecords) {
      // Individual marking
      const studentIds = attendanceRecords.map(record => record.studentId);
      const enrolledStudentIds = enrolledStudents.map(enrollment => enrollment.studentId);
      
      // Validate all students belong to the class
      const invalidStudents = studentIds.filter(id => !enrolledStudentIds.includes(id));
      
      if (invalidStudents.length > 0) {
        return res.status(400).json({ 
          error: `Some students are not enrolled in this class: ${invalidStudents.join(', ')}` 
        });
      }

      // Add subjectId to each record
      finalAttendanceRecords = attendanceRecords.map(record => ({
        ...record,
        subjectId: subjectId || null,
        remarks: record.remarks || null
      }));
    }

    // ============================================
    // CREATE ATTENDANCE RECORDS
    // ============================================

    const attendanceResults = await prisma.$transaction(
      finalAttendanceRecords.map(record =>
        prisma.attendance.create({
          data: {
            studentId: record.studentId,
            classRoomId,
            subjectId: record.subjectId,
            teacherId: teacher.id,
            date: new Date(date),
            status: record.status,
            remarks: record.remarks
          },
          include: {
            student: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            },
            subject: {
              select: {
                id: true,
                name: true
              }
            }
          }
        })
      )
    );

    // ============================================
    // PREPARE RESPONSE
    // ============================================

    const response = {
      message: `Attendance marked successfully for ${classRoom.name}`,
      markingType: bulkStatus ? 'BULK' : 'INDIVIDUAL',
      isWholeClass: isWholeClass,
      classType: classRoom.type,
      date: new Date(date).toISOString().split('T')[0],
      count: attendanceResults.length,
      summary: {
        total: attendanceResults.length,
        present: attendanceResults.filter(a => a.status === 'PRESENT').length,
        absent: attendanceResults.filter(a => a.status === 'ABSENT').length,
        late: attendanceResults.filter(a => a.status === 'LATE').length,
        excused: attendanceResults.filter(a => a.status === 'EXCUSED').length,
        halfDay: attendanceResults.filter(a => a.status === 'HALF_DAY').length
      }
    };

    // Add subject info if applicable
    if (subjectId && !isWholeClass) {
      const subject = classRoom.subjects.find(sub => sub.id === subjectId);
      if (subject) {
        response.subject = {
          id: subject.id,
          name: subject.name
        };
      }
    }

    // For whole-class with multiple subjects, add breakdown
    if (isWholeClass && classRoom.type === 'REGULAR' && !subjectId) {
      const subjectsMarked = [...new Set(attendanceResults.map(a => a.subjectId).filter(id => id))];
      response.subjectsMarked = subjectsMarked.length;
      
      const breakdown = subjectsMarked.map(subjectId => {
        const subject = classRoom.subjects.find(sub => sub.id === subjectId);
        const subjectRecords = attendanceResults.filter(a => a.subjectId === subjectId);
        return {
          subjectId: subjectId,
          subjectName: subject?.name || 'Unknown',
          count: subjectRecords.length,
          statusSummary: {
            present: subjectRecords.filter(a => a.status === 'PRESENT').length,
            absent: subjectRecords.filter(a => a.status === 'ABSENT').length,
            late: subjectRecords.filter(a => a.status === 'LATE').length
          }
        };
      });
      
      response.breakdown = breakdown;
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Mark attendance error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'Duplicate attendance record. Attendance already exists for this student/date/subject combination.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

  // NEW: Mark attendance with bulk and custom exceptions
  async markAttendanceWithExceptions(req, res) {
    try {
      const {
        classRoomId,
        subjectId,
        date,
        defaultStatus, // Default status for all students (e.g., 'PRESENT')
        exceptions // Array of { studentId, status, remarks? } for students with different status
      } = req.body;

      // Validate required fields
      if (!classRoomId || !date || !defaultStatus) {
        return res.status(400).json({ 
          error: 'Class room ID, date, and defaultStatus are required' 
        });
      }

      // Validate default status
      const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
      if (!validStatuses.includes(defaultStatus)) {
        return res.status(400).json({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }

      // Check teacher authorization
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
        include: {
          subjects: true,
          classes: true
        }
      });

      if (!teacher) {
        return res.status(403).json({ error: 'Only teachers can mark attendance' });
      }

      // Get class details
      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId },
        include: {
          subjects: true
        }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class room not found' });
      }

      // Check if teacher is assigned to this class
      const isTeacherAssignedToClass = teacher.classes.some(cls => cls.id === classRoomId);
      if (!isTeacherAssignedToClass) {
        return res.status(403).json({ error: 'Teacher is not assigned to this class' });
      }

      // Validate subject for REGULAR classes
      if (classRoom.type === 'REGULAR' && !subjectId) {
        return res.status(400).json({ error: 'Subject ID is required for REGULAR classes' });
      }

      // Check if attendance already exists
      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          classRoomId,
          subjectId: classRoom.type === 'REGULAR' ? subjectId : undefined,
          date: new Date(date)
        }
      });

      if (existingAttendance) {
        return res.status(400).json({ 
          error: `Attendance already marked for this ${classRoom.type === 'REGULAR' ? 'subject' : 'class'} on the selected date` 
        });
      }

      // Get all enrolled students
      const enrolledStudents = await prisma.enrollment.findMany({
        where: {
          classRoomId,
          isCurrent: true
        },
        select: { studentId: true }
      });

      if (enrolledStudents.length === 0) {
        return res.status(400).json({ error: 'No students enrolled in this class' });
      }

      // Create exception map
      const exceptionMap = new Map();
      if (exceptions && Array.isArray(exceptions)) {
        exceptions.forEach(exc => {
          exceptionMap.set(exc.studentId, {
            status: exc.status,
            remarks: exc.remarks
          });
        });
      }

      // Build attendance records with default status and exceptions
      const attendanceRecords = enrolledStudents.map(enrollment => {
        const exception = exceptionMap.get(enrollment.studentId);
        return {
          studentId: enrollment.studentId,
          status: exception ? exception.status : defaultStatus,
          remarks: exception ? exception.remarks : null
        };
      });

      // Create attendance records in transaction
      const attendanceResults = await prisma.$transaction(
        attendanceRecords.map(record =>
          prisma.attendance.create({
            data: {
              studentId: record.studentId,
              classRoomId,
              subjectId: classRoom.type === 'REGULAR' ? subjectId : (subjectId || null),
              teacherId: teacher.id,
              date: new Date(date),
              status: record.status,
              remarks: record.remarks
            },
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          })
        )
      );

      res.status(201).json({
        message: `Attendance marked successfully for ${classRoom.name}`,
        markingType: 'BULK_WITH_EXCEPTIONS',
        classType: classRoom.type,
        date: new Date(date).toISOString().split('T')[0],
        count: attendanceResults.length,
        exceptionsApplied: exceptions ? exceptions.length : 0,
        attendance: attendanceResults,
        summary: {
          total: attendanceResults.length,
          present: attendanceResults.filter(a => a.status === 'PRESENT').length,
          absent: attendanceResults.filter(a => a.status === 'ABSENT').length,
          late: attendanceResults.filter(a => a.status === 'LATE').length,
          excused: attendanceResults.filter(a => a.status === 'EXCUSED').length
        }
      });

    } catch (error) {
      console.error('Mark attendance with exceptions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get attendance for a class/subject on specific date
  async getAttendance(req, res) {
  try {
    const { 
      classRoomId, 
      subjectId, 
      date,
      isWholeClass = false  // Add this parameter
    } = req.query;

    if (!classRoomId || !date) {
      return res.status(400).json({ error: 'Class room ID and date are required' });
    }

    // Get class details
    const classRoom = await prisma.classRoom.findUnique({
      where: { id: classRoomId },
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
        }
      }
    });

    if (!classRoom) {
      return res.status(404).json({ error: 'Class room not found' });
    }

    // Build where clause based on class type and mode
    const where = {
      classRoomId,
      date: new Date(date)
    };

    // For whole-class mode without subjectId (REGULAR classes)
    if (isWholeClass && classRoom.type === 'REGULAR' && !subjectId) {
      // Get all attendance for this class on this date (from any subject)
      // We'll leave subjectId undefined to get all records
    } 
    // For REGULAR classes in subject-wise mode
    else if (classRoom.type === 'REGULAR') {
      if (!subjectId) {
        return res.status(400).json({ 
          error: 'Subject ID is required for REGULAR classes when not in whole-class mode' 
        });
      }
      where.subjectId = subjectId;
    } 
    // For NAZRA/HIFZ classes
    else {
      // subjectId is optional
      if (subjectId) {
        where.subjectId = subjectId;
      }
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        subject: {
          select: {
            id: true,
            name: true
          }
        },
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        student: {
          user: {
            name: 'asc'
          }
        }
      }
    });

    // Get all enrolled students
    const enrolledStudents = await prisma.enrollment.findMany({
      where: {
        classRoomId,
        isCurrent: true
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        student: {
          user: {
            name: 'asc'
          }
        }
      }
    });

    // For whole-class mode, we need to handle unmarked students differently
    let unmarkedStudents = [];
    
    if (isWholeClass && classRoom.type === 'REGULAR' && !subjectId) {
      // In whole-class mode, a student is considered "marked" if they have ANY attendance record
      const markedStudentIds = [...new Set(attendance.map(a => a.studentId))];
      unmarkedStudents = enrolledStudents.filter(
        enrollment => !markedStudentIds.includes(enrollment.studentId)
      ).map(enrollment => ({
        studentId: enrollment.studentId,
        student: enrollment.student,
        status: 'NOT_MARKED'
      }));
    } else {
      // Normal subject-wise logic
      const markedStudentIds = attendance.map(a => a.studentId);
      unmarkedStudents = enrolledStudents.filter(
        enrollment => !markedStudentIds.includes(enrollment.studentId)
      ).map(enrollment => ({
        studentId: enrollment.studentId,
        student: enrollment.student,
        status: 'NOT_MARKED'
      }));
    }

    // Prepare response with subject breakdown for whole-class
    let attendanceBySubject = {};
    if (isWholeClass && classRoom.type === 'REGULAR' && !subjectId) {
      attendance.forEach(record => {
        const subjectKey = record.subjectId || 'NO_SUBJECT';
        if (!attendanceBySubject[subjectKey]) {
          attendanceBySubject[subjectKey] = {
            subject: record.subject || { id: null, name: 'No Subject' },
            records: []
          };
        }
        attendanceBySubject[subjectKey].records.push(record);
      });
    }

    const response = {
      class: {
        id: classRoom.id,
        name: classRoom.name,
        type: classRoom.type
      },
      date: new Date(date).toISOString().split('T')[0],
      subject: subjectId ? await prisma.subject.findUnique({
        where: { id: subjectId },
        select: { id: true, name: true }
      }) : null,
      isWholeClass: isWholeClass && classRoom.type === 'REGULAR' && !subjectId,
      attendance,
      unmarkedStudents,
      summary: {
        total: enrolledStudents.length,
        present: attendance.filter(a => a.status === 'PRESENT').length,
        absent: attendance.filter(a => a.status === 'ABSENT').length,
        late: attendance.filter(a => a.status === 'LATE').length,
        excused: attendance.filter(a => a.status === 'EXCUSED').length,
        notMarked: unmarkedStudents.length
      }
    };

    // Add subject breakdown for whole-class view
    if (isWholeClass && classRoom.type === 'REGULAR' && !subjectId) {
      response.attendanceBySubject = attendanceBySubject;
    }

    res.json(response);

  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

  // Get attendance for a student over date range
  async getStudentAttendance(req, res) {
    try {
      const { studentId } = req.params;
      const { startDate, endDate, classRoomId } = req.query;

      if (!studentId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Student ID, start date, and end date are required' });
      }

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const where = {
        studentId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };

      if (classRoomId) {
        where.classRoomId = classRoomId;
      }

      const attendance = await prisma.attendance.findMany({
        where,
        include: {
          classRoom: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          subject: {
            select: {
              id: true,
              name: true
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

      const totalDays = attendance.length;
      const presentDays = attendance.filter(a => a.status === 'PRESENT').length;
      const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
      const lateDays = attendance.filter(a => a.status === 'LATE').length;
      const excusedDays = attendance.filter(a => a.status === 'EXCUSED').length;

      res.json({
        student: {
          id: student.id,
          name: student.user.name,
          admissionNo: student.admissionNo
        },
        period: {
          startDate,
          endDate
        },
        attendance,
        statistics: {
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          excusedDays,
          attendancePercentage: totalDays > 0 ? ((presentDays + lateDays) / totalDays * 100).toFixed(2) : 0
        }
      });

    } catch (error) {
      console.error('Get student attendance error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update attendance record (for corrections)
  async updateAttendance(req, res) {
    try {
      const { id } = req.params;
      const { status, remarks } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const existingAttendance = await prisma.attendance.findUnique({
        where: { id },
        include: {
          teacher: true
        }
      });

      if (!existingAttendance) {
        return res.status(404).json({ error: 'Attendance record not found' });
      }

      const isOwner = existingAttendance.teacher.userId === req.user.id;
      const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Only the marking teacher or admin can update attendance' });
      }

      const updatedAttendance = await prisma.attendance.update({
        where: { id },
        data: {
          status,
          remarks: remarks || null
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true
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
          subject: {
            select: {
              name: true
            }
          }
        }
      });

      res.json({
        message: 'Attendance updated successfully',
        attendance: updatedAttendance
      });

    } catch (error) {
      console.error('Update attendance error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // NEW: Update multiple attendance records for same date (bulk correction)
  async updateBulkAttendance(req, res) {
    try {
      const {
        classRoomId,
        subjectId,
        date,
        attendanceUpdates // Array of { studentId, status, remarks? }
      } = req.body;

      // Validate required fields
      if (!classRoomId || !date || !attendanceUpdates || !Array.isArray(attendanceUpdates)) {
        return res.status(400).json({ 
          error: 'Class room ID, date, and attendance updates array are required' 
        });
      }

      if (attendanceUpdates.length === 0) {
        return res.status(400).json({ error: 'At least one attendance update is required' });
      }

      // Check if teacher is authorized
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
        include: {
          subjects: true,
          classes: true
        }
      });

      if (!teacher) {
        return res.status(403).json({ error: 'Only teachers can update attendance' });
      }

      // Get class details
      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class room not found' });
      }

      // Check if teacher is assigned to this class
      const isTeacherAssignedToClass = teacher.classes.some(cls => cls.id === classRoomId);
      const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

      if (!isTeacherAssignedToClass && !isAdmin) {
        return res.status(403).json({ error: 'Teacher is not assigned to this class' });
      }

      // Build where clause for finding existing attendance
      const whereClause = {
        classRoomId,
        date: new Date(date)
      };

      if (classRoom.type === 'REGULAR') {
        if (!subjectId) {
          return res.status(400).json({ error: 'Subject ID is required for REGULAR classes' });
        }
        whereClause.subjectId = subjectId;
      } else if (subjectId) {
        whereClause.subjectId = subjectId;
      }

      // Get existing attendance records for this date
      const existingAttendance = await prisma.attendance.findMany({
        where: whereClause,
        include: {
          teacher: true
        }
      });

      if (existingAttendance.length === 0) {
        return res.status(404).json({ 
          error: 'No attendance records found for this date. Please mark attendance first.' 
        });
      }

      // Verify teacher can update (must be original marker or admin)
      const canUpdate = existingAttendance.every(att => 
        att.teacher.userId === req.user.id || isAdmin
      );

      if (!canUpdate) {
        return res.status(403).json({ 
          error: 'Only the original marking teacher or admin can update attendance' 
        });
      }

      // Create a map of existing attendance by studentId
      const attendanceMap = new Map();
      existingAttendance.forEach(att => {
        attendanceMap.set(att.studentId, att);
      });

      // Validate all students have existing attendance
      const studentIds = attendanceUpdates.map(update => update.studentId);
      const missingStudents = studentIds.filter(id => !attendanceMap.has(id));

      if (missingStudents.length > 0) {
        return res.status(400).json({ 
          error: `No attendance records found for students: ${missingStudents.join(', ')}` 
        });
      }

      // Update attendance records in transaction
      const updateResults = await prisma.$transaction(
        attendanceUpdates.map(update => {
          const existingRecord = attendanceMap.get(update.studentId);
          return prisma.attendance.update({
            where: { id: existingRecord.id },
            data: {
              status: update.status,
              remarks: update.remarks !== undefined ? update.remarks : existingRecord.remarks
            },
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          });
        })
      );

      res.json({
        message: `Successfully updated ${updateResults.length} attendance record(s)`,
        date: new Date(date).toISOString().split('T')[0],
        classRoom: {
          id: classRoom.id,
          name: classRoom.name,
          type: classRoom.type
        },
        updatedCount: updateResults.length,
        attendance: updateResults,
        summary: {
          present: updateResults.filter(a => a.status === 'PRESENT').length,
          absent: updateResults.filter(a => a.status === 'ABSENT').length,
          late: updateResults.filter(a => a.status === 'LATE').length,
          excused: updateResults.filter(a => a.status === 'EXCUSED').length
        }
      });

    } catch (error) {
      console.error('Update bulk attendance error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // NEW: Re-mark entire class attendance for same date (complete correction)
  async remarkAttendance(req, res) {
    try {
      const {
        classRoomId,
        subjectId,
        date,
        attendanceRecords, // Array of { studentId, status, remarks? }
        bulkStatus, // Optional: apply same status to all
        bulkRemarks
      } = req.body;

      // Validate required fields
      if (!classRoomId || !date) {
        return res.status(400).json({ 
          error: 'Class room ID and date are required' 
        });
      }

      if (!attendanceRecords && !bulkStatus) {
        return res.status(400).json({ 
          error: 'Either attendanceRecords or bulkStatus must be provided' 
        });
      }

      // Check if teacher is authorized
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
        include: {
          subjects: true,
          classes: true
        }
      });

      if (!teacher) {
        return res.status(403).json({ error: 'Only teachers can update attendance' });
      }

      // Get class details
      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class room not found' });
      }

      // Check if teacher is assigned to this class
      const isTeacherAssignedToClass = teacher.classes.some(cls => cls.id === classRoomId);
      const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

      if (!isTeacherAssignedToClass && !isAdmin) {
        return res.status(403).json({ error: 'Teacher is not assigned to this class' });
      }

      // Build where clause
      const whereClause = {
        classRoomId,
        date: new Date(date)
      };

      if (classRoom.type === 'REGULAR') {
        if (!subjectId) {
          return res.status(400).json({ error: 'Subject ID is required for REGULAR classes' });
        }
        whereClause.subjectId = subjectId;
      } else if (subjectId) {
        whereClause.subjectId = subjectId;
      }

      // Check if attendance exists
      const existingAttendance = await prisma.attendance.findMany({
        where: whereClause,
        include: {
          teacher: true
        }
      });

      if (existingAttendance.length === 0) {
        return res.status(404).json({ 
          error: 'No attendance records found for this date. Use mark attendance instead.' 
        });
      }

      // Verify teacher can update
      const canUpdate = existingAttendance.every(att => 
        att.teacher.userId === req.user.id || isAdmin
      );

      if (!canUpdate) {
        return res.status(403).json({ 
          error: 'Only the original marking teacher or admin can update attendance' 
        });
      }

      // Get all enrolled students
      const enrolledStudents = await prisma.enrollment.findMany({
        where: {
          classRoomId,
          isCurrent: true
        },
        select: { studentId: true }
      });

      let finalAttendanceRecords = [];

      // Prepare update records
      if (bulkStatus) {
        const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
        if (!validStatuses.includes(bulkStatus)) {
          return res.status(400).json({ 
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
          });
        }

        finalAttendanceRecords = enrolledStudents.map(enrollment => ({
          studentId: enrollment.studentId,
          status: bulkStatus,
          remarks: bulkRemarks || null
        }));
      } else if (attendanceRecords) {
        finalAttendanceRecords = attendanceRecords;
      }

      // Create map of existing attendance by studentId
      const attendanceMap = new Map();
      existingAttendance.forEach(att => {
        attendanceMap.set(att.studentId, att);
      });

      // Update in transaction
      const updateResults = await prisma.$transaction(
        finalAttendanceRecords.map(record => {
          const existingRecord = attendanceMap.get(record.studentId);
          if (!existingRecord) {
            throw new Error(`No existing attendance for student: ${record.studentId}`);
          }
          return prisma.attendance.update({
            where: { id: existingRecord.id },
            data: {
              status: record.status,
              remarks: record.remarks || null
            },
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          });
        })
      );

      res.json({
        message: `Attendance re-marked successfully for ${classRoom.name}`,
        correctionType: bulkStatus ? 'BULK_CORRECTION' : 'INDIVIDUAL_CORRECTION',
        date: new Date(date).toISOString().split('T')[0],
        updatedCount: updateResults.length,
        attendance: updateResults,
        summary: {
          total: updateResults.length,
          present: updateResults.filter(a => a.status === 'PRESENT').length,
          absent: updateResults.filter(a => a.status === 'ABSENT').length,
          late: updateResults.filter(a => a.status === 'LATE').length,
          excused: updateResults.filter(a => a.status === 'EXCUSED').length
        }
      });

    } catch (error) {
      console.error('Re-mark attendance error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get attendance summary for a class over date range
  async getClassAttendanceSummary(req, res) {
    try {
      const { classRoomId } = req.params;
      const { startDate, endDate, subjectId } = req.query;

      if (!classRoomId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Class room ID, start date, and end date are required' });
      }

      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class room not found' });
      }

      const where = {
        classRoomId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };

      if (subjectId) {
        where.subjectId = subjectId;
      }

      const attendance = await prisma.attendance.findMany({
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
          }
        }
      });

      const enrolledStudents = await prisma.enrollment.findMany({
        where: {
          classRoomId,
          isCurrent: true
        },
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
        }
      });

      const studentSummary = enrolledStudents.map(enrollment => {
        const studentAttendance = attendance.filter(a => a.studentId === enrollment.studentId);
        const totalDays = studentAttendance.length;
        const presentDays = studentAttendance.filter(a => a.status === 'PRESENT').length;
        const absentDays = studentAttendance.filter(a => a.status === 'ABSENT').length;
        const lateDays = studentAttendance.filter(a => a.status === 'LATE').length;
        const excusedDays = studentAttendance.filter(a => a.status === 'EXCUSED').length;

        return {
          studentId: enrollment.studentId,
          studentName: enrollment.student.user.name,
          rollNumber: enrollment.rollNumber,
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          excusedDays,
          attendancePercentage: totalDays > 0 ? ((presentDays + lateDays) / totalDays * 100).toFixed(2) : 0
        };
      });

      const totalPossibleDays = enrolledStudents.length * attendance.length;
      const totalPresentDays = attendance.filter(a => a.status === 'PRESENT').length;
      const classAttendancePercentage = totalPossibleDays > 0 ? 
        (totalPresentDays / totalPossibleDays * 100).toFixed(2) : 0;

      res.json({
        class: {
          id: classRoom.id,
          name: classRoom.name,
          type: classRoom.type
        },
        period: {
          startDate,
          endDate
        },
        subject: subjectId ? await prisma.subject.findUnique({
          where: { id: subjectId },
          select: { id: true, name: true }
        }) : null,
        summary: {
          totalStudents: enrolledStudents.length,
          totalAttendanceDays: attendance.length,
          classAttendancePercentage,
          studentSummary: studentSummary.sort((a, b) => a.rollNumber - b.rollNumber)
        }
      });

    } catch (error) {
      console.error('Get class attendance summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AttendanceController();