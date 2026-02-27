const prisma = require("../db/prismaClient");
const sanitizeHtml = require("sanitize-html");

// ─────────────────────────────────────────────────────────────
// Helper: derive condition from mistake counts
// ─────────────────────────────────────────────────────────────
const deriveCondition = (attendance, sabaqMistakes, sabqiMistakes, manzilMistakes) => {
  if (attendance !== "PRESENT" && attendance !== "Present") return "N/A";

  const s = parseInt(sabaqMistakes) || 0;
  const sq = parseInt(sabqiMistakes) || 0;
  const m = parseInt(manzilMistakes) || 0;

  if (s > 2 || sq > 2 || m > 3) return "Below Average";
  if (s > 0 || sq > 1 || m > 1) return "Medium";
  if (s === 0 && sq === 0 && m === 0) return "Excellent";
  return "Good";
};

// ─────────────────────────────────────────────────────────────
// Helper: weekly performance check (Saturday → Thursday)
// ─────────────────────────────────────────────────────────────
const checkWeeklyPerformance = async (studentId) => {
  try {
    const today = new Date();
    console.log(`Checking performance for student ${studentId} on ${today.toISOString()}`);

    const currentDay = today.getDay();
    const daysToPreviousSaturday = (currentDay + 1) % 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToPreviousSaturday - 7);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 5);
    endDate.setHours(23, 59, 59, 999);

    console.log(`Performance period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const reports = await prisma.hifzProgress.findMany({
      where: { studentId, date: { gte: startDate, lte: endDate } },
    });

    console.log(`Found ${reports.length} reports for student ${studentId}`);

    const totalDays = reports.length;
    const presentDays = reports.filter(
      (r) => r.attendance === "PRESENT" || r.attendance === "Present"
    ).length;
    const attendanceRate = totalDays > 0 ? presentDays / totalDays : 0;

    const hasPoorPerformance =
      reports.some((r) => {
        const cond = r.condition?.toLowerCase();
        const isPoor = cond === "below average" || cond === "need focus";
        console.log(`Report date: ${r.date.toISOString()}, condition: ${r.condition}, poor: ${isPoor}`);
        return isPoor;
      }) || (attendanceRate > 0 && attendanceRate < 0.7);

    console.log(`Student ${studentId} poor performance: ${hasPoorPerformance}, attendance: ${attendanceRate}`);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { name: true } },
        progressNotifications: {
          where: {
            notificationType: "POOR_PERFORMANCE",
            isRead: false
          }
        }
      },
    });

    if (!student) {
      console.log(`Student ${studentId} not found`);
      return false;
    }

    const studentName = student.user.name;
    const currentNotifications = student.progressNotifications || [];
    const hadPoorPerformance = currentNotifications.length > 0;

    const notificationMessage = `Poor performance detected for ${studentName} (Week: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;

    if (hasPoorPerformance) {
      if (!currentNotifications.some((n) => n.message === notificationMessage)) {
        try {
          await prisma.progressNotification.create({
            data: {
              studentId: student.id,
              recipientType: "TEACHER",
              recipientId: "SYSTEM",
              notificationType: "POOR_PERFORMANCE",
              title: "Poor Hifz Performance",
              message: notificationMessage,
              priority: "HIGH"
            }
          });
          console.log(`Added notification for ${studentName}: ${notificationMessage}`);
        } catch (err) {
          console.error(`Error saving notifications for student ${studentId}:`, err.message);
        }
      }
    } else {
      if (hadPoorPerformance) {
        try {
          await prisma.progressNotification.updateMany({
            where: {
              studentId: student.id,
              notificationType: "POOR_PERFORMANCE",
              isRead: false
            },
            data: { isRead: true, readAt: new Date() }
          });
          console.log(`Cleared notifications for ${studentName}`);
        } catch (err) {
          console.error(`Error clearing notifications for student ${studentId}:`, err.message);
        }
      }
    }

    if (hadPoorPerformance && !hasPoorPerformance && global.io) {
      console.log(`Emitting performanceImproved for ${studentName}`);
      global.io.emit("performanceImproved", { studentId: student.id });
    }

    return hasPoorPerformance;
  } catch (error) {
    console.error(`Error checking weekly performance for ${studentId}:`, error);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/poor-performers
// ─────────────────────────────────────────────────────────────
const getPoorPerformers = async (req, res) => {
  try {
    console.log("Fetching poor performers...");

    const today = new Date();
    const currentDay = today.getDay();
    const daysToPreviousSaturday = (currentDay + 1) % 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToPreviousSaturday - 7);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 5);
    endDate.setHours(23, 59, 59, 999);

    const allStudents = await prisma.student.findMany({
      include: {
        user: { select: { name: true, profileImage: true } },
        hifzStatus: true,
        currentEnrollment: { include: { classRoom: true } },
        progressNotifications: {
          where: { notificationType: "POOR_PERFORMANCE", isRead: false }
        }
      },
    });

    // Bulk fetch reports for the relevant date range
    const reports = await prisma.hifzProgress.findMany({
      where: { date: { gte: startDate, lte: endDate } },
    });

    const reportsByStudent = {};
    for (const report of reports) {
      if (!reportsByStudent[report.studentId]) {
        reportsByStudent[report.studentId] = [];
      }
      reportsByStudent[report.studentId].push(report);
    }

    const poorPerformers = [];
    const newNotifications = [];
    const readNotificationsIds = [];
    const improvedStudentIds = [];

    const notificationMessageTemplate = (studentName) => `Poor performance detected for ${studentName} (Week: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;

    for (const student of allStudents) {
      const studentReports = reportsByStudent[student.id] || [];
      const totalDays = studentReports.length;
      const presentDays = studentReports.filter(
        (r) => r.attendance === "PRESENT" || r.attendance === "Present"
      ).length;
      const attendanceRate = totalDays > 0 ? presentDays / totalDays : 0;

      const hasPoorPerformance =
        studentReports.some((r) => {
          const cond = r.condition?.toLowerCase();
          return cond === "below average" || cond === "need focus";
        }) || (attendanceRate > 0 && attendanceRate < 0.7);

      const studentName = student.user.name;
      const currentNotifications = student.progressNotifications || [];
      const hadPoorPerformance = currentNotifications.length > 0;
      const notificationMessage = notificationMessageTemplate(studentName);

      if (hasPoorPerformance) {
        const isNew = !currentNotifications.some((n) => n.message === notificationMessage);
        if (isNew) {
          const newNotif = {
            studentId: student.id,
            recipientType: "TEACHER",
            recipientId: "SYSTEM",
            notificationType: "POOR_PERFORMANCE",
            title: "Poor Hifz Performance",
            message: notificationMessage,
            priority: "HIGH"
          };
          newNotifications.push(newNotif);
          currentNotifications.push(newNotif);
        }

        poorPerformers.push({
          _id: student.id,
          fullName: student.user.name,
          rollNumber: student.currentEnrollment?.rollNumber ?? "N/A",
          classType: student.currentEnrollment?.classRoom?.name ?? "N/A",
          profileImage: student.user.profileImage ?? null,
          performanceNotifications: currentNotifications,
        });
      } else {
        if (hadPoorPerformance) {
          currentNotifications.forEach(n => {
            if (n.id) readNotificationsIds.push(n.id);
          });
          improvedStudentIds.push(student.id);
        }
      }
    }

    if (newNotifications.length > 0) {
      await prisma.progressNotification.createMany({ data: newNotifications, skipDuplicates: true });
    }
    if (readNotificationsIds.length > 0) {
      await prisma.progressNotification.updateMany({
        where: { id: { in: readNotificationsIds } },
        data: { isRead: true, readAt: new Date() }
      });
    }
    if (global.io && improvedStudentIds.length > 0) {
      improvedStudentIds.forEach(id => {
        global.io.emit("performanceImproved", { studentId: id });
      });
    }

    console.log(`Found ${poorPerformers.length} poor performers`);
    res.set("Cache-Control", "no-store");
    res.status(200).json({ success: true, students: poorPerformers });
  } catch (error) {
    console.error("Error in getPoorPerformers:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/reports/students/:studentId
// ─────────────────────────────────────────────────────────────
const saveReport = async (req, res, io) => {
  try {
    const { studentId } = req.params;
    const {
      date,
      sabaq,
      sabaqMistakes,
      sabqi,
      sabqiMistakes,
      manzil,
      manzilMistakes,
      attendance,
    } = req.body;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: { select: { name: true } } },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const isPresent = attendance === "Present" || attendance === "PRESENT";

    if (isPresent) {
      if (
        sabaqMistakes === undefined ||
        sabqiMistakes === undefined ||
        manzilMistakes === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "All fields are required for 'Present' attendance",
        });
      }
    }

    const sanitizedSabaq = isPresent ? sanitizeHtml(sabaq) : "";
    const sanitizedSabqi = isPresent ? sanitizeHtml(sabqi) : "";
    const sanitizedManzil = isPresent ? sanitizeHtml(manzil) : "";

    const reportDate = date && !isNaN(new Date(date).getTime()) ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);

    // Duplicate check
    const existingReport = await prisma.hifzProgress.findFirst({
      where: {
        studentId,
        date: {
          gte: reportDate,
          lt: new Date(reportDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (existingReport) {
      return res.status(400).json({ success: false, message: "A report already exists for this date" });
    }

    const parsedSabaqMistakes = isPresent ? parseInt(sabaqMistakes) || 0 : 0;
    const parsedSabqiMistakes = isPresent ? parseInt(sabqiMistakes) || 0 : 0;
    const parsedManzilMistakes = isPresent ? parseInt(manzilMistakes) || 0 : 0;
    const totalMistakes = parsedSabaqMistakes + parsedSabqiMistakes + parsedManzilMistakes;

    const condition = deriveCondition(attendance, parsedSabaqMistakes, parsedSabqiMistakes, parsedManzilMistakes);

    const newReport = await prisma.hifzProgress.create({
      data: {
        studentId,
        date: reportDate,
        sabaq: sanitizedSabaq,
        sabaqLines: 0,
        sabaqMistakes: parsedSabaqMistakes,
        sabqi: sanitizedSabqi,
        sabqiMistakes: parsedSabqiMistakes,
        manzil: sanitizedManzil,
        manzilMistakes: parsedManzilMistakes,
        totalMistakes,
        condition,
        attendance: isPresent ? "PRESENT" : "ABSENT",
        teacherId: req.user?.teacherId ?? null,
      },
    });

    console.log(`Saved report for student ${studentId}, condition: ${condition}`);

    const hasPoorPerformance = await checkWeeklyPerformance(studentId);

    const updatedStudent = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { name: true, profileImage: true } },
        progressNotifications: {
          where: {
            notificationType: "POOR_PERFORMANCE",
            isRead: false
          }
        },
        currentEnrollment: { include: { classRoom: true } },
      },
    });

    if (hasPoorPerformance && updatedStudent) {
      const alertMessage = `Alert: Student ${updatedStudent.user.name} (Roll Number: ${updatedStudent.currentEnrollment?.rollNumber ?? "N/A"
        }) is performing poorly this week`;

      console.log(`Emitting poorPerformerAlert for ${updatedStudent.user.name}`);
      (io || global.io)?.emit("poorPerformerAlert", {
        _id: updatedStudent.id,
        studentName: updatedStudent.user.name,
        rollNumber: updatedStudent.currentEnrollment?.rollNumber ?? "N/A",
        classType: updatedStudent.currentEnrollment?.classRoom?.name ?? "N/A",
        profileImage: updatedStudent.user.profileImage ?? null,
        condition,
        message: alertMessage,
        notifications: updatedStudent.progressNotifications || [],
      });
    }

    res.status(201).json({ success: true, report: newReport });
  } catch (error) {
    console.error("Error saving report:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/students/:studentId/filter?startDate&endDate
// ─────────────────────────────────────────────────────────────
const getFilteredReports = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }

    const reports = await prisma.hifzProgress.findMany({
      where: { studentId, date: { gte: start, lte: end } },
      orderBy: { date: "desc" },
    });

    res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error("Error fetching filtered reports:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/students/:studentId
// ─────────────────────────────────────────────────────────────
const getReports = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      prisma.hifzProgress.findMany({
        where: { studentId },
        orderBy: { date: "desc" },
        take: Number(limit),
        skip
      }),
      prisma.hifzProgress.count({ where: { studentId } })
    ]);

    res.status(200).json({
      success: true,
      reports,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/students/:studentId/monthly?month=&year=
// ─────────────────────────────────────────────────────────────
const getMonthlyReports = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, year } = req.query;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const reports = await prisma.hifzProgress.findMany({
      where: { studentId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: "desc" },
    });

    res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error("Error fetching monthly reports:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/students/:studentId/performance
// ─────────────────────────────────────────────────────────────
const getPerformanceData = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { limit = 100, page = 1, startDate, endDate } = req.query;

    const where = { studentId };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ success: false, message: "Invalid date format" });
      }
      where.date = { gte: start, lte: end };
    }

    const reports = await prisma.hifzProgress.findMany({
      where,
      orderBy: { date: "asc" },
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
    });

    let totalLinesCompleted = 0;
    reports.forEach((r) => {
      const lines = parseInt(r.sabaqLines) || parseInt(r.sabaq) || 0;
      if (!isNaN(lines)) totalLinesCompleted += lines;
    });

    const totalDays = reports.length;
    const averageLinesPerDay = totalDays > 0 ? totalLinesCompleted / totalDays : 0;

    res.status(200).json({ success: true, reports, averageLinesPerDay });
  } catch (error) {
    console.error("Error fetching performance data:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/students/:studentId/para-completion
// ─────────────────────────────────────────────────────────────
const getParaCompletionData = async (req, res) => {
  try {
    const { studentId } = req.params;

    const reports = await prisma.hifzProgress.findMany({ where: { studentId } });

    let totalLinesCompleted = 0;
    reports.forEach((r) => {
      const lines = parseInt(r.sabaqLines) || parseInt(r.sabaq) || 0;
      if (!isNaN(lines)) totalLinesCompleted += lines;
    });

    const totalDays = reports.length;
    const averageLinesPerDay = totalDays > 0 ? totalLinesCompleted / totalDays : 0;
    const totalLinesInQuran = 604 * 15;

    const estimatedDaysToCompleteQuran =
      averageLinesPerDay > 0
        ? Math.ceil((totalLinesInQuran - totalLinesCompleted) / averageLinesPerDay)
        : "N/A";

    res.status(200).json({ success: true, totalLinesCompleted, averageLinesPerDay, estimatedDaysToCompleteQuran });
  } catch (error) {
    console.error("Error fetching para completion data:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/hifz/performance
// ─────────────────────────────────────────────────────────────
const hifzPerformance = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const hifzStudents = await prisma.student.findMany({
      where: { currentEnrollment: { classRoom: { type: "HIFZ" } } },
      select: { id: true },
    });

    if (hifzStudents.length === 0) {
      return res.status(404).json({ success: false, message: "No Hifz students found" });
    }

    const studentIds = hifzStudents.map((s) => s.id);

    const [reports, total] = await Promise.all([
      prisma.hifzProgress.findMany({
        where: { studentId: { in: studentIds } },
        orderBy: { date: "desc" },
        take: Number(limit),
        skip
      }),
      prisma.hifzProgress.count({ where: { studentId: { in: studentIds } } })
    ]);

    res.status(200).json({
      success: true,
      reports,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/hifz/classes/performance
// ─────────────────────────────────────────────────────────────
const allHifzClassesPerformance = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;

    const hifzStudents = await prisma.student.findMany({
      where: { currentEnrollment: { classRoom: { type: "HIFZ" } } },
      include: {
        user: { select: { name: true } },
        currentEnrollment: { include: { classRoom: true } },
      },
    });

    if (hifzStudents.length === 0) {
      return res.status(404).json({ success: false, message: "No Hifz students found" });
    }

    const studentIds = hifzStudents.map((s) => s.id);
    const studentMap = {};
    const reportsByClass = {};

    hifzStudents.forEach((s) => {
      const className = s.currentEnrollment?.classRoom?.name ?? "Unknown";
      studentMap[s.id] = { fullName: s.user.name, classType: className };
      if (!reportsByClass[className]) reportsByClass[className] = [];
    });

    let dateFilter = {};
    if (filter === "custom" && startDate && endDate) {
      dateFilter = { gte: new Date(startDate), lte: new Date(endDate) };
    } else if (filter === "weekly") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      dateFilter = { gte: oneWeekAgo };
    } else if (filter === "monthly") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      dateFilter = { gte: oneMonthAgo };
    }

    const where = { studentId: { in: studentIds } };
    if (Object.keys(dateFilter).length) where.date = dateFilter;

    const reports = await prisma.hifzProgress.findMany({ where, orderBy: { date: "asc" } });

    reports.forEach((report) => {
      const info = studentMap[report.studentId];
      if (info) {
        reportsByClass[info.classType].push({ ...report, studentName: info.fullName });
      }
    });

    res.status(200).json({ success: true, reportsByClass });
  } catch (error) {
    console.error("Error fetching Hifz classes performance:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/reports/students/:studentId/:reportId
// ─────────────────────────────────────────────────────────────
const updateReport = async (req, res, io) => {
  try {
    const { studentId, reportId } = req.params;
    const updateData = { ...req.body };

    const existingReport = await prisma.hifzProgress.findFirst({
      where: { id: reportId, studentId },
    });

    if (!existingReport) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    const sabaqMistakes = parseInt(updateData.sabaqMistakes) ?? existingReport.sabaqMistakes;
    const sabqiMistakes = parseInt(updateData.sabqiMistakes) ?? existingReport.sabqiMistakes;
    const manzilMistakes = parseInt(updateData.manzilMistakes) ?? existingReport.manzilMistakes;
    const attendance = updateData.attendance ?? existingReport.attendance;

    const condition = deriveCondition(attendance, sabaqMistakes, sabqiMistakes, manzilMistakes);
    const totalMistakes = sabaqMistakes + sabqiMistakes + manzilMistakes;

    const normAttendance =
      attendance === "Present" ? "PRESENT" :
        attendance === "Absent" ? "ABSENT" : attendance;

    const updatedReport = await prisma.hifzProgress.update({
      where: { id: reportId },
      data: {
        ...updateData,
        attendance: normAttendance,
        sabaqMistakes,
        sabqiMistakes,
        manzilMistakes,
        totalMistakes,
        condition,
      },
    });

    const hasPoorPerformance = await checkWeeklyPerformance(studentId);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { name: true, profileImage: true } },
        progressNotifications: {
          where: {
            notificationType: "POOR_PERFORMANCE",
            isRead: false
          }
        },
        currentEnrollment: { include: { classRoom: true } },
      },
    });

    if (student) {
      if (hasPoorPerformance) {
        const alertMessage = `Alert: Student ${student.user.name} (Roll Number: ${student.currentEnrollment?.rollNumber ?? "N/A"
          }) is performing poorly this week`;

        console.log(`Emitting poorPerformerAlert for ${student.user.name}`);
        (io || global.io)?.emit("poorPerformerAlert", {
          _id: student.id,
          studentName: student.user.name,
          rollNumber: student.currentEnrollment?.rollNumber ?? "N/A",
          classType: student.currentEnrollment?.classRoom?.name ?? "N/A",
          profileImage: student.user.profileImage ?? null,
          condition,
          message: alertMessage,
          notifications: student.progressNotifications || [],
        });
      } else {
        console.log(`Emitting performanceImproved for ${student.user.name}`);
        (io || global.io)?.emit("performanceImproved", { studentId: student.id });
      }
    }

    res.status(200).json({ success: true, report: updatedReport });
  } catch (error) {
    console.error("Error updating report:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  saveReport,
  getFilteredReports,
  getReports,
  getMonthlyReports,
  getPerformanceData,
  getParaCompletionData,
  getPoorPerformers,
  hifzPerformance,
  allHifzClassesPerformance,
  updateReport,
};