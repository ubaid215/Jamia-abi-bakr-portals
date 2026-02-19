// utils/logger.js — Structured logger using Pino
// JSON output in production, pretty-printed in development

const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
    level: isDev ? 'debug' : 'info',
    ...(isDev
        ? {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname',
                },
            },
        }
        : {}),
    // In production, output raw JSON for log aggregators
    serializers: {
        req: (req) => ({
            method: req.method,
            url: req.url,
            remoteAddress: req.remoteAddress,
        }),
        res: (res) => ({
            statusCode: res.statusCode,
        }),
        err: pino.stdSerializers.err,
    },
});

module.exports = logger;
