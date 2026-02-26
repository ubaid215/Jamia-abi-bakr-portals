/**
 * modules/weekly-progress/weeklyProgress.controller.js
 */

const service = require('./weeklyProgress.service');
const { sendSuccess, sendCreated, sendPaginated } = require('../../shared/utils/response.utils');
const { SOCKET_EVENTS, SOCKET_ROOMS } = require('../../shared/websocket/socket.events');
const { getWeekInfo } = require('../../shared/utils/date.utils');

let io;
const getIO = () => {
  if (!io) { try { io = require('../../shared/websocket/socket.init').getIO(); } catch (_) {} }
  return io;
};

const generateWeeklyProgress = async (req, res, next) => {
  try {
    const { weekNumber, year } = req.body;
    const { weekNumber: currentWeek, year: currentYear } = getWeekInfo();

    const progress = await service.generateWeeklyProgress({
      studentId: req.body.studentId,
      weekNumber: weekNumber || currentWeek,
      year: year || currentYear,
      classRoomId: req.body.classRoomId,
      user: req.user,
      req,
    });

    // Notify student + parents via WebSocket
    const socket = getIO();
    if (socket) {
      socket.to(SOCKET_ROOMS.student(progress.studentId)).emit(
        SOCKET_EVENTS.WEEKLY_PROGRESS_GENERATED,
        { progressId: progress.id, weekNumber: progress.weekNumber, year: progress.year }
      );
    }

    return sendCreated(res, progress, 'Weekly progress generated successfully');
  } catch (err) { next(err); }
};

const updateWeeklyProgress = async (req, res, next) => {
  try {
    const progress = await service.updateWeeklyProgress(req.params.id, req.body, req.user, req);

    const socket = getIO();
    if (socket) {
      socket.to(SOCKET_ROOMS.student(progress.studentId)).emit(
        SOCKET_EVENTS.WEEKLY_PROGRESS_UPDATED,
        { progressId: progress.id }
      );
    }

    return sendSuccess(res, progress, 'Weekly progress updated');
  } catch (err) { next(err); }
};

const getWeeklyProgress = async (req, res, next) => {
  try {
    const { studentId, weekNumber, year } = req.params;
    const progress = await service.getByStudentAndWeek(studentId, parseInt(weekNumber), parseInt(year));
    return sendSuccess(res, progress);
  } catch (err) { next(err); }
};

const getCurrentWeek = async (req, res, next) => {
  try {
    const studentId = req.params.studentId;
    const progress = await service.getCurrentWeekProgress(studentId);
    return sendSuccess(res, progress, 'Current week progress retrieved');
  } catch (err) { next(err); }
};

const listWeeklyProgress = async (req, res, next) => {
  try {
    const { items, total, page, limit } = await service.listWeeklyProgress(req.query, req.user);
    return sendPaginated(res, items, { page, limit, total });
  } catch (err) { next(err); }
};

module.exports = { generateWeeklyProgress, updateWeeklyProgress, getWeeklyProgress, getCurrentWeek, listWeeklyProgress };