import Fastify from 'fastify';
/** Internal operational routes only; this does not add business operations to /api/v1. */
export function createServer(probe: () => Promise<void>) {
  const app = Fastify({ logger: false, trustProxy: false, bodyLimit: 16384,
    requestTimeout: 5000, connectionTimeout: 5000 });
  app.get('/health/live', async () => ({ status: 'alive' }));
  app.get('/health/ready', async (_request, reply) => {
    try { await probe(); return { status: 'ready' }; }
    catch { return reply.code(503).send({ status: 'unavailable' }); }
  });
  app.setErrorHandler((_error, _request, reply) => {
    reply.code(500).send({ error: 'INTERNAL_ERROR' });
  });
  return app;
}
