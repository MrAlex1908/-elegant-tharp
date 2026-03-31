import { getSessionByCallId } from '../services/sessionStore.js';

/** Human-readable result messages per tool type. */
const RESULT_MESSAGES = {
  scroll_to_section: (args) => `Scrolled to ${args.section_id} section`,
  highlight_text: (args) => `Highlighted: ${args.text_query}`,
  show_popup: (args) => `Showing ${args.popup_type}`,
};

/**
 * Push a command to the browser via the session's SSE stream.
 * Fire-and-forget — never blocks the webhook response.
 * @param {object} session
 * @param {string} type
 * @param {object} data
 * @param {import('pino').Logger} log
 */
function pushToSSE(session, type, data, log) {
  try {
    if (session?.sseResponse) {
      const payload = JSON.stringify({ type, data });
      session.sseResponse.write(`event: command\ndata: ${payload}\n\n`);
    }
  } catch (err) {
    log.warn(err, 'Failed to push SSE command');
  }
}

/**
 * Retell webhook route.
 * Registers a raw body parser so the original buffer is available for
 * signature verification (X-Retell-Signature).
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function webhookRoutes(fastify) {
  // Parse application/json as raw buffer so we can verify the signature later
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => done(null, body),
  );

  /**
   * POST /webhook/retell — receives tool call requests from Retell.ai.
   *
   * Retell payload format:
   * {
   *   "name": "scroll_to_section",
   *   "call": { "call_id": "xxx", ... },
   *   "args": { "section_id": "faq" }
   * }
   */
  fastify.post('/webhook/retell', async (request, reply) => {
    try {
      const rawBody = request.body.toString('utf-8');
      const body = JSON.parse(rawBody);

      const toolName = body.name;
      const callId = body.call?.call_id;
      const args = body.args || {};

      if (!toolName) {
        return reply.code(400).send({ error: 'Missing required field: name' });
      }

      // Find the session linked to this Retell call
      const session = callId ? getSessionByCallId(callId) : null;

      // Push command to browser via SSE (fire-and-forget)
      pushToSSE(session, toolName, args, request.log);

      // Build result message
      const messageFn = RESULT_MESSAGES[toolName];
      const result = messageFn ? messageFn(args) : 'Action completed';

      // Respond to Retell with a plain string
      return reply.send(result);
    } catch (err) {
      request.log.error(err, 'Webhook handler error');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
