/**
 * shared/websocket/socket.events.js
 * All Socket.io event name constants — single source of truth
 * Used by both server (emitter) and client (listener)
 */

const SOCKET_EVENTS = {
  // ── Connection lifecycle ──────────────────────────────────
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  RECONNECT: 'reconnect',

  // ── Room management ───────────────────────────────────────
  JOIN_ROOM: 'join:room',
  LEAVE_ROOM: 'leave:room',

  // ── Notifications ─────────────────────────────────────────
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_READ_ALL: 'notification:read_all',
  NOTIFICATION_COUNT: 'notification:count',
  NOTIFICATION_BATCH: 'notification:batch',

  // ── Daily Activity ────────────────────────────────────────
  ACTIVITY_CREATED: 'activity:created',
  ACTIVITY_UPDATED: 'activity:updated',

  // ── Weekly Progress ───────────────────────────────────────
  WEEKLY_PROGRESS_GENERATED: 'weekly_progress:generated',
  WEEKLY_PROGRESS_UPDATED: 'weekly_progress:updated',

  // ── Snapshot / Dashboard ──────────────────────────────────
  SNAPSHOT_UPDATED: 'snapshot:updated',
  SNAPSHOT_RISK_ALERT: 'snapshot:risk_alert',

  // ── Goals ─────────────────────────────────────────────────
  GOAL_CREATED: 'goal:created',
  GOAL_UPDATED: 'goal:updated',
  GOAL_ACHIEVED: 'goal:achieved',
  GOAL_AT_RISK: 'goal:at_risk',

  // ── Attendance (cross-module) ─────────────────────────────
  ATTENDANCE_MARKED: 'attendance:marked',

  // ── System ────────────────────────────────────────────────
  PING: 'ping',
  PONG: 'pong',
};

/**
 * Room naming conventions
 * Keeps room names consistent across all emitters
 */
const SOCKET_ROOMS = {
  /** Personal room for a user — receives personal notifications */
  user: (userId) => `user:${userId}`,

  /** All users of a given role */
  role: (role) => `role:${role}`,

  /** All users linked to a classroom */
  classroom: (classRoomId) => `classroom:${classRoomId}`,

  /** Student-specific room (for parent/teacher subscriptions) */
  student: (studentId) => `student:${studentId}`,

  /** Admin broadcast room */
  admin: () => 'role:ADMIN',

  /** Super admin broadcast room */
  superAdmin: () => 'role:SUPER_ADMIN',
};

module.exports = { SOCKET_EVENTS, SOCKET_ROOMS };