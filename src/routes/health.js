/**
 * Health check route.
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function healthRoutes(fastify) {
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
