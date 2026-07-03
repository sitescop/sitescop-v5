import type { FastifyInstance } from 'fastify';
import { requireAuth, requirePermission } from '../../shared/auth/middleware.js';
import { handleRouteError } from '../../shared/http/handler.js';
import {
  acceptJob,
  archiveJob,
  assignJob,
  cancelJob,
  completeJob,
  createJob,
  declineJob,
  getJob,
  listInspectors,
  listJobs,
  permanentDeleteJob,
  restoreJob,
  sendJobAgreement,
  softDeleteJob,
  startJob,
  unarchiveJob,
  updateJob,
} from './jobs.service.js';

export async function registerJobsRoutes(app: FastifyInstance): Promise<void> {
  const auth = [requireAuth()];

  app.get(
    '/api/v1/jobs',
    { preHandler: [...auth, requirePermission('jobs:view')] },
    async (request, reply) => {
      try {
        const query = request.query as Record<string, string>;
        const data = await listJobs(request.authUser!, query);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/jobs/inspectors',
    { preHandler: [...auth, requirePermission('jobs:assign')] },
    async (request, reply) => {
      try {
        const { companyId } = request.query as { companyId?: string };
        const inspectors = await listInspectors(request.authUser!, companyId);
        return reply.send({ inspectors });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/jobs/:id',
    { preHandler: [...auth, requirePermission('jobs:view')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const job = await getJob(request.authUser!, id);
        return reply.send({ job });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/jobs',
    { preHandler: [...auth, requirePermission('jobs:create')] },
    async (request, reply) => {
      try {
        const job = await createJob(request.authUser!, request.body as never, request);
        return reply.status(201).send({ job });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.patch(
    '/api/v1/jobs/:id',
    { preHandler: [...auth, requirePermission('jobs:create')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const job = await updateJob(request.authUser!, id, request.body as never, request);
        return reply.send({ job });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/jobs/:id/send-agreement',
    { preHandler: [...auth, requirePermission('agreements:send')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await sendJobAgreement(request.authUser!, id, request);
        return reply.send(result);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/jobs/:id/assign',
    { preHandler: [...auth, requirePermission('jobs:assign')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const job = await assignJob(request.authUser!, id, request.body as never, request);
        return reply.send({ job });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/jobs/:id/accept',
    { preHandler: [...auth, requirePermission('jobs:accept')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const job = await acceptJob(request.authUser!, id, request);
        return reply.send({ job });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/jobs/:id/decline',
    { preHandler: [...auth, requirePermission('jobs:accept')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const job = await declineJob(request.authUser!, id, request.body as never, request);
        return reply.send({ job });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/jobs/:id/start',
    { preHandler: [...auth, requirePermission('jobs:complete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const job = await startJob(request.authUser!, id, request);
        return reply.send({ job });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/jobs/:id/complete',
    { preHandler: [...auth, requirePermission('jobs:complete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const job = await completeJob(request.authUser!, id, request);
        return reply.send({ job });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/jobs/:id/cancel',
    { preHandler: [...auth, requirePermission('jobs:create')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const job = await cancelJob(request.authUser!, id, request);
        return reply.send({ job });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/jobs/:id/archive',
    { preHandler: [...auth, requirePermission('jobs:archive')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const job = await archiveJob(request.authUser!, id, request);
        return reply.send({ job });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/jobs/:id/unarchive',
    { preHandler: [...auth, requirePermission('jobs:archive')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const job = await unarchiveJob(request.authUser!, id, request);
        return reply.send({ job });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.delete(
    '/api/v1/jobs/:id',
    { preHandler: [...auth, requirePermission('jobs:delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const job = await softDeleteJob(request.authUser!, id, request);
        return reply.send({ job });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/jobs/:id/restore',
    { preHandler: [...auth, requirePermission('jobs:delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const job = await restoreJob(request.authUser!, id, request);
        return reply.send({ job });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.delete(
    '/api/v1/jobs/:id/permanent',
    { preHandler: [...auth, requirePermission('jobs:delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await permanentDeleteJob(request.authUser!, id, request);
        return reply.send(result);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );
}
