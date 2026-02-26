/**
 * modules/student-goals/goals.controller.js
 */

const service = require('./goals.service');
const { sendSuccess, sendCreated, sendPaginated } = require('../../shared/utils/response.utils');
const { SOCKET_EVENTS, SOCKET_ROOMS } = require('../../shared/websocket/socket.events');

let io;
const getIO = () => {
  if (!io) { try { io = require('../../shared/websocket/socket.init').getIO(); } catch (_) {} }
  return io;
};

const createGoal = async (req, res, next) => {
  try {
    const goal = await service.createGoal(req.body, req.user, req);
    const socket = getIO();
    if (socket) {
      socket.to(SOCKET_ROOMS.student(goal.studentId)).emit(SOCKET_EVENTS.GOAL_CREATED, { goalId: goal.id, title: goal.title });
    }
    return sendCreated(res, goal, 'Goal created successfully');
  } catch (err) { next(err); }
};

const updateGoal = async (req, res, next) => {
  try {
    const goal = await service.updateGoal(req.params.id, req.body, req.user, req);
    const socket = getIO();
    if (socket) {
      const event = goal.status === 'ACHIEVED' ? SOCKET_EVENTS.GOAL_ACHIEVED : SOCKET_EVENTS.GOAL_UPDATED;
      socket.to(SOCKET_ROOMS.student(goal.studentId)).emit(event, { goalId: goal.id, status: goal.status, progress: goal.progress });
    }
    return sendSuccess(res, goal, 'Goal updated successfully');
  } catch (err) { next(err); }
};

const deleteGoal = async (req, res, next) => {
  try {
    await service.deleteGoal(req.params.id, req.user, req);
    return sendSuccess(res, null, 'Goal deleted');
  } catch (err) { next(err); }
};

const getGoal = async (req, res, next) => {
  try {
    const goal = await service.getGoalById(req.params.id);
    return sendSuccess(res, goal);
  } catch (err) { next(err); }
};

const listGoals = async (req, res, next) => {
  try {
    const { items, total, page, limit } = await service.listGoals(req.query, req.user);
    return sendPaginated(res, items, { page, limit, total });
  } catch (err) { next(err); }
};

module.exports = { createGoal, updateGoal, deleteGoal, getGoal, listGoals };