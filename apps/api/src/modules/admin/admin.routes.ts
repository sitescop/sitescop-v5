import type { FastifyInstance } from 'fastify';
import { requireAuth, requirePermission } from '../../shared/auth/middleware.js';
import { handleRouteError } from '../../shared/http/handler.js';
import { listJobs } from '../jobs/jobs.service.js';
import {
  createCompany,
  createUser,
  deactivateUser,
  getAdminOverview,
  listAuditLogs,
  listCompanies,
  listUsers,
  updateCompany,
  updateUser,
} from './admin.service.js';

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  const auth = [requireAuth()];

  app.get(
    '/api/v1/admin/overview',
    { preHandler: [...auth, requirePermission('users:manage')] },
    async (request, reply) => {
      try {
        const data = await getAdminOverview(request.authUser!);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/admin/users',
    { preHandler: [...auth, requirePermission('users:view')] },
    async (request, reply) => {
      try {
        const data = await listUsers(request.authUser!, request.query as never);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/admin/users',
    { preHandler: [...auth, requirePermission('users:manage')] },
    async (request, reply) => {
      try {
        const user = await createUser(request.authUser!, request.body as never, request);
        return reply.status(201).send({ user });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.patch(
    '/api/v1/admin/users/:id',
    { preHandler: [...auth, requirePermission('users:manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = await updateUser(request.authUser!, id, request.body as never, request);
        return reply.send({ user });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/admin/users/:id/deactivate',
    { preHandler: [...auth, requirePermission('users:manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = await deactivateUser(request.authUser!, id, request);
        return reply.send({ user });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/admin/audit-logs',
    { preHandler: [...auth, requirePermission('audit:view')] },
    async (request, reply) => {
      try {
        const data = await listAuditLogs(request.authUser!, request.query as never);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/admin/jobs',
    { preHandler: [...auth, requirePermission('jobs:view_all')] },
    async (request, reply) => {
      try {
        const data = await listJobs(request.authUser!, request.query as never);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/admin/companies',
    { preHandler: [...auth, requirePermission('companies:view_all')] },
    async (request, reply) => {
      try {
        const data = await listCompanies(request.authUser!);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/admin/companies',
    { preHandler: [...auth, requirePermission('companies:manage')] },
    async (request, reply) => {
      try {
        const company = await createCompany(request.authUser!, request.body as never, request);
        return reply.status(201).send({ company });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.patch(
    '/api/v1/admin/companies/:id',
    { preHandler: [...auth, requirePermission('companies:manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const company = await updateCompany(request.authUser!, id, request.body as never, request);
        return reply.send({ company });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );
}
