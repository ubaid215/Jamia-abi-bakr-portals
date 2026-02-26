/**
 * config/scheduler.config.js
 * All cron expressions and scheduler settings in one place
 * Uses node-cron syntax: second(optional) minute hour day month weekday
 *
 * Timezone: Asia/Karachi (PKT, UTC+5)
 */

const CRON_EXPRESSIONS = {
  // ── Progress & Snapshots ──────────────────────────────────────────────────
  /** Every Friday at 8:00 PM PKT — generate weekly progress for all classrooms */
  WEEKLY_PROGRESS_GENERATE: '0 20 * * 5',

  /** Every day at 2:00 AM — refresh stale progress snapshots */
  SNAPSHOT_DAILY_REFRESH: '0 2 * * *',

  /** Every day at 6:00 AM — update attendance streaks */
  STREAK_UPDATE: '0 6 * * *',

  // ── Goals ─────────────────────────────────────────────────────────────────
  /** Every day at 8:00 AM — check goals for risk/achieved/failed status */
  GOALS_RISK_CHECK: '0 8 * * *',

  // ── Notifications ─────────────────────────────────────────────────────────
  /** Every day at 3:00 AM — delete expired notifications */
  NOTIFICATION_CLEANUP: '0 3 * * *',

  /** Every Sunday at 10:00 PM — send weekly progress notification to parents */
  PARENT_WEEKLY_REPORT: '0 22 * * 0',

  // ── System ────────────────────────────────────────────────────────────────
  /** Every hour — check for audit log anomalies */
  AUDIT_CHECK: '0 * * * *',
};

const SCHEDULER_CONFIG = {
  /** Timezone for all cron jobs */
  timezone: 'Asia/Karachi',

  /** Batch size for bulk operations */
  batchSize: 20,

  /** Delay between batches (ms) to avoid DB overload */
  batchDelay: 200,

  /** Max retries on job failure */
  maxRetries: 3,

  /** Delay between retries (ms) */
  retryDelay: 5000,
};

module.exports = { CRON_EXPRESSIONS, SCHEDULER_CONFIG };