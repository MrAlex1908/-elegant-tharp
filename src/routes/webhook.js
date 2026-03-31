import { getSessionByCallId } from '../services/sessionStore.js';

/** Human-readable result messages per tool type. */
const RESULT_MESSAGES = {
  scroll_to_section: (args) => `Scrolled to ${args.section_id} section`,
  highlight_text: (args) => `Highlighted text: ${args.text_query}`,
  show_popup: (args) => `Showing ${args.popup_type} popup`,
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
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function webhookRoutes(fastify) {
  /**
   * POST /webhook/retell — receives tool call requests from Retell.ai.
   */
  fastify.post('/webhook/retell', async (request, reply) => {
    try {
      const { call_id, tool_call_id, name, arguments: args } = request.body || {};

      if (!tool_call_id || !name) {
        return reply.code(400).send({ error: 'Missing required fields: tool_call_id, name' });
      }

      // Find the session linked to this Retell call
      const session = call_id ? getSessionByCallId(call_id) : null;

      // Push command to browser via SSE (fire-and-forget)
      pushToSSE(session, name, args || {}, request.log);

      // Build result message
      const messageFn = RESULT_MESSAGES[name];
      const result = messageFn ? messageFn(args || {}) : `Executed ${name}`;

      // Respond to Retell immediately
      return reply.send({ tool_call_id, result });
    } catch (err) {
      request.log.error(err, 'Webhook handler error');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
