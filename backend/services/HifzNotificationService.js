const prisma = require('../db/prismaClient');

class HifzNotificationService {
  // Notify about poor performance
  static async notifyPoorPerformance(student, weeklyPerformance) {
    try {
      const message = `Performance Alert: ${student.user.name} - ` +
        `Attendance: ${weeklyPerformance.attendanceRate}%, ` +
        `Avg Mistakes: ${weeklyPerformance.avgMistakes}/day`;

      // Notify student
      await this.createNotification({
        userId: student.userId,
        type: 'POOR_PERFORMANCE',
        title: 'Weekly Performance Alert',
        message: `Your performance this week needs attention. ${message}`,
        severity: 'warning'
      });

      // Notify admins
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' }
      });

      for (const admin of admins) {
        await this.createNotification({
          userId: admin.id,
          type: 'POOR_PERFORMANCE',
          title: `Student Alert: ${student.user.name}`,
          message: `${student.user.name} (${student.admissionNo}) - ${message}`,
          severity: 'warning',
          metadata: {
            studentId: student.id,
            studentName: student.user.name,
            admissionNo: student.admissionNo,
            weeklyPerformance
          }
        });
      }

      // Notify teacher if assigned
      if (student.currentEnrollment?.classRoom?.teacherId) {
        const teacher = await prisma.teacher.findUnique({
          where: { id: student.currentEnrollment.classRoom.teacherId },
          include: { user: true }
        });

        if (teacher) {
          await this.createNotification({
            userId: teacher.userId,
            type: 'POOR_PERFORMANCE',
            title: `Student Alert: ${student.user.name}`,
            message: `Your student ${student.user.name} needs attention this week. ${message}`,
            severity: 'warning',
            metadata: {
              studentId: student.id,
              weeklyPerformance
            }
          });
        }
      }

      // Emit socket event if available
      if (global.io) {
        global.io.emit('poorPerformerAlert', {
          studentId: student.id,
          studentName: student.user.name,
          admissionNo: student.admissionNo,
          rollNumber: student.currentEnrollment?.rollNumber,
          classRoom: student.currentEnrollment?.classRoom?.name,
          message,
          weeklyPerformance
        });
      }

    } catch (error) {
      console.error('Notify poor performance error:', error);
    }
  }

  // Notify about para completion
  static async notifyParaCompletion(student, completedPara) {
    try {
      const celebrationMessage = `🎉 Congratulations! Para ${completedPara} completed!`;

      // Notify student
      await this.createNotification({
        userId: student.userId,
        type: 'PARA_COMPLETED',
        title: 'Para Completed!',
        message: `${celebrationMessage} Keep up the excellent work!`,
        severity: 'success'
      });

      // Get student's total completed paras
      const hifzStatus = await prisma.studentHifzStatus.findUnique({
        where: { studentId: student.id }
      });

      const totalCompleted = hifzStatus?.completedParas?.length || 0;
      const totalWithPrior = totalCompleted + (hifzStatus?.alreadyMemorizedParas?.length || 0);

      // Notify admins
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' }
      });

      for (const admin of admins) {
        await this.createNotification({
          userId: admin.id,
          type: 'PARA_COMPLETED',
          title: `Achievement: ${student.user.name}`,
          message: `${student.user.name} (${student.admissionNo}) has completed Para ${completedPara}! Total: ${totalWithPrior}/30`,
          severity: 'success',
          metadata: {
            studentId: student.id,
            studentName: student.user.name,
            admissionNo: student.admissionNo,
            completedPara,
            totalCompleted: totalWithPrior
          }
        });
      }

      // Notify teacher
      if (student.currentEnrollment?.classRoom?.teacherId) {
        const teacher = await prisma.teacher.findUnique({
          where: { id: student.currentEnrollment.classRoom.teacherId },
          include: { user: true }
        });

        if (teacher) {
          await this.createNotification({
            userId: teacher.userId,
            type: 'PARA_COMPLETED',
            title: `Student Achievement!`,
            message: `${student.user.name} completed Para ${completedPara}! Well done!`,
            severity: 'success'
          });
        }
      }

      // Special milestone notifications (10, 20, 30 paras)
      if ([10, 20, 30].includes(totalWithPrior)) {
        await this.notifyMilestone(student, totalWithPrior);
      }

      // Emit socket event
      if (global.io) {
        global.io.emit('paraCompleted', {
          studentId: student.id,
          studentName: student.user.name,
          admissionNo: student.admissionNo,
          completedPara,
          totalCompleted: totalWithPrior,
          message: celebrationMessage
        });
      }

    } catch (error) {
      console.error('Notify para completion error:', error);
    }
  }

  // Notify about major milestones
  static async notifyMilestone(student, totalParas) {
    try {
      let milestoneMessage = '';
      
      if (totalParas === 10) {
        milestoneMessage = '🌟 Amazing! One-third of the Quran memorized!';
      } else if (totalParas === 20) {
        milestoneMessage = '🌟 Incredible! Two-thirds of the Quran memorized!';
      } else if (totalParas === 30) {
        milestoneMessage = '🎊 ALHAMDULILLAH! Complete Quran memorized! What an achievement!';
      }

      if (!milestoneMessage) return;

      // Notify student
      await this.createNotification({
        userId: student.userId,
        type: 'MILESTONE_ACHIEVED',
        title: 'Major Milestone Achieved!',
        message: milestoneMessage,
        severity: 'success'
      });

      // Broadcast to all admins and teachers
      const adminsAndTeachers = await prisma.user.findMany({
        where: {
          role: {
            in: ['ADMIN', 'TEACHER']
          }
        }
      });

      for (const user of adminsAndTeachers) {
        await this.createNotification({
          userId: user.id,
          type: 'MILESTONE_ACHIEVED',
          title: `🎉 Milestone: ${student.user.name}`,
          message: `${student.user.name} (${student.admissionNo}) - ${milestoneMessage}`,
          severity: 'success',
          metadata: {
            studentId: student.id,
            studentName: student.user.name,
            totalParas
          }
        });
      }

      // Emit special milestone event
      if (global.io) {
        global.io.emit('milestoneAchieved', {
          studentId: student.id,
          studentName: student.user.name,
          admissionNo: student.admissionNo,
          totalParas,
          message: milestoneMessage
        });
      }

    } catch (error) {
      console.error('Notify milestone error:', error);
    }
  }

  // Notify about performance improvement
  static async notifyImprovement(student) {
    try {
      const message = `Your Hifz performance has improved! Keep up the great work!`;

      // Notify student
      await this.createNotification({
        userId: student.userId,
        type: 'PERFORMANCE_IMPROVED',
        title: 'Performance Improvement',
        message,
        severity: 'success'
      });

      // Notify teacher
      if (student.currentEnrollment?.classRoom?.teacherId) {
        const teacher = await prisma.teacher.findUnique({
          where: { id: student.currentEnrollment.classRoom.teacherId },
          include: { user: true }
        });

        if (teacher) {
          await this.createNotification({
            userId: teacher.userId,
            type: 'PERFORMANCE_IMPROVED',
            title: `Student Improvement: ${student.user.name}`,
            message: `${student.user.name}'s performance has improved significantly!`,
            severity: 'success'
          });
        }
      }

      // Emit socket event
      if (global.io) {
        global.io.emit('performanceImproved', {
          studentId: student.id
        });
      }

    } catch (error) {
      console.error('Notify improvement error:', error);
    }
  }

  // Send weekly summary report
  static async sendWeeklySummary(studentId) {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: true,
          hifzStatus: true
        }
      });

      if (!student) return;

      // Get last 7 days progress
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const weekProgress = await prisma.hifzProgress.findMany({
        where: {
          studentId,
          date: {
            gte: sevenDaysAgo
          }
        },
        orderBy: { date: 'asc' }
      });

      if (weekProgress.length === 0) return;

      // Calculate weekly stats
      const totalLines = weekProgress.reduce((sum, r) => sum + r.sabaqLines, 0);
      const totalMistakes = weekProgress.reduce((sum, r) => sum + r.totalMistakes, 0);
      const avgLinesPerDay = totalLines / weekProgress.length;
      const avgMistakes = totalMistakes / weekProgress.length;

      const summaryMessage = `Weekly Summary:\n` +
        `📊 Days Active: ${weekProgress.length}\n` +
        `📖 Total Lines: ${totalLines}\n` +
        `📈 Avg Lines/Day: ${avgLinesPerDay.toFixed(1)}\n` +
        `⚠️ Avg Mistakes: ${avgMistakes.toFixed(1)}\n` +
        `🎯 Current Para: ${student.hifzStatus?.currentPara || 'N/A'}`;

      // Send notification
      await this.createNotification({
        userId: student.userId,
        type: 'WEEKLY_SUMMARY',
        title: 'Your Weekly Hifz Summary',
        message: summaryMessage,
        severity: 'info',
        metadata: {
          weekProgress: {
            totalLines,
            totalMistakes,
            avgLinesPerDay: avgLinesPerDay.toFixed(1),
            avgMistakes: avgMistakes.toFixed(1),
            daysActive: weekProgress.length
          }
        }
      });

    } catch (error) {
      console.error('Send weekly summary error:', error);
    }
  }

  // Helper: Create notification (with Prisma)
  static async createNotification(data) {
    try {
      // If your Prisma schema has a Notification model, use it
      // Otherwise, you'll need to create this model first
      
      // Example structure (adapt to your schema):
      /*
      await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          severity: data.severity || 'info',
          read: false,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null
        }
      });
      */

      // For now, just log if model doesn't exist
      console.log('Notification:', data);

    } catch (error) {
      console.error('Create notification error:', error);
    }
  }

  // Bulk notify all poor performers
  static async notifyAllPoorPerformers() {
    try {
      const students = await prisma.student.findMany({
        where: {
          currentEnrollment: {
            classRoom: {
              type: 'HIFZ'
            }
          }
        },
        include: {
          user: true,
          currentEnrollment: {
            include: {
              classRoom: true
            }
          }
        }
      });

      const hifzProgressController = require('../controllers/hifzProgressController');
      
      for (const student of students) {
        const weeklyPerformance = await hifzProgressController.checkWeeklyPerformance(student.id);
        
        if (weeklyPerformance.hasPoorPerformance) {
          await this.notifyPoorPerformance(student, weeklyPerformance);
        }
      }

    } catch (error) {
      console.error('Notify all poor performers error:', error);
    }
  }
}

module.exports = HifzNotificationService;