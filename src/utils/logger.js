/**
 * Pino logger instance.
 * Fastify uses Pino by default; this module provides a standalone logger
 * for use outside of request context.
 */

import { pino } from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export default logger;
