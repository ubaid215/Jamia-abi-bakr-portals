const activityService = require('./activity.service');
const prisma = require('../../db/prismaClient');

class ActivityController {
  /**
   * POST /api/activities
   * Create a new daily activity record
   */
  async createActivity(req, res) {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[${new Date().toISOString()}] [${requestId}] ========== CREATE ACTIVITY STARTED ==========`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Request from User: ${req.user?.id}, Role: ${req.user?.role}`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Teacher Profile: ${req.user?.teacherProfile?.id || 'None'}`);

    try {
      // Get teacher ID from authenticated user
      const teacherId = req.user.teacherProfile?.id;

      if (!teacherId) {
        console.log(`[${new Date().toISOString()}] [${requestId}] ❌ Access denied: User is not a teacher`);
        return res.status(403).json({
          success: false,
          error: 'Only teachers can create daily activities',
          requestId: requestId
        });
      }

      console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Teacher authorized: ${teacherId}`);

      // Validate request body
      const {
        studentId,
        classRoomId,
        subjectId,
        date,
        attendanceId,
        subjectsStudied,
        homeworkAssigned,
        homeworkCompleted,
        classworkCompleted,
        participationLevel,
        assessmentsTaken,
        behaviorRating,
        disciplineScore,
        skillsSnapshot,
        strengths,
        improvements,
        concerns,
        teacherRemarks,
        parentNotes
      } = req.body;

      // Log received data
      console.log(`[${new Date().toISOString()}] [${requestId}] Received data:`, {
        studentId,
        classRoomId,
        subjectId,
        date,
        attendanceId,
        subjectsStudiedCount: subjectsStudied?.length || 0,
        hasHomework: !!homeworkAssigned || !!homeworkCompleted,
        hasClasswork: !!classworkCompleted,
        hasAssessments: !!assessmentsTaken
      });

      // Basic validation
      if (!studentId) {
        console.log(`[${new Date().toISOString()}] [${requestId}] ❌ Validation failed: Student ID required`);
        return res.status(400).json({
          success: false,
          error: 'Student ID is required',
          requestId: requestId
        });
      }

      if (!classRoomId) {
        console.log(`[${new Date().toISOString()}] [${requestId}] ❌ Validation failed: Classroom ID required`);
        return res.status(400).json({
          success: false,
          error: 'Classroom ID is required',
          requestId: requestId
        });
      }

      if (!date) {
        console.log(`[${new Date().toISOString()}] [${requestId}] ❌ Validation failed: Date required`);
        return res.status(400).json({
          success: false,
          error: 'Date is required',
          requestId: requestId
        });
      }

      if (!subjectsStudied) {
        console.log(`[${new Date().toISOString()}] [${requestId}] ❌ Validation failed: Subjects studied required`);
        return res.status(400).json({
          success: false,
          error: 'Subjects studied is required',
          requestId: requestId
        });
      }

      // Validate subjectsStudied is an array
      if (!Array.isArray(subjectsStudied) || subjectsStudied.length === 0) {
        console.log(`[${new Date().toISOString()}] [${requestId}] ❌ Validation failed: Subjects studied must be a non-empty array`);
        return res.status(400).json({
          success: false,
          error: 'Subjects studied must be a non-empty array',
          requestId: requestId
        });
      }

      // Create activity data object
      const activityData = {
        studentId,
        classRoomId,
        subjectId,
        date,
        attendanceId,
        subjectsStudied,
        homeworkAssigned,
        homeworkCompleted,
        classworkCompleted,
        participationLevel,
        assessmentsTaken,
        behaviorRating,
        disciplineScore,
        skillsSnapshot,
        strengths,
        improvements,
        concerns,
        teacherRemarks,
        parentNotes
      };

      console.log(`[${new Date().toISOString()}] [${requestId}] Calling activityService.createDailyActivity...`);

      // Create the activity
      const activity = await activityService.createDailyActivity(
        activityData,
        teacherId
      );

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Activity created successfully!`);
      console.log(`[${new Date().toISOString()}] [${requestId}] Activity ID: ${activity.id}`);
      console.log(`[${new Date().toISOString()}] [${requestId}] Student: ${activity.student.user?.name}`);
      console.log(`[${new Date().toISOString()}] [${requestId}] Duration: ${duration}ms`);
      console.log(`[${new Date().toISOString()}] [${requestId}] ========== CREATE ACTIVITY COMPLETED ==========`);

      // Fire-and-forget: Update student snapshot asynchronously
      setImmediate(async () => {
        try {
          const snapshotService = require('../progressSnapshot/progressSnapshot.service');
          await snapshotService.recalculate(req.body.studentId);
        } catch (err) {
          console.error(`[${requestId}] Snapshot recalculation failed (non-blocking):`, err.message);
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Daily activity created successfully',
        data: activity,
        requestId: requestId
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ CREATE ACTIVITY ERROR: ${error.message}`);
      console.error(`[${new Date().toISOString()}] [${requestId}] Error Stack:`, error.stack);
      console.error(`[${new Date().toISOString()}] [${requestId}] Duration: ${duration}ms`);
      console.error(`[${new Date().toISOString()}] [${requestId}] ========== CREATE ACTIVITY FAILED ==========`);

      // Handle specific error types
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message,
          requestId: requestId
        });
      }

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: error.message,
          requestId: requestId
        });
      }

      if (error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('invalid')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          requestId: requestId
        });
      }

      if (error.message.includes('access') ||
        error.message.includes('permission')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          requestId: requestId
        });
      }

      // Prisma validation errors
      if (error.name === 'PrismaClientValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Invalid data format',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          requestId: requestId
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to create daily activity',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        requestId: requestId
      });
    }
  }

  /**
   * GET /api/activities/student/:studentId
   * Get activities for a specific student
   */
  async getStudentActivities(req, res) {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[${new Date().toISOString()}] [${requestId}] ========== GET STUDENT ACTIVITIES STARTED ==========`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Student ID from params: ${req.params.studentId}`);
    console.log(`[${new Date().toISOString()}] [${requestId}] Request from User: ${req.user?.id}, Role: ${req.user?.role}`);

    try {
      const { studentId } = req.params;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          error: 'Student ID is required',
          requestId: requestId
        });
      }

      // Parse query parameters
      const {
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'date',
        sortOrder = 'desc'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause
      const where = { studentId };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      // Get activities
      const [activities, total] = await Promise.all([
        prisma.dailyActivity.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { [sortBy]: sortOrder },
          include: {
            student: {
              select: {
                id: true,
                admissionNo: true,
                user: {
                  select: {
                    name: true
                  }
                }
              }
            },
            teacher: {
              select: {
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
                grade: true
              }
            }
          }
        }),
        prisma.dailyActivity.count({ where })
      ]);

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Retrieved ${activities.length} activities`);
      console.log(`[${new Date().toISOString()}] [${requestId}] Total activities: ${total}`);
      console.log(`[${new Date().toISOString()}] [${requestId}] Duration: ${duration}ms`);
      console.log(`[${new Date().toISOString()}] [${requestId}] ========== GET STUDENT ACTIVITIES COMPLETED ==========`);

      return res.status(200).json({
        success: true,
        data: activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        requestId: requestId
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ GET STUDENT ACTIVITIES ERROR: ${error.message}`);
      console.error(`[${new Date().toISOString()}] [${requestId}] Duration: ${duration}ms`);

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch student activities',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        requestId: requestId
      });
    }
  }

  /**
   * GET /api/activities/class/:classRoomId
   * Get activities for a specific classroom
   */
  async getClassActivities(req, res) {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[${new Date().toISOString()}] [${requestId}] ========== GET CLASS ACTIVITIES STARTED ==========`);

    try {
      const { classRoomId } = req.params;

      if (!classRoomId) {
        return res.status(400).json({
          success: false,
          error: 'Classroom ID is required',
          requestId: requestId
        });
      }

      // Check if teacher has access to this classroom
      const teacherId = req.user.teacherProfile?.id;
      if (teacherId) {
        const teacher = await prisma.teacher.findUnique({
          where: { id: teacherId },
          include: {
            classes: {
              where: { id: classRoomId }
            }
          }
        });

        if (!teacher || teacher.classes.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'You do not have access to this classroom',
            requestId: requestId
          });
        }
      }

      // Parse query parameters
      const {
        date,
        studentId,
        page = 1,
        limit = 20
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause
      const where = { classRoomId };

      if (date) {
        const activityDate = new Date(date);
        activityDate.setHours(0, 0, 0, 0);
        where.date = activityDate;
      }

      if (studentId) {
        where.studentId = studentId;
      }

      // Get activities
      const [activities, total] = await Promise.all([
        prisma.dailyActivity.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { date: 'desc' },
          include: {
            student: {
              select: {
                id: true,
                admissionNo: true,
                user: {
                  select: {
                    name: true
                  }
                }
              }
            },
            teacher: {
              select: {
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }),
        prisma.dailyActivity.count({ where })
      ]);

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Retrieved ${activities.length} activities for class ${classRoomId}`);
      console.log(`[${new Date().toISOString()}] [${requestId}] Duration: ${duration}ms`);

      return res.status(200).json({
        success: true,
        data: activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        requestId: requestId
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ GET CLASS ACTIVITIES ERROR: ${error.message}`);

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch classroom activities',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        requestId: requestId
      });
    }
  }

  /**
   * GET /api/activities/:id
   * Get a specific activity by ID
   */
  async getActivityById(req, res) {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[${new Date().toISOString()}] [${requestId}] ========== GET ACTIVITY BY ID STARTED ==========`);

    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Activity ID is required',
          requestId: requestId
        });
      }

      const activity = await prisma.dailyActivity.findUnique({
        where: { id },
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

      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'Activity not found',
          requestId: requestId
        });
      }

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Activity found: ${activity.id}`);
      console.log(`[${new Date().toISOString()}] [${requestId}] Duration: ${duration}ms`);

      return res.status(200).json({
        success: true,
        data: activity,
        requestId: requestId
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ GET ACTIVITY BY ID ERROR: ${error.message}`);

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch activity',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        requestId: requestId
      });
    }
  }

  /**
   * PUT /api/activities/:id
   * Update an activity
   */
  async updateActivity(req, res) {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[${new Date().toISOString()}] [${requestId}] ========== UPDATE ACTIVITY STARTED ==========`);

    try {
      const { id } = req.params;
      const teacherId = req.user.teacherProfile?.id;

      if (!teacherId) {
        return res.status(403).json({
          success: false,
          error: 'Only teachers can update activities',
          requestId: requestId
        });
      }

      // Check if activity exists and belongs to teacher
      const existingActivity = await prisma.dailyActivity.findUnique({
        where: { id },
        select: { teacherId: true }
      });

      if (!existingActivity) {
        return res.status(404).json({
          success: false,
          error: 'Activity not found',
          requestId: requestId
        });
      }

      if (existingActivity.teacherId !== teacherId) {
        return res.status(403).json({
          success: false,
          error: 'You can only update your own activities',
          requestId: requestId
        });
      }

      // Extract updatable fields
      const {
        subjectsStudied,
        homeworkAssigned,
        homeworkCompleted,
        classworkCompleted,
        participationLevel,
        assessmentsTaken,
        behaviorRating,
        disciplineScore,
        skillsSnapshot,
        strengths,
        improvements,
        concerns,
        teacherRemarks,
        parentNotes
      } = req.body;

      // Prepare update data
      const updateData = {};

      if (subjectsStudied !== undefined) {
        updateData.subjectsStudied = activityService._validateSubjectsStudied(subjectsStudied);
      }
      if (homeworkAssigned !== undefined) {
        updateData.homeworkAssigned = homeworkAssigned ? activityService._validateHomework(homeworkAssigned) : null;
      }
      if (homeworkCompleted !== undefined) {
        updateData.homeworkCompleted = homeworkCompleted ? activityService._validateHomework(homeworkCompleted) : null;
      }
      if (classworkCompleted !== undefined) {
        updateData.classworkCompleted = classworkCompleted ? activityService._validateClasswork(classworkCompleted) : null;
      }
      if (participationLevel !== undefined) {
        if (participationLevel < 1 || participationLevel > 5) {
          return res.status(400).json({
            success: false,
            error: 'Participation level must be between 1 and 5',
            requestId: requestId
          });
        }
        updateData.participationLevel = participationLevel;
      }
      if (assessmentsTaken !== undefined) {
        updateData.assessmentsTaken = assessmentsTaken ? activityService._validateAssessments(assessmentsTaken) : null;
      }
      if (behaviorRating !== undefined) {
        if (behaviorRating < 1 || behaviorRating > 5) {
          return res.status(400).json({
            success: false,
            error: 'Behavior rating must be between 1 and 5',
            requestId: requestId
          });
        }
        updateData.behaviorRating = behaviorRating;
      }
      if (disciplineScore !== undefined) {
        if (disciplineScore < 1 || disciplineScore > 5) {
          return res.status(400).json({
            success: false,
            error: 'Discipline score must be between 1 and 5',
            requestId: requestId
          });
        }
        updateData.disciplineScore = disciplineScore;
      }
      if (skillsSnapshot !== undefined) {
        updateData.skillsSnapshot = skillsSnapshot ? activityService._validateSkills(skillsSnapshot) : null;
      }
      if (strengths !== undefined) updateData.strengths = strengths;
      if (improvements !== undefined) updateData.improvements = improvements;
      if (concerns !== undefined) updateData.concerns = concerns;
      if (teacherRemarks !== undefined) updateData.teacherRemarks = teacherRemarks;
      if (parentNotes !== undefined) updateData.parentNotes = parentNotes;

      // Update activity
      const updatedActivity = await prisma.dailyActivity.update({
        where: { id },
        data: updateData,
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
              grade: true
            }
          }
        }
      });

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Activity updated: ${updatedActivity.id}`);
      console.log(`[${new Date().toISOString()}] [${requestId}] Duration: ${duration}ms`);

      return res.status(200).json({
        success: true,
        message: 'Activity updated successfully',
        data: updatedActivity,
        requestId: requestId
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ UPDATE ACTIVITY ERROR: ${error.message}`);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Activity not found',
          requestId: requestId
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to update activity',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        requestId: requestId
      });
    }
  }

  /**
   * DELETE /api/activities/:id
   * Delete an activity
   */
  async deleteActivity(req, res) {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[${new Date().toISOString()}] [${requestId}] ========== DELETE ACTIVITY STARTED ==========`);

    try {
      const { id } = req.params;
      const teacherId = req.user.teacherProfile?.id;
      const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

      if (!teacherId && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Only teachers or admins can delete activities',
          requestId: requestId
        });
      }

      // Check if activity exists
      const existingActivity = await prisma.dailyActivity.findUnique({
        where: { id },
        select: { teacherId: true }
      });

      if (!existingActivity) {
        return res.status(404).json({
          success: false,
          error: 'Activity not found',
          requestId: requestId
        });
      }

      // Teachers can only delete their own activities, admins can delete any
      if (teacherId && existingActivity.teacherId !== teacherId && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own activities',
          requestId: requestId
        });
      }

      // Delete activity
      await prisma.dailyActivity.delete({
        where: { id }
      });

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] [${requestId}] ✅ Activity deleted: ${id}`);
      console.log(`[${new Date().toISOString()}] [${requestId}] Duration: ${duration}ms`);

      return res.status(200).json({
        success: true,
        message: 'Activity deleted successfully',
        requestId: requestId
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ DELETE ACTIVITY ERROR: ${error.message}`);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Activity not found',
          requestId: requestId
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to delete activity',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        requestId: requestId
      });
    }
  }
}

module.exports = new ActivityController();