const prisma = require('../../db/prismaClient');
const { AttendanceStatus } = require('@prisma/client');

class ActivityService {
  /**
   * Create Daily Activity for a student
   * @param {Object} data - Activity data
   * @param {String} teacherId - Teacher creating the activity
   * @returns {Promise<Object>} Created activity
   */
  async createDailyActivity(data, teacherId) {
  const startTime = Date.now();
  const requestId = `svc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${new Date().toISOString()}] [${requestId}] ========== Service: createDailyActivity STARTED ==========`);
  console.log(`[${new Date().toISOString()}] [${requestId}] Input Data:`, {
    studentId: data.studentId,
    classRoomId: data.classRoomId,
    date: data.date,
    teacherId: teacherId
  });

  const {
    studentId: providedStudentId,
    classRoomId,
    subjectId,
    date,
    attendanceId,
    subjectsStudied,
    homeworkAssigned,
    homeworkCompleted,
    classworkCompleted,
    participationLevel = 3,
    assessmentsTaken,
    behaviorRating = 3,
    disciplineScore = 3,
    skillsSnapshot,
    strengths,
    improvements,
    concerns,
    teacherRemarks,
    parentNotes
  } = data;

  // ========== FIX: Handle both User ID and Student Profile ID ==========
  let finalStudentId = providedStudentId;
  let isUserID = false;
  
  console.log(`[${new Date().toISOString()}] [${requestId}] Provided student identifier: ${providedStudentId}`);

  try {
    // Validate required fields
    if (!providedStudentId || !classRoomId || !date) {
      console.error(`[${new Date().toISOString()}] [${requestId}] Missing required fields:`, { 
        providedStudentId, 
        classRoomId, 
        date 
      });
      throw new Error('Student ID, Class Room ID, and Date are required');
    }

    // Parse date
    const activityDate = new Date(date);
    activityDate.setHours(0, 0, 0, 0);
    console.log(`[${new Date().toISOString()}] [${requestId}] Parsed activity date: ${activityDate.toISOString()}`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Original date string: "${date}"`);

    // ========== STEP 1: Determine if provided ID is User ID or Student Profile ID ==========
    console.log(`[${new Date().toISOString()}] [${requestId}] Step 1: Identifying student...`);
    
    // First, try to find a student profile with the provided ID
    let student = await prisma.student.findUnique({
      where: { id: providedStudentId },
      include: { 
        currentEnrollment: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (student) {
      // The provided ID is already a Student Profile ID
      console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Found student profile directly with ID: ${providedStudentId}`);
      console.log(`[${new Date().toISOString()}] [${requestId}] Student Name: ${student.user?.name || 'N/A'}`);
      console.log(`[${new Date().toISOString()}] [${requestId}] Admission No: ${student.admissionNo || 'N/A'}`);
    } else {
      // The provided ID might be a User ID, try to find the associated student profile
      console.log(`[${new Date().toISOString()}] [${requestId}] No student profile found with ID: ${providedStudentId}`);
      console.log(`[${new Date().toISOString()}] [${requestId}] Checking if this is a User ID...`);
      
      const user = await prisma.user.findUnique({
        where: { id: providedStudentId },
        include: {
          studentProfile: {
            include: {
              currentEnrollment: true,
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

      if (user && user.studentProfile) {
        // Found a user with a student profile
        student = user.studentProfile;
        finalStudentId = student.id;
        isUserID = true;
        console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Found user with student profile`);
        console.log(`[${new Date().toISOString()}] [${requestId}] User ID: ${user.id}`);
        console.log(`[${new Date().toISOString()}] [${requestId}] User Name: ${user.name}`);
        console.log(`[${new Date().toISOString()}] [${requestId}] Student Profile ID: ${student.id}`);
        console.log(`[${new Date().toISOString()}] [${requestId}] Admission No: ${student.admissionNo || 'N/A'}`);
      } else {
        // Neither student profile nor user found
        console.error(`[${new Date().toISOString()}] [${requestId}] ❌ No student found with identifier: ${providedStudentId}`);
        console.error(`[${new Date().toISOString()}] [${requestId}] This could be:
          1. An invalid Student Profile ID
          2. A User ID that doesn't have a Student Profile
          3. A User that isn't a student
        `);
        throw new Error('Student not found');
      }
    }

    // ========== STEP 2: Validate student type ==========
    console.log(`[${new Date().toISOString()}] [${requestId}] Step 2: Validating student type...`);
    
    // Check if studentType field exists in your schema
    try {
      if (student.studentType && student.studentType !== 'REGULAR') {
        console.error(`[${new Date().toISOString()}] [${requestId}] ❌ Invalid student type: ${student.studentType}`);
        throw new Error('Daily Activity tracking is only available for REGULAR students');
      } else if (!student.studentType) {
        console.log(`[${new Date().toISOString()}] [${requestId}] ⚠️  studentType field not found or not set. Assuming REGULAR.`);
        // If studentType doesn't exist in your schema, you might need to check another field
        // or remove this validation if all students can have daily activities
      }
    } catch (error) {
      console.log(`[${new Date().toISOString()}] [${requestId}] ⚠️  studentType validation skipped: ${error.message}`);
      // Continue without studentType validation if the field doesn't exist
    }

    // ========== STEP 3: Check enrollment ==========
    console.log(`[${new Date().toISOString()}] [${requestId}] Step 3: Checking enrollment...`);
    
    if (!student.currentEnrollment) {
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ Student has no current enrollment`);
      throw new Error('Student is not currently enrolled in any classroom');
    }

    if (student.currentEnrollment.classRoomId !== classRoomId) {
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ Student enrollment mismatch`);
      console.error(`[${new Date().toISOString()}] [${requestId}] Student enrolled in: ${student.currentEnrollment.classRoomId}`);
      console.error(`[${new Date().toISOString()}] [${requestId}] Requested classroom: ${classRoomId}`);
      throw new Error('Student is not enrolled in the specified classroom');
    }

    console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Student is enrolled in classroom: ${classRoomId}`);

    // ========== STEP 4: Validate teacher ==========
    console.log(`[${new Date().toISOString()}] [${requestId}] Step 4: Validating teacher...`);
    
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        classes: {
          where: { id: classRoomId }
        }
      }
    });

    if (!teacher) {
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ Teacher not found: ${teacherId}`);
      throw new Error('Teacher not found');
    }

    console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Teacher found: ${teacher.id}`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Teacher has access to classroom: ${teacher.classes.length > 0}`);

    // ========== STEP 5: Validate classroom ==========
    console.log(`[${new Date().toISOString()}] [${requestId}] Step 5: Validating classroom...`);
    
    const classRoom = await prisma.classRoom.findUnique({
      where: { id: classRoomId }
    });

    if (!classRoom) {
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ Classroom not found: ${classRoomId}`);
      throw new Error('Classroom not found');
    }

    console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Classroom found: ${classRoom.name} (${classRoom.grade})`);

    // ========== STEP 6: Check for existing activity ==========
    console.log(`[${new Date().toISOString()}] [${requestId}] Step 6: Checking for existing activity...`);
    
    const existingActivity = await prisma.dailyActivity.findUnique({
      where: { 
        studentId_date: { 
          studentId: finalStudentId, 
          date: activityDate 
        } 
      }
    });

    if (existingActivity) {
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ Activity already exists for this date`);
      throw new Error(`Daily activity already exists for this student on ${activityDate.toDateString()}`);
    }

    console.log(`[${new Date().toISOString()}] [${requestId}] ✅ No existing activity found`);

    // ========== STEP 7: Handle attendance ==========
    console.log(`[${new Date().toISOString()}] [${requestId}] Step 7: Processing attendance...`);
    
    let attendanceStatus = AttendanceStatus.PRESENT;
    let totalHoursSpent = 0;
    let punctuality = true;
    let uniformCompliance = true;

    if (attendanceId) {
      console.log(`[${new Date().toISOString()}] [${requestId}] Attendance ID provided: ${attendanceId}`);
      
      const attendance = await prisma.attendance.findUnique({ 
        where: { id: attendanceId } 
      });

      if (!attendance) {
        console.error(`[${new Date().toISOString()}] [${requestId}] ❌ Attendance not found: ${attendanceId}`);
        throw new Error('Attendance record not found');
      }

      if (attendance.studentId !== finalStudentId) {
        console.error(`[${new Date().toISOString()}] [${requestId}] ❌ Attendance mismatch`);
        console.error(`[${new Date().toISOString()}] [${requestId}] Attendance student ID: ${attendance.studentId}`);
        console.error(`[${new Date().toISOString()}] [${requestId}] Request student ID: ${finalStudentId}`);
        throw new Error('Attendance record does not belong to this student');
      }

      attendanceStatus = attendance.status;
      totalHoursSpent = this._calculateHoursSpent(attendanceStatus);
      punctuality = attendanceStatus === AttendanceStatus.PRESENT;
      
      console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Attendance validated`);
      console.log(`[${new Date().toISOString()}] [${requestId}] Status: ${attendanceStatus}, Hours: ${totalHoursSpent}`);
    } else {
      console.log(`[${new Date().toISOString()}] [${requestId}] No attendance ID provided, using defaults`);
      totalHoursSpent = await this._getDefaultSchoolHours(classRoomId);
      console.log(`[${new Date().toISOString()}] [${requestId}] Default hours: ${totalHoursSpent}`);
    }

    // ========== STEP 8: Validate and parse JSON fields ==========
    console.log(`[${new Date().toISOString()}] [${requestId}] Step 8: Validating academic data...`);
    
    const parsedSubjectsStudied = this._validateSubjectsStudied(subjectsStudied);
    const parsedHomeworkAssigned = homeworkAssigned ? this._validateHomework(homeworkAssigned) : null;
    const parsedHomeworkCompleted = homeworkCompleted ? this._validateHomework(homeworkCompleted) : null;
    const parsedClasswork = classworkCompleted ? this._validateClasswork(classworkCompleted) : null;
    const parsedAssessments = assessmentsTaken ? this._validateAssessments(assessmentsTaken) : null;
    const parsedSkills = skillsSnapshot ? this._validateSkills(skillsSnapshot) : null;

    console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Academic data validated`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Subjects studied: ${parsedSubjectsStudied.length}`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Homework assigned: ${parsedHomeworkAssigned ? parsedHomeworkAssigned.length : 0}`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Assessments: ${parsedAssessments ? parsedAssessments.length : 0}`);

    // ========== STEP 9: Validate ratings ==========
    console.log(`[${new Date().toISOString()}] [${requestId}] Step 9: Validating ratings...`);
    
    if (participationLevel < 1 || participationLevel > 5) {
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ Invalid participation level: ${participationLevel}`);
      throw new Error('Participation level must be between 1 and 5');
    }
    if (behaviorRating < 1 || behaviorRating > 5) {
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ Invalid behavior rating: ${behaviorRating}`);
      throw new Error('Behavior rating must be between 1 and 5');
    }
    if (disciplineScore < 1 || disciplineScore > 5) {
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ Invalid discipline score: ${disciplineScore}`);
      throw new Error('Discipline score must be between 1 and 5');
    }

    console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Ratings validated`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Participation: ${participationLevel}, Behavior: ${behaviorRating}, Discipline: ${disciplineScore}`);

    // ========== STEP 10: Create activity ==========
    console.log(`[${new Date().toISOString()}] [${requestId}] Step 10: Creating activity...`);
    
    const activity = await prisma.dailyActivity.create({
      data: {
        studentId: finalStudentId,
        teacherId,
        classRoomId,
        subjectId,
        date: activityDate,
        attendanceId,
        attendanceStatus,
        totalHoursSpent,
        subjectsStudied: parsedSubjectsStudied,
        homeworkAssigned: parsedHomeworkAssigned,
        homeworkCompleted: parsedHomeworkCompleted,
        classworkCompleted: parsedClasswork,
        participationLevel,
        assessmentsTaken: parsedAssessments,
        behaviorRating,
        disciplineScore,
        punctuality,
        uniformCompliance,
        skillsSnapshot: parsedSkills,
        strengths,
        improvements,
        concerns,
        teacherRemarks,
        parentNotes,
        recordedBy: teacherId,
        isVerified: true
      },
      include: {
        student: { 
          select: { 
            id: true, 
            admissionNo: true, 
            user: { 
              select: { 
                name: true, 
                email: true 
              } 
            } 
          } 
        },
        teacher: { 
          select: { 
            id: true, 
            user: { 
              select: { 
                name: true 
              } 
            } 
          } 
        },
        classRoom: { 
          select: { 
            id: true, 
            name: true, 
            grade: true, 
            section: true 
          } 
        },
        subject: { 
          select: { 
            id: true, 
            name: true, 
            code: true 
          } 
        },
        attendance: { 
          select: { 
            id: true, 
            status: true, 
            date: true 
          } 
        }
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Activity created successfully!`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Activity ID: ${activity.id}`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Student: ${activity.student.user?.name || 'N/A'}`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Teacher: ${activity.teacher.user?.name || 'N/A'}`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Classroom: ${activity.classRoom.name}`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Date: ${activity.date.toISOString()}`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Original provided ID was: ${providedStudentId}`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Was User ID: ${isUserID}`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Duration: ${duration}ms`);
    console.log(`[${new Date().toISOString()}] [${requestId}] ========== Service: createDailyActivity COMPLETED ==========`);

    return activity;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] [${requestId}] ❌ Service ERROR: ${error.message}`);
    console.error(`[${new Date().toISOString()}] [${requestId}] Error stack:`, error.stack);
    console.error(`[${new Date().toISOString()}] [${requestId}] Duration: ${duration}ms`);
    console.error(`[${new Date().toISOString()}] [${requestId}] Provided student identifier: ${providedStudentId}`);
    console.error(`[${new Date().toISOString()}] [${requestId}] Final student ID attempted: ${finalStudentId}`);
    console.error(`[${new Date().toISOString()}] [${requestId}] ========== Service: createDailyActivity FAILED ==========`);
    throw error;
  }
}


  /**
   * Calculate hours spent based on attendance status
   * @private
   */
  _calculateHoursSpent(status) {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return 6; // Full day - will be replaced by actual academic config
      case AttendanceStatus.LATE:
        return 5.5; // Slightly less
      case AttendanceStatus.HALF_DAY:
        return 3; // Half day
      case AttendanceStatus.EXCUSED:
        return 0;
      case AttendanceStatus.ABSENT:
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Get default school hours from academic configuration
   * @private
   */
  async _getDefaultSchoolHours(classRoomId) {
    const config = await prisma.academicConfiguration.findFirst({
      where: { isActive: true, isCurrent: true }
    });

    if (config) {
      // Calculate from start and end time
      const start = config.schoolStartTime.split(':');
      const end = config.schoolEndTime.split(':');
      const startHours = parseInt(start[0]) + parseInt(start[1]) / 60;
      const endHours = parseInt(end[0]) + parseInt(end[1]) / 60;
      return endHours - startHours;
    }

    return 6; // Default fallback
  }

  /**
   * Validate subjects studied JSON
   * @private
   */
  _validateSubjectsStudied(data) {
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Subjects studied must be a non-empty array');
    }

    return data.map(subject => {
      if (!subject.subjectId) {
        throw new Error('Each subject must have a subjectId');
      }
      if (!subject.topicsCovered || !Array.isArray(subject.topicsCovered)) {
        throw new Error('Each subject must have topicsCovered array');
      }
      if (subject.understandingLevel && (subject.understandingLevel < 1 || subject.understandingLevel > 5)) {
        throw new Error('Understanding level must be between 1 and 5');
      }

      return {
        subjectId: subject.subjectId,
        topicsCovered: subject.topicsCovered,
        understandingLevel: subject.understandingLevel || 3,
        notes: subject.notes || ''
      };
    });
  }

  /**
   * Validate homework JSON
   * @private
   */
  _validateHomework(data) {
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    if (!Array.isArray(data)) {
      throw new Error('Homework must be an array');
    }

    return data.map(hw => ({
      subjectId: hw.subjectId,
      title: hw.title || '',
      description: hw.description || '',
      dueDate: hw.dueDate ? new Date(hw.dueDate) : null,
      completionStatus: hw.completionStatus || 'NOT_DONE',
      quality: hw.quality && hw.quality >= 1 && hw.quality <= 5 ? hw.quality : null,
      notes: hw.notes || ''
    }));
  }

  /**
   * Validate classwork JSON
   * @private
   */
  _validateClasswork(data) {
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    if (!Array.isArray(data)) {
      throw new Error('Classwork must be an array');
    }

    return data.map(cw => ({
      subjectId: cw.subjectId,
      activity: cw.activity || '',
      completionStatus: cw.completionStatus || 'COMPLETE',
      quality: cw.quality && cw.quality >= 1 && cw.quality <= 5 ? cw.quality : 3
    }));
  }

  /**
   * Validate assessments JSON
   * @private
   */
  _validateAssessments(data) {
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    if (!Array.isArray(data)) {
      throw new Error('Assessments must be an array');
    }

    return data.map(assessment => {
      if (!assessment.subjectId || !assessment.type) {
        throw new Error('Each assessment must have subjectId and type');
      }

      return {
        subjectId: assessment.subjectId,
        type: assessment.type,
        topic: assessment.topic || '',
        marksObtained: assessment.marksObtained || 0,
        totalMarks: assessment.totalMarks || 0
      };
    });
  }

  /**
   * Validate skills snapshot JSON
   * @private
   */
  _validateSkills(data) {
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    const validSkills = ['reading', 'writing', 'listening', 'speaking', 'criticalThinking'];
    const skills = {};

    for (const skill of validSkills) {
      if (data[skill] !== undefined) {
        if (data[skill] < 1 || data[skill] > 5) {
          throw new Error(`${skill} must be between 1 and 5`);
        }
        skills[skill] = data[skill];
      }
    }

    return Object.keys(skills).length > 0 ? skills : null;
  }
}

module.exports = new ActivityService();