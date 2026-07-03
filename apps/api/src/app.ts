import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerDashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { registerJobsRoutes } from './modules/jobs/jobs.routes.js';
import { registerCrmRoutes } from './modules/crm/crm.routes.js';
import { registerSettingsRoutes } from './modules/settings/settings.routes.js';
import { registerAdminRoutes } from './modules/admin/admin.routes.js';
import { registerAgreementsRoutes } from './modules/agreements/agreements.routes.js';
import { registerInspectionsRoutes } from './modules/inspections/inspections.routes.js';
import { registerReportsRoutes } from './modules/reports/reports.routes.js';
import { registerNotificationsRoutes } from './modules/notifications/notifications.routes.js';
import { registerInvoicesRoutes } from './modules/invoices/invoices.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn',
    },
    trustProxy: true,
    bodyLimit: 50 * 1024 * 1024,
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
    phase: '6',
  }));

  await registerAuthRoutes(app);
  await registerDashboardRoutes(app);
  await registerJobsRoutes(app);
  await registerCrmRoutes(app);
  await registerSettingsRoutes(app);
  await registerAdminRoutes(app);
  await registerAgreementsRoutes(app);
  await registerInspectionsRoutes(app);
  await registerReportsRoutes(app);
  await registerNotificationsRoutes(app);
  await registerInvoicesRoutes(app);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number') {
      const fastifyError = error as Error & { statusCode: number; code?: string };
      if (fastifyError.statusCode < 500) {
        return reply.status(fastifyError.statusCode).send({
          error: fastifyError.message,
          code: fastifyError.code ?? 'REQUEST_ERROR',
        });
      }
    }
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
