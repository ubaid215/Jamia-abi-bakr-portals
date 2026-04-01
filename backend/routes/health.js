const express = require('express');
const router = express.Router();
const prisma = require('../db/prismaClient');
const { redisHealthCheck } = require('../db/redisClient');

router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = { status: 'up' };
  } catch (error) {
    health.status = 'unhealthy';
    health.services.database = { status: 'down', error: error.message };
  }

  // Check Redis
  const redisHealth = await redisHealthCheck();
  health.services.redis = redisHealth;

  // Get connection stats
  try {
    const result = await prisma.$queryRaw`
      SELECT count(*) as active_connections 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    health.services.database.activeConnections = parseInt(result[0].active_connections);
  } catch (error) {
    // Ignore
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

module.exports = router;