/**
 * Retell API proxy route.
 * Creates a web call via Retell API and returns the access token to the client.
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function retellRoutes(fastify) {
  /**
   * POST /retell/create-web-call — create a Retell web call and return the access token.
   */
  fastify.post('/retell/create-web-call', async (request, reply) => {
    try {
      const apiKey = process.env.RETELL_API_KEY;
      const agentId = process.env.RETELL_AGENT_ID;

      if (!apiKey || !agentId) {
        request.log.error('RETELL_API_KEY or RETELL_AGENT_ID not configured');
        return reply.code(500).send({ error: 'Server misconfigured' });
      }

      const response = await fetch('https://api.retellai.com/v2/create-web-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ agent_id: agentId }),
      });

      if (!response.ok) {
        const text = await response.text();
        request.log.error({ status: response.status, body: text }, 'Retell API error');
        return reply.code(502).send({ error: 'Failed to create web call' });
      }

      const data = await response.json();
      return reply.send({
        access_token: data.access_token,
        call_id: data.call_id,
      });
    } catch (err) {
      request.log.error(err, 'Failed to create Retell web call');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
