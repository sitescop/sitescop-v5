import type { FastifyInstance } from 'fastify';
import { requireAuth, requirePermission } from '../../shared/auth/middleware.js';
import { handleRouteError } from '../../shared/http/handler.js';
import {
  createApiKey,
  deleteApiKey,
  getCompanySettings,
  getEmailDeliveryStatus,
  getSmsDeliveryStatus,
  listApiKeys,
  sendTestEmail,
  sendTestSms,
  updateCompanyPreferences,
  updateCompanyProfile,
} from './settings.service.js';

export async function registerSettingsRoutes(app: FastifyInstance): Promise<void> {
  const auth = [requireAuth()];

  app.get(
    '/api/v1/settings/company',
    { preHandler: [...auth, requirePermission('settings:view')] },
    async (request, reply) => {
      try {
        const data = await getCompanySettings(request.authUser!);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.patch(
    '/api/v1/settings/company',
    { preHandler: [...auth, requirePermission('settings:manage')] },
    async (request, reply) => {
      try {
        const data = await updateCompanyProfile(request.authUser!, request.body as never, request);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.patch(
    '/api/v1/settings/preferences',
    { preHandler: [...auth, requirePermission('settings:manage')] },
    async (request, reply) => {
      try {
        const data = await updateCompanyPreferences(request.authUser!, request.body as never, request);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/settings/email/status',
    { preHandler: [...auth, requirePermission('settings:view')] },
    async (request, reply) => {
      try {
        const data = await getEmailDeliveryStatus(request.authUser!);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/settings/email/test',
    { preHandler: [...auth, requirePermission('settings:manage')] },
    async (request, reply) => {
      try {
        const data = await sendTestEmail(request.authUser!, request.body as never, request);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/settings/sms/status',
    { preHandler: [...auth, requirePermission('settings:view')] },
    async (request, reply) => {
      try {
        const data = await getSmsDeliveryStatus(request.authUser!);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/settings/sms/test',
    { preHandler: [...auth, requirePermission('settings:manage')] },
    async (request, reply) => {
      try {
        const data = await sendTestSms(request.authUser!, request.body as never, request);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/settings/api-keys',
    { preHandler: [...auth, requirePermission('settings:manage')] },
    async (request, reply) => {
      try {
        const apiKeys = await listApiKeys(request.authUser!);
        return reply.send({ apiKeys });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/settings/api-keys',
    { preHandler: [...auth, requirePermission('settings:manage')] },
    async (request, reply) => {
      try {
        const data = await createApiKey(request.authUser!, request.body as never, request);
        return reply.status(201).send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.delete(
    '/api/v1/settings/api-keys/:id',
    { preHandler: [...auth, requirePermission('settings:manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await deleteApiKey(request.authUser!, id, request);
        return reply.send(result);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );
}
