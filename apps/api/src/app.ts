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
import { registerCalendarRoutes } from './modules/calendar/calendar.routes.js';
import { registerSearchRoutes } from './modules/search/search.routes.js';
import { registerPortalRoutes } from './modules/portal/portal.routes.js';
import { getSmtpConfigStatus } from './shared/email/email-config.js';
import { isStripeConfigured } from './modules/portal/stripe.service.js';
import { getTwilioConfigStatus, isTwilioConfigured } from './shared/sms/sms-config.js';

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

  app.get('/api/v1/health', async () => {
    const smtp = getSmtpConfigStatus();
    const email = config.isProduction
      ? { configured: smtp.configured }
      : {
          configured: smtp.configured,
          host: smtp.host || null,
          user: smtp.user || null,
          reason: smtp.reason,
        };
    return {
      status: 'ok',
      version: '5.0.0',
      phase: '8-complete',
      email,
      stripe: { configured: isStripeConfigured() },
      sms: { configured: isTwilioConfigured() },
    };
  });

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
  await registerCalendarRoutes(app);
  await registerSearchRoutes(app);
  await registerPortalRoutes(app);

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
  const smtp = getSmtpConfigStatus();
  if (smtp.configured) {
    app.log.info(`Email SMTP ready: ${smtp.user} via ${smtp.host}:${smtp.port}`);
  } else {
    app.log.warn(`Email SMTP not ready: ${smtp.reason}`);
  }
  const twilio = getTwilioConfigStatus();
  if (twilio.configured) {
    app.log.info(`Twilio SMS ready from ${twilio.fromNumber}`);
  } else {
    app.log.warn(`Twilio SMS not ready: ${twilio.reason}`);
  }
  await app.listen({ port: config.api.port, host: config.api.host });
  app.log.info(`SiteScop API listening on http://${config.api.host}:${config.api.port}`);
  return app;
}
