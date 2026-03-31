const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

const isDev = process.env.NODE_ENV !== "production";

// ─── Supabase / PgBouncer pool strategy ───────────────────────────────────────

//
const usingPgBouncer =
  process.env.DATABASE_URL?.includes("pgbouncer=true") ||
  process.env.DATABASE_URL?.includes("6543");           // Supabase pooler port

const poolSize = usingPgBouncer
  ? 1                                                    // PgBouncer owns the pool
  : parseInt(process.env.DB_POOL_SIZE) || 25;           // raised from 10 → 25

// Build the final connection URL with correct pool params
function buildDatabaseUrl() {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;

  const separator = base.includes("?") ? "&" : "?";

  if (usingPgBouncer) {
    // Ensure pgbouncer=true and connection_limit=1 are set
    let url = base;
    if (!url.includes("pgbouncer=true")) url += `${separator}pgbouncer=true`;
    if (!url.includes("connection_limit=")) url += "&connection_limit=1";
    return url;
  }

  // Direct connection — apply our pool size and a generous timeout
  let url = base;
  if (!url.includes("connection_limit=")) url += `${separator}connection_limit=${poolSize}`;
  if (!url.includes("pool_timeout="))     url += "&pool_timeout=30";
  if (!url.includes("connect_timeout="))  url += "&connect_timeout=15";
  return url;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    log: isDev
      ? [
          { level: "query", emit: "event" },
          { level: "warn",  emit: "stdout" },
          { level: "error", emit: "stdout" },
        ]
      : [{ level: "error", emit: "stdout" }],
    datasourceUrl: buildDatabaseUrl(),
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

process.on("SIGINT",  shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGQUIT", shutdown);

module.exports = prisma;