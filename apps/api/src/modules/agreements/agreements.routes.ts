import type { FastifyInstance } from 'fastify';
import { JobType } from '@prisma/client';
import { requireAuth, requirePermission } from '../../shared/auth/middleware.js';
import { handleRouteError } from '../../shared/http/handler.js';
import {
  cancelAgreement,
  createAgreement,
  createAgreementFromJob,
  createAndSendAgreement,
  declinePublicAgreement,
  getAgreement,
  getAgreementPdfForUser,
  getAgreementTemplate,
  getPublicAgreement,
  listAgreements,
  markAgreementViewed,
  sendAgreement,
  signPublicAgreement,
  updateAgreement,
  updateAgreementTemplate,
} from './agreements.service.js';

export async function registerAgreementsRoutes(app: FastifyInstance): Promise<void> {
  const auth = [requireAuth()];

  app.get(
    '/api/v1/agreements/public/:token',
    async (request, reply) => {
      try {
        const { token } = request.params as { token: string };
        const data = await getPublicAgreement(token);
        return reply.send({ agreement: data });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/agreements/public/:token/view',
    async (request, reply) => {
      try {
        const { token } = request.params as { token: string };
        const data = await markAgreementViewed(token, request);
        return reply.send({ agreement: data });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/agreements/public/:token/sign',
    async (request, reply) => {
      try {
        const { token } = request.params as { token: string };
        const result = await signPublicAgreement(token, request.body as never, request);
        return reply.send(result);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/agreements/public/:token/decline',
    async (request, reply) => {
      try {
        const { token } = request.params as { token: string };
        const result = await declinePublicAgreement(token, request.body as never, request);
        return reply.send(result);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/agreements',
    { preHandler: [...auth, requirePermission('agreements:view')] },
    async (request, reply) => {
      try {
        const data = await listAgreements(request.authUser!, request.query as never);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/agreements/templates/:type',
    { preHandler: [...auth, requirePermission('agreements:view')] },
    async (request, reply) => {
      try {
        const { type } = request.params as { type: JobType };
        const template = await getAgreementTemplate(request.authUser!, type);
        return reply.send({ template });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.put(
    '/api/v1/agreements/templates/:type',
    { preHandler: [...auth, requirePermission('agreements:manage')] },
    async (request, reply) => {
      try {
        const { type } = request.params as { type: JobType };
        const template = await updateAgreementTemplate(
          request.authUser!,
          type,
          (request.body as { template: never }).template,
          request,
        );
        return reply.send({ template });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/agreements/:id/download',
    { preHandler: [...auth, requirePermission('agreements:view')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { buffer, fileName } = await getAgreementPdfForUser(request.authUser!, id);
        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="${fileName}"`)
          .send(buffer);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/agreements/:id',
    { preHandler: [...auth, requirePermission('agreements:view')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const agreement = await getAgreement(request.authUser!, id);
        return reply.send({ agreement });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/agreements/send-new',
    { preHandler: [...auth, requirePermission('agreements:send')] },
    async (request, reply) => {
      try {
        const result = await createAndSendAgreement(request.authUser!, request.body as never, request);
        return reply.status(201).send(result);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/agreements',
    { preHandler: [...auth, requirePermission('agreements:send')] },
    async (request, reply) => {
      try {
        const agreement = await createAgreement(request.authUser!, request.body as never, request);
        return reply.status(201).send({ agreement });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/agreements/from-job/:jobId',
    { preHandler: [...auth, requirePermission('agreements:send')] },
    async (request, reply) => {
      try {
        const { jobId } = request.params as { jobId: string };
        const agreement = await createAgreementFromJob(request.authUser!, jobId, request);
        return reply.status(201).send({ agreement });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.patch(
    '/api/v1/agreements/:id',
    { preHandler: [...auth, requirePermission('agreements:send')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const agreement = await updateAgreement(request.authUser!, id, request.body as never, request);
        return reply.send({ agreement });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/agreements/:id/send',
    { preHandler: [...auth, requirePermission('agreements:send')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await sendAgreement(request.authUser!, id, request);
        return reply.send(result);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/agreements/:id/cancel',
    { preHandler: [...auth, requirePermission('agreements:manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const agreement = await cancelAgreement(request.authUser!, id, request);
        return reply.send({ agreement });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );
}
