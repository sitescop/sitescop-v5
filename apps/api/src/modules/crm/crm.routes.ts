import type { FastifyInstance } from 'fastify';
import { requireAuth, requirePermission } from '../../shared/auth/middleware.js';
import { handleRouteError } from '../../shared/http/handler.js';
import {
  createContact,
  deleteContact,
  getContact,
  listContacts,
  updateContact,
} from './crm.service.js';

export async function registerCrmRoutes(app: FastifyInstance): Promise<void> {
  const auth = [requireAuth()];

  app.get(
    '/api/v1/crm/contacts',
    { preHandler: [...auth, requirePermission('crm:view')] },
    async (request, reply) => {
      try {
        const data = await listContacts(request.authUser!, request.query as never);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/crm/contacts/:id',
    { preHandler: [...auth, requirePermission('crm:view')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const contact = await getContact(request.authUser!, id);
        return reply.send({ contact });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/crm/contacts',
    { preHandler: [...auth, requirePermission('crm:manage')] },
    async (request, reply) => {
      try {
        const contact = await createContact(request.authUser!, request.body as never, request);
        return reply.status(201).send({ contact });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.patch(
    '/api/v1/crm/contacts/:id',
    { preHandler: [...auth, requirePermission('crm:manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const contact = await updateContact(request.authUser!, id, request.body as never, request);
        return reply.send({ contact });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.delete(
    '/api/v1/crm/contacts/:id',
    { preHandler: [...auth, requirePermission('crm:manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await deleteContact(request.authUser!, id, request);
        return reply.send(result);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );
}
