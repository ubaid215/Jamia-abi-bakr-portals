/**
 * shared/websocket/socket.auth.js
 * Authenticates Socket.io connections using the same JWT as HTTP requests
 * Attached as a middleware on the io instance: io.use(socketAuth)
 */

const jwt = require('jsonwebtoken');
const { cacheGet, cacheSet } = require('../../db/redisClient');
const prisma = require('../../db/prismaClient');
const config = require('../../config/config');
const logger = require('../../utils/logger');

const JWT_SECRET = config.JWT_SECRET;

/**
 * Socket.io authentication middleware
 * Reads JWT from:
 *   1. handshake.auth.token     (recommended — socket.io client: { auth: { token } })
 *   2. handshake.headers.authorization  (Bearer token fallback)
 *   3. handshake.query.token    (last resort — less secure)
 */
const socketAuth = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null) ||
      socket.handshake.query?.token;

    if (!token) {
      logger.warn({ socketId: socket.id }, 'Socket: missing auth token');
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Try Redis cache first
    const cacheKey = `user:${decoded.userId}`;
    let user = await cacheGet(cacheKey);

    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
          status: true,
          passwordChangedAt: true,
        },
      });

      if (user) {
        await cacheSet(cacheKey, user, 300);
      }
    }

    if (!user) {
      return next(new Error('User not found'));
    }

    if (user.status !== 'ACTIVE') {
      return next(new Error('Account is not active'));
    }

    // Attach user to socket for use in event handlers
    socket.user = user;

    logger.info(
      { userId: user.id, role: user.role, socketId: socket.id },
      'Socket: authenticated'
    );

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    logger.error({ err }, 'Socket: auth failed');
    next(new Error('Authentication failed'));
  }
};

module.exports = { socketAuth };