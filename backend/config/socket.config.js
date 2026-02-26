/**
 * config/socket.config.js
 * Centralized Socket.io server configuration
 */

const config = require('./config');

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://jamia.khanqahsaifia.com',
  'https://www.jamia.khanqahsaifia.com',
];

const socketConfig = {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST'],
  },

  // Connection settings
  pingTimeout: 60000,        // 60s — how long to wait for pong before disconnect
  pingInterval: 25000,       // 25s — how often to send ping
  connectTimeout: 45000,     // 45s — handshake timeout
  maxHttpBufferSize: 1e6,    // 1MB — max message size

  // Transport
  transports: ['websocket', 'polling'],
  allowUpgrades: true,

  // Compression
  perMessageDeflate: {
    threshold: 1024,         // Only compress messages > 1KB
  },

  // Adapter (for multi-instance/Redis pub-sub scaling — configure if needed)
  // adapter: require('@socket.io/redis-adapter').createAdapter(pubClient, subClient),
};

// Room TTL constants (ms)
const ROOM_CONFIG = {
  MAX_USERS_PER_ROOM: 500,
  ROOM_CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
};

// Rate limiting for socket events (events per minute per socket)
const SOCKET_RATE_LIMITS = {
  DEFAULT: 60,
  PING: 120,
  BROADCAST: 10,
};

module.exports = {
  socketConfig,
  ALLOWED_ORIGINS,
  ROOM_CONFIG,
  SOCKET_RATE_LIMITS,
};