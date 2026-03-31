import Fastify from 'fastify';
import cors from '@fastify/cors';
import { startCleanup, stopCleanup } from './services/sessionStore.js';

import healthRoutes from './routes/health.js';
import webhookRoutes from './routes/webhook.js';
import sseRoutes from './routes/sse.js';
import sessionRoutes from './routes/session.js';
import retellRoutes from './routes/retell.js';

const PORT = parseInt(process.env.PORT || '8080', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// --- Plugins ---
await app.register(cors, {
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'OPTIONS'],
});

// --- Routes ---
await app.register(healthRoutes);
await app.register(webhookRoutes);
await app.register(sseRoutes);
await app.register(sessionRoutes);
await app.register(retellRoutes);

// --- Session cleanup ---
startCleanup();

// --- Graceful shutdown ---
const shutdown = async () => {
  stopCleanup();
  await app.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// --- Start ---
try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`Server listening on port ${PORT}`);
} catch (err) {
  app.log.fatal(err, 'Failed to start server');
  process.exit(1);
}
