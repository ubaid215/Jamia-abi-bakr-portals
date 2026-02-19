// config/config.js — Centralized environment validation
// Fails server startup if required variables are missing.

const { z } = require('zod');

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),

  // Server
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRE: z.string().default('7d'),

  // Redis (optional — app works without it, just no caching)
  REDIS_URL: z.string().optional(),

  // Domain
  DOMAIN: z.string().default('http://localhost'),
});

let config;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  console.error('\n❌ ENVIRONMENT VALIDATION FAILED\n');
  if (error.errors) {
    error.errors.forEach((err) => {
      console.error(`  → ${err.path.join('.')}: ${err.message}`);
    });
  }
  console.error('\nPlease set the required environment variables in your .env file.\n');
  process.exit(1);
}

// Derived values
config.isDev = config.NODE_ENV === 'development';
config.isProd = config.NODE_ENV === 'production';
config.isTest = config.NODE_ENV === 'test';
config.redisEnabled = !!config.REDIS_URL;

module.exports = config;
