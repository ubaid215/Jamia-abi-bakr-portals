/**
 * shared/scheduler/scheduler.init.js
 * Bootstraps all cron jobs using node-cron
 * Called from app.js after server starts
 */

const cron = require('node-cron');
const logger = require('../../utils/logger');

const jobs = [];

/**
 * Register a cron job safely
 * @param {string} name - Human-readable name
 * @param {string} expression - Cron expression
 * @param {Function} task - Async function to execute
 */
const registerJob = (name, expression, task) => {
  if (!cron.validate(expression)) {
    logger.error({ name, expression }, 'Scheduler: invalid cron expression');
    return;
  }

  const job = cron.schedule(expression, async () => {
    const start = Date.now();
    logger.info({ job: name }, 'Scheduler: job started');
    try {
      await task();
      logger.info({ job: name, duration: `${Date.now() - start}ms` }, 'Scheduler: job completed');
    } catch (err) {
      logger.error({ err, job: name, duration: `${Date.now() - start}ms` }, 'Scheduler: job failed');
    }
  }, { scheduled: false }); // Don't auto-start — we start manually

  jobs.push({ name, expression, job });
  logger.info({ job: name, expression }, 'Scheduler: job registered');
};

/**
 * Start all registered jobs
 */
const startAll = () => {
  for (const { name, job } of jobs) {
    job.start();
    logger.info({ job: name }, 'Scheduler: started');
  }
};

/**
 * Stop all jobs (for graceful shutdown)
 */
const stopAll = () => {
  for (const { name, job } of jobs) {
    job.stop();
    logger.info({ job: name }, 'Scheduler: stopped');
  }
};

module.exports = { registerJob, startAll, stopAll };