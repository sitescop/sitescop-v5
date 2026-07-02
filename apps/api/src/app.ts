import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerDashboardRoutes } from './modules/dashboard/dashboard.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn',
    },
    trustProxy: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: config.isProduction ? undefined : false,
  });

  await app.register(cors, {
    origin: config.webAppUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(cookie, {
    secret: config.session.secret,
    hook: 'onRequest',
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  app.get('/api/v1/health', async () => ({
    status: 'ok',
    version: '5.0.0',
    phase: '0',
  }));

  await registerAuthRoutes(app);
  await registerDashboardRoutes(app);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    reply.status(500).send({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });

  return app;
}

export async function startServer() {
  const app = await buildApp();
  await app.listen({ port: config.api.port, host: config.api.host });
  app.log.info(`SiteScop API listening on http://${config.api.host}:${config.api.port}`);
  return app;
}
