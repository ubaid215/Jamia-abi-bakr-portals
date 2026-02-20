const express = require("express");
const router  = express.Router();

const {
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
} = require("../controllers/Dailyreportcontroller");

const {
  authenticateToken,
  requireTeacherOrAdmin,
  requireStudentTeacherOrAdmin,
} = require("../middlewares/auth");

// ─────────────────────────────────────────────────────────────
// All routes require a valid JWT
// ─────────────────────────────────────────────────────────────
router.use(authenticateToken);

// ─────────────────────────────────────────────────────────────
// Class-wide dashboards  →  Teacher / Admin only
// ─────────────────────────────────────────────────────────────

// GET  /api/reports/poor-performers
router.get("/poor-performers",         requireTeacherOrAdmin, getPoorPerformers);

// GET  /api/reports/hifz/performance
router.get("/hifz/performance",        requireTeacherOrAdmin, hifzPerformance);

// GET  /api/reports/hifz/classes/performance?filter=weekly|monthly|custom&startDate&endDate
router.get("/hifz/classes/performance", requireTeacherOrAdmin, allHifzClassesPerformance);

// ─────────────────────────────────────────────────────────────
// Per-student routes
// ─────────────────────────────────────────────────────────────

// POST  /api/reports/students/:studentId          →  Teacher / Admin create
router.post("/students/:studentId",
  requireTeacherOrAdmin,
  (req, res) => saveReport(req, res, req.app.get("io"))
);

// GET   /api/reports/students/:studentId          →  Student can view own; Teacher/Admin any
router.get("/students/:studentId",                requireStudentTeacherOrAdmin, getReports);

// GET   /api/reports/students/:studentId/filter?startDate=&endDate=
router.get("/students/:studentId/filter",         requireStudentTeacherOrAdmin, getFilteredReports);

// GET   /api/reports/students/:studentId/monthly?month=&year=
router.get("/students/:studentId/monthly",        requireStudentTeacherOrAdmin, getMonthlyReports);

// GET   /api/reports/students/:studentId/performance?limit=&page=&startDate=&endDate=
router.get("/students/:studentId/performance",    requireStudentTeacherOrAdmin, getPerformanceData);

// GET   /api/reports/students/:studentId/para-completion
router.get("/students/:studentId/para-completion", requireStudentTeacherOrAdmin, getParaCompletionData);

// PUT   /api/reports/students/:studentId/:reportId  →  Teacher / Admin only
router.put("/students/:studentId/:reportId",
  requireTeacherOrAdmin,
  (req, res) => updateReport(req, res, req.app.get("io"))
);

module.exports = router;