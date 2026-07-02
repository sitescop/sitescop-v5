import type { FastifyInstance } from 'fastify';
import { requireAuth, requirePermission } from '../../shared/auth/middleware.js';
import { handleRouteError } from '../../shared/http/handler.js';
import {
  completeInspection,
  createInspectionFromJob,
  getInspection,
  getInspectionByJob,
  listInspections,
  reopenInspection,
  syncInspectionRooms,
  updateInspection,
  updateInspectionRoom,
  updateInspectionSection,
} from './inspections.service.js';

export async function registerInspectionsRoutes(app: FastifyInstance): Promise<void> {
  const auth = [requireAuth()];

  app.get(
    '/api/v1/inspections',
    { preHandler: [...auth, requirePermission('inspections:view')] },
    async (request, reply) => {
      try {
        const data = await listInspections(request.authUser!, request.query as Record<string, string>);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/inspections/by-job/:jobId',
    { preHandler: [...auth, requirePermission('inspections:view')] },
    async (request, reply) => {
      try {
        const { jobId } = request.params as { jobId: string };
        const data = await getInspectionByJob(request.authUser!, jobId);
        return reply.send({ inspection: data });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/inspections/:id',
    { preHandler: [...auth, requirePermission('inspections:view')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await getInspection(request.authUser!, id);
        return reply.send({ inspection: data });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/inspections/from-job/:jobId',
    { preHandler: [...auth, requirePermission('inspections:edit')] },
    async (request, reply) => {
      try {
        const { jobId } = request.params as { jobId: string };
        const data = await createInspectionFromJob(request.authUser!, jobId, request);
        return reply.status(201).send({ inspection: data });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.patch(
    '/api/v1/inspections/:id',
    { preHandler: [...auth, requirePermission('inspections:edit')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await updateInspection(request.authUser!, id, request.body as never, request);
        return reply.send({ inspection: data });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.patch(
    '/api/v1/inspections/:id/sections',
    { preHandler: [...auth, requirePermission('inspections:edit')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await updateInspectionSection(request.authUser!, id, request.body as never, request);
        return reply.send({ inspection: data });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/inspections/:id/rooms/sync',
    { preHandler: [...auth, requirePermission('inspections:edit')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await syncInspectionRooms(request.authUser!, id, request.body as never, request);
        return reply.send({ inspection: data });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.patch(
    '/api/v1/inspections/:id/rooms/:roomId',
    { preHandler: [...auth, requirePermission('inspections:edit')] },
    async (request, reply) => {
      try {
        const { id, roomId } = request.params as { id: string; roomId: string };
        const data = await updateInspectionRoom(request.authUser!, id, roomId, request.body as never, request);
        return reply.send({ inspection: data });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/inspections/:id/complete',
    { preHandler: [...auth, requirePermission('inspections:edit')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await completeInspection(request.authUser!, id, request);
        return reply.send({ inspection: data });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/inspections/:id/reopen',
    { preHandler: [...auth, requirePermission('inspections:edit')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await reopenInspection(request.authUser!, id, request);
        return reply.send({ inspection: data });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );
}
