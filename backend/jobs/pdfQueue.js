// jobs/pdfQueue.js — BullMQ queue for background PDF generation
// Only initializes if Redis is available (graceful fallback to sync generation).

const logger = require('../utils/logger');
const config = require('../config/config');

let pdfQueue = null;
let pdfWorker = null;
let isAvailable = false;

/**
 * Initialize BullMQ queue and worker for async PDF generation.
 * If Redis is not configured, falls back to synchronous PDF generation.
 */
async function initPdfQueue() {
    if (!config.REDIS_URL) {
        logger.info('BullMQ: Redis not configured — PDF generation will run synchronously');
        return;
    }

    try {
        const { Queue, Worker } = require('bullmq');

        const connectionOpts = {
            connection: {
                url: config.REDIS_URL,
                maxRetriesPerRequest: null, // Required by BullMQ
            },
        };

        // Create PDF generation queue
        pdfQueue = new Queue('pdf-generation', connectionOpts);

        // Create worker to process PDF jobs
        pdfWorker = new Worker(
            'pdf-generation',
            async (job) => {
                const { type, data } = job.data;
                logger.info({ jobId: job.id, type }, 'Processing PDF job');

                try {
                    switch (type) {
                        case 'hifz-report': {
                            const HifzPDFController = require('../controllers/HifzPDFController');
                            return await HifzPDFController.generatePdfBuffer(data);
                        }
                        case 'progress-report': {
                            const PDFController = require('../controllers/PDFController');
                            return await PDFController.generatePdfBuffer(data);
                        }
                        default:
                            throw new Error(`Unknown PDF type: ${type}`);
                    }
                } catch (err) {
                    logger.error({ err, jobId: job.id, type }, 'PDF generation job failed');
                    throw err;
                }
            },
            {
                ...connectionOpts,
                concurrency: 2, // Process 2 PDFs at a time
                limiter: {
                    max: 10,
                    duration: 60000, // Max 10 PDFs per minute
                },
            }
        );

        pdfWorker.on('completed', (job) => {
            logger.info({ jobId: job.id }, 'PDF job completed');
        });

        pdfWorker.on('failed', (job, err) => {
            logger.error({ jobId: job?.id, err: err.message }, 'PDF job failed');
        });

        isAvailable = true;
        logger.info('BullMQ: PDF generation queue initialized');
    } catch (err) {
        logger.warn({ err: err.message }, 'BullMQ initialization failed — falling back to sync');
    }
}

/**
 * Enqueue a PDF generation job.
 * If BullMQ is not available, returns null (caller should fall back to sync).
 *
 * @param {string} type - PDF type ('hifz-report' | 'progress-report')
 * @param {Object} data - Data needed to generate the PDF
 * @returns {Promise<Object|null>} Job info or null if queue unavailable
 */
async function enqueuePdf(type, data) {
    if (!pdfQueue || !isAvailable) {
        return null; // Caller should fall back to synchronous generation
    }

    try {
        const job = await pdfQueue.add(type, { type, data }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: { age: 3600 }, // Keep completed jobs for 1 hour
            removeOnFail: { age: 86400 }, // Keep failed jobs for 24 hours
        });

        return { jobId: job.id, status: 'queued' };
    } catch (err) {
        logger.error({ err }, 'Failed to enqueue PDF job');
        return null;
    }
}

/**
 * Get the status of a PDF generation job.
 */
async function getJobStatus(jobId) {
    if (!pdfQueue || !isAvailable) {
        return { error: 'Queue not available' };
    }

    const job = await pdfQueue.getJob(jobId);
    if (!job) {
        return { error: 'Job not found' };
    }

    const state = await job.getState();
    return {
        jobId: job.id,
        state,
        progress: job.progress,
        data: state === 'completed' ? job.returnvalue : undefined,
        failedReason: state === 'failed' ? job.failedReason : undefined,
    };
}

/**
 * Graceful shutdown
 */
async function closePdfQueue() {
    if (pdfWorker) await pdfWorker.close();
    if (pdfQueue) await pdfQueue.close();
}

process.on('SIGINT', closePdfQueue);
process.on('SIGTERM', closePdfQueue);

module.exports = {
    initPdfQueue,
    enqueuePdf,
    getJobStatus,
    closePdfQueue,
    get isAvailable() { return isAvailable; },
};
