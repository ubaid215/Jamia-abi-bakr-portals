const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

const isDev = process.env.NODE_ENV !== "production";

// Connection pool size: default 10, configurable via DB_POOL_SIZE env var
// PgBouncer recommended in production — set DB_POOL_SIZE=1 if using PgBouncer in transaction mode
const poolSize = parseInt(process.env.DB_POOL_SIZE) || 10;

const prisma =
  global.prisma ||
  new PrismaClient({
    log: isDev
      ? [
        { level: "query", emit: "event" },
        { level: "warn", emit: "stdout" },
        { level: "error", emit: "stdout" },
      ]
      : [{ level: "error", emit: "stdout" }],
    datasourceUrl: process.env.DATABASE_URL
      ? `${process.env.DATABASE_URL}${process.env.DATABASE_URL.includes("?") ? "&" : "?"}connection_limit=${poolSize}`
      : undefined,
  });

// Log slow queries in development (> 200ms)
if (isDev && prisma.$on) {
  prisma.$on("query", (e) => {
    if (e.duration > 200) {
      logger.warn(
        { duration: `${e.duration}ms`, query: e.query.substring(0, 200) },
        "Slow Prisma query detected"
      );
    }
  });
}

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`Prisma disconnect on ${signal}`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGQUIT", shutdown);

module.exports = prisma;

