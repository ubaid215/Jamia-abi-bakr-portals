const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Create a single instance with connection pool management
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error', 'warn'],
  errorFormat: 'pretty',
  
  // Connection pool configuration
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Add connection pool event handlers
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    logger.warn({
      query: e.query,
      duration: `${e.duration}ms`,
      params: e.params,
    }, 'Slow query detected');
  }
});

prisma.$on('error', (e) => {
  logger.error({ error: e.message }, 'Prisma error');
});

// Connection management with retry logic
let isConnected = false;

const connectWithRetry = async (retries = 3, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      isConnected = true;
      logger.info('✅ Database connected successfully');
      return;
    } catch (error) {
      logger.error(`Database connection attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Connect on startup
connectWithRetry().catch(error => {
  logger.error('Failed to connect to database after all retries:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  if (isConnected) {
    await prisma.$disconnect();
    logger.info('Database disconnected gracefully');
  }
});

module.exports = prisma;