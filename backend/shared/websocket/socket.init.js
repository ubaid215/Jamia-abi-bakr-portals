/**
 * shared/websocket/socket.init.js
 * Initializes Socket.io server, attaches auth, manages connections
 *
 * Usage in app.js / server.js:
 *   const { createSocketServer, getIO } = require('./shared/websocket/socket.init');
 *   const server = http.createServer(app);
 *   createSocketServer(server);
 */

const { Server } = require('socket.io');
const { socketAuth } = require('./socket.auth');
const { joinUserRooms } = require('./socket.rooms');
const { SOCKET_EVENTS } = require('./socket.events');
const config = require('../../config/config');
const logger = require('../../utils/logger');

let io = null;

/**
 * Create and configure the Socket.io server
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
const createSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.ALLOWED_ORIGINS || [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://jamia.khanqahsaifia.com',
        'https://www.jamia.khanqahsaifia.com',
      ],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Performance settings
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB max message size
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    perMessageDeflate: {
      threshold: 1024, // Compress messages > 1KB
    },
  });

  // ── Auth middleware ───────────────────────────────────────
  io.use(socketAuth);

  // ── Connection handler ────────────────────────────────────
  io.on(SOCKET_EVENTS.CONNECT, async (socket) => {
    logger.info(
      { socketId: socket.id, userId: socket.user?.id, role: socket.user?.role },
      'Socket: client connected'
    );

    // Auto-join role/personal/classroom rooms
    await joinUserRooms(socket);

    // ── Ping/Pong (heartbeat) ─────────────────────────────
    socket.on(SOCKET_EVENTS.PING, () => {
      socket.emit(SOCKET_EVENTS.PONG, { timestamp: new Date().toISOString() });
    });

    // ── Manual room join (for specific subscriptions) ─────
    socket.on(SOCKET_EVENTS.JOIN_ROOM, (roomName) => {
      // Security: users can only join rooms they're authorized for
      const allowed = isRoomAllowed(socket.user, roomName);
      if (allowed) {
        socket.join(roomName);
        logger.info({ userId: socket.user.id, room: roomName }, 'Socket: joined room');
      } else {
        logger.warn({ userId: socket.user.id, room: roomName }, 'Socket: unauthorized room join');
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Not authorized to join this room' });
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_ROOM, (roomName) => {
      socket.leave(roomName);
    });

    // ── Disconnect ────────────────────────────────────────
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      logger.info(
        { socketId: socket.id, userId: socket.user?.id, reason },
        'Socket: client disconnected'
      );
    });

    socket.on('error', (err) => {
      logger.error({ err, socketId: socket.id }, 'Socket: error');
    });
  });

  logger.info('✅ Socket.io server initialized');
  return io;
};

/**
 * Get the io instance (after createSocketServer has been called)
 * Used by emitters across all modules
 * @returns {import('socket.io').Server}
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call createSocketServer(httpServer) first.');
  }
  return io;
};

/**
 * Security check — validate a user can join a room they request
 * @param {Object} user
 * @param {string} roomName
 * @returns {boolean}
 */
const isRoomAllowed = (user, roomName) => {
  if (!user || !roomName) return false;

  // Admins can join any room
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;

  // Users can always join their own personal room
  if (roomName === `user:${user.id}`) return true;

  // Teachers can join classroom rooms only (enforced by DB check ideally)
  if (user.role === 'TEACHER' && roomName.startsWith('classroom:')) return true;

  return false;
};

module.exports = { createSocketServer, getIO };