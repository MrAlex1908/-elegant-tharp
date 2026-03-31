import { randomUUID } from 'node:crypto';
import { createSession, getSession, linkCallId } from '../services/sessionStore.js';

/**
 * Session management routes.
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function sessionRoutes(fastify) {
  /**
   * POST /session/create — create a new visitor session.
   */
  fastify.post('/session/create', async (request, reply) => {
    try {
      const sessionId = randomUUID();
      const { retell_call_id } = request.body || {};

      createSession(sessionId, { callId: retell_call_id || null });

      return reply.code(201).send({
        session_id: sessionId,
        sse_url: `/sse/${sessionId}`,
      });
    } catch (err) {
      request.log.error(err, 'Failed to create session');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * POST /session/:sessionId/link — link a Retell call_id to an existing session.
   */
  fastify.post('/session/:sessionId/link', async (request, reply) => {
    try {
      const { sessionId } = request.params;
      const { call_id } = request.body || {};

      if (!call_id) {
        return reply.code(400).send({ error: 'call_id is required' });
      }

      const session = getSession(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      linkCallId(sessionId, call_id);
      return reply.send({ status: 'linked', session_id: sessionId, call_id });
    } catch (err) {
      request.log.error(err, 'Failed to link session');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
