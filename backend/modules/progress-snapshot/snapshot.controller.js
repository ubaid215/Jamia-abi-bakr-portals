/**
 * modules/progress-snapshot/snapshot.controller.js
 */

const service = require('./snapshot.service');
const { sendSuccess } = require('../../shared/utils/response.utils');
const { SOCKET_EVENTS, SOCKET_ROOMS } = require('../../shared/websocket/socket.events');
const { AppError } = require('../../middlewares/errorHandler');
const prisma = require('../../db/prismaClient');

let io;
const getIO = () => {
  if (!io) { try { io = require('../../shared/websocket/socket.init').getIO(); } catch (_) {} }
  return io;
};

// GET /api/dashboard/student/:studentId
const getSnapshot = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Students can only see their own snapshot
    if (req.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });
      if (!student || student.id !== studentId) throw new AppError('Access denied', 403);
    }

    const snapshot = await service.getSnapshotByStudentId(studentId);
    return sendSuccess(res, snapshot, 'Progress snapshot retrieved');
  } catch (err) { next(err); }
};

// POST /api/dashboard/student/:studentId/refresh — admin/teacher triggers recalculation
const refreshSnapshot = async (req, res, next) => {
  try {
    const snapshot = await service.refreshSnapshot(req.params.studentId);

    // Push updated snapshot via WebSocket
    const socket = getIO();
    if (socket) {
      socket.to(SOCKET_ROOMS.student(req.params.studentId)).emit(
        SOCKET_EVENTS.SNAPSHOT_UPDATED,
        { studentId: req.params.studentId, riskLevel: snapshot.riskLevel }
      );
    }

    return sendSuccess(res, snapshot, 'Snapshot refreshed successfully');
  } catch (err) { next(err); }
};

// POST /api/dashboard/classroom/:classRoomId/refresh — bulk refresh
const refreshClassRoom = async (req, res, next) => {
  try {
    const results = await service.refreshForClassRoom(req.params.classRoomId);
    return sendSuccess(res, results, `Snapshots refreshed for ${results.length} students`);
  } catch (err) { next(err); }
};

// GET /api/dashboard/at-risk
const getAtRiskStudents = async (req, res, next) => {
  try {
    const classRoomId = req.query.classRoomId || null;
    const students = await service.getAtRiskStudents(classRoomId);
    return sendSuccess(res, students, `${students.length} students need attention`);
  } catch (err) { next(err); }
};

module.exports = { getSnapshot, refreshSnapshot, refreshClassRoom, getAtRiskStudents };