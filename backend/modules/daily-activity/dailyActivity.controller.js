/**
 * modules/daily-activity/dailyActivity.controller.js
 * HTTP handlers for DailyActivity — thin layer, delegates to service
 */

const service = require('./dailyActivity.service');
const { sendSuccess, sendCreated, sendPaginated, sendNotFound } = require('../../shared/utils/response.utils');
const { SOCKET_EVENTS, SOCKET_ROOMS } = require('../../shared/websocket/socket.events');
const logger = require('../../utils/logger');

let io;
const getIO = () => {
  if (!io) {
    try { io = require('../../shared/websocket/socket.init').getIO(); } catch (_) {}
  }
  return io;
};

// ── POST /api/activities ──────────────────────────────────────────────────────

const createActivity = async (req, res, next) => {
  try {
    const activity = await service.createActivity(req.body, req.user, req);

    // Emit real-time event to classroom + teacher rooms
    const socket = getIO();
    if (socket) {
      socket.to(SOCKET_ROOMS.classroom(activity.classRoomId)).emit(
        SOCKET_EVENTS.ACTIVITY_CREATED,
        { activityId: activity.id, studentId: activity.studentId, date: activity.date }
      );
      socket.to(SOCKET_ROOMS.student(activity.studentId)).emit(
        SOCKET_EVENTS.ACTIVITY_CREATED,
        { activityId: activity.id, date: activity.date }
      );
    }

    return sendCreated(res, activity, 'Daily activity recorded successfully');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/activities ───────────────────────────────────────────────────────

const listActivities = async (req, res, next) => {
  try {
    const { items, total, page, limit } = await service.listActivities(req.query, req.user);
    return sendPaginated(res, items, { page, limit, total }, 'Activities retrieved');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/activities/:id ───────────────────────────────────────────────────

const getActivity = async (req, res, next) => {
  try {
    const activity = await service.getActivityById(req.params.id);
    return sendSuccess(res, activity, 'Activity retrieved');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/activities/student/:studentId/date/:date ─────────────────────────

const getActivityByStudentAndDate = async (req, res, next) => {
  try {
    const { studentId, date } = req.params;
    const activity = await service.getActivityByStudentAndDate(studentId, date);
    return sendSuccess(res, activity, 'Activity retrieved');
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/activities/:id ─────────────────────────────────────────────────

const updateActivity = async (req, res, next) => {
  try {
    const activity = await service.updateActivity(req.params.id, req.body, req.user, req);

    // Emit update event
    const socket = getIO();
    if (socket) {
      socket.to(SOCKET_ROOMS.student(activity.studentId)).emit(
        SOCKET_EVENTS.ACTIVITY_UPDATED,
        { activityId: activity.id, date: activity.date }
      );
    }

    return sendSuccess(res, activity, 'Daily activity updated successfully');
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/activities/:id ────────────────────────────────────────────────

const deleteActivity = async (req, res, next) => {
  try {
    await service.deleteActivity(req.params.id, req.user, req);
    return sendSuccess(res, null, 'Daily activity deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createActivity,
  listActivities,
  getActivity,
  getActivityByStudentAndDate,
  updateActivity,
  deleteActivity,
};