/**
 * Pino logger instance.
 * Fastify uses Pino by default; this module provides a standalone logger
 * for use outside of request context.
 */

import { pino } from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});

export default logger;
