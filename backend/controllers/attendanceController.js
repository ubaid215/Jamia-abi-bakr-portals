const prisma = require('../db/prismaClient');

class AttendanceController {
  // Mark attendance for students
  async markAttendance(req, res) {
    try {
      const {
        classRoomId,
        subjectId, // Required for REGULAR classes, optional for NAZRA/HIFZ
        date,
        attendanceRecords // Array of { studentId, status, remarks? }
      } = req.body;

      // Validate required fields
      if (!classRoomId || !date || !attendanceRecords || !Array.isArray(attendanceRecords)) {
        return res.status(400).json({ 
          error: 'Class room ID, date, and attendance records are required' 
        });
      }

      // Check if teacher is authorized for this class/subject
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

      // Get class details to determine type
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
      if (classRoom.type === 'REGULAR') {
        if (!subjectId) {
          return res.status(400).json({ error: 'Subject ID is required for REGULAR classes' });
        }

        // Check if subject exists and belongs to this class
        const subject = classRoom.subjects.find(sub => sub.id === subjectId);
        if (!subject) {
          return res.status(404).json({ error: 'Subject not found in this class' });
        }

        // Check if teacher is assigned to this subject
        const isTeacherAssignedToSubject = teacher.subjects.some(sub => sub.id === subjectId);
        if (!isTeacherAssignedToSubject && subject.teacherId !== teacher.id) {
          return res.status(403).json({ error: 'Teacher is not assigned to this subject' });
        }
      }

      // For NAZRA and HIFZ, subjectId is optional
      // If provided, validate it belongs to the class and teacher
      if (subjectId && classRoom.type !== 'REGULAR') {
        const subject = classRoom.subjects.find(sub => sub.id === subjectId);
        if (!subject) {
          return res.status(404).json({ error: 'Subject not found in this class' });
        }
        if (subject.teacherId !== teacher.id) {
          return res.status(403).json({ error: 'Teacher is not assigned to this subject' });
        }
      }

      // Check if attendance already exists for this date and class/subject
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

      // Validate all students belong to the class
      const studentIds = attendanceRecords.map(record => record.studentId);
      const enrolledStudents = await prisma.enrollment.findMany({
        where: {
          classRoomId,
          studentId: { in: studentIds },
          isCurrent: true
        },
        select: { studentId: true }
      });

      const enrolledStudentIds = enrolledStudents.map(enrollment => enrollment.studentId);
      const invalidStudents = studentIds.filter(id => !enrolledStudentIds.includes(id));
      
      if (invalidStudents.length > 0) {
        return res.status(400).json({ 
          error: `Some students are not enrolled in this class: ${invalidStudents.join(', ')}` 
        });
      }

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
          })
        )
      );

      res.status(201).json({
        message: `Attendance marked successfully for ${classRoom.name}`,
        classType: classRoom.type,
        date: new Date(date).toISOString().split('T')[0],
        count: attendanceResults.length,
        attendance: attendanceResults
      });

    } catch (error) {
      console.error('Mark attendance error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get attendance for a class/subject on specific date
  async getAttendance(req, res) {
    try {
      const { classRoomId, subjectId, date } = req.query;

      if (!classRoomId || !date) {
        return res.status(400).json({ error: 'Class room ID and date are required' });
      }

      // Get class details
      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class room not found' });
      }

      // Build where clause based on class type
      const where = {
        classRoomId,
        date: new Date(date)
      };

      // For REGULAR classes, subjectId is required
      if (classRoom.type === 'REGULAR') {
        if (!subjectId) {
          return res.status(400).json({ error: 'Subject ID is required for REGULAR classes' });
        }
        where.subjectId = subjectId;
      } else {
        // For NAZRA/HIFZ, include all attendance for the class on that date
        // (could be from different subjects if multiple teachers)
        where.subjectId = subjectId || undefined;
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

      // Get all enrolled students to show who wasn't marked
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

      const markedStudentIds = attendance.map(a => a.studentId);
      const unmarkedStudents = enrolledStudents.filter(
        enrollment => !markedStudentIds.includes(enrollment.studentId)
      ).map(enrollment => ({
        studentId: enrollment.studentId,
        student: enrollment.student,
        status: 'NOT_MARKED'
      }));

      res.json({
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
      });

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

      // Check if student exists
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

      // Calculate statistics
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

      // Check if attendance record exists
      const existingAttendance = await prisma.attendance.findUnique({
        where: { id },
        include: {
          teacher: true
        }
      });

      if (!existingAttendance) {
        return res.status(404).json({ error: 'Attendance record not found' });
      }

      // Check if current user is the teacher who marked the attendance or an admin
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

  // Get attendance summary for a class over date range
  async getClassAttendanceSummary(req, res) {
    try {
      const { classRoomId } = req.params;
      const { startDate, endDate, subjectId } = req.query;

      if (!classRoomId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Class room ID, start date, and end date are required' });
      }

      // Get class details
      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId }
      });

      if (!classRoom) {
        return res.status(404).json({ error: 'Class room not found' });
      }

      // Build where clause
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
                  name: true
                }
              }
            }
          }
        }
      });

      // Calculate summary per student
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

      // Overall class summary
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