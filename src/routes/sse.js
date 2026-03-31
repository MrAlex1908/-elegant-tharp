import { getSession, setSseResponse, removeSession } from '../services/sessionStore.js';

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

/**
 * SSE streaming route.
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function sseRoutes(fastify) {
  /**
   * GET /sse/:sessionId — open an SSE stream for the visitor's browser.
   */
  fastify.get('/sse/:sessionId', async (request, reply) => {
    const { sessionId } = request.params;
    const session = getSession(sessionId);

    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Store the raw response for pushing commands later
    setSseResponse(sessionId, reply.raw);

    // Send initial connected event
    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ status: 'ok' })}\n\n`);

    // Heartbeat to keep the connection alive (Cloud Run 60s idle timeout)
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(':heartbeat\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, HEARTBEAT_INTERVAL);

    // Cleanup on client disconnect
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      // Clear SSE response from session but keep session alive
      // (the Retell call may still be active)
      const s = getSession(sessionId);
      if (s) {
        s.sseResponse = null;
      }
      request.log.info({ sessionId }, 'SSE client disconnected');
    });

    // Prevent Fastify from ending the response
    await reply;
  });
}
