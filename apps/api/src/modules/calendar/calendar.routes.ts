import type { FastifyInstance } from 'fastify';
import { requireAuth, requirePermission } from '../../shared/auth/middleware.js';
import { handleRouteError } from '../../shared/http/handler.js';
import { listCalendarEvents, listTodayJobs, listUnscheduledJobs, rescheduleCalendarEvent } from './calendar.service.js';

export async function registerCalendarRoutes(app: FastifyInstance): Promise<void> {
  const auth = [requireAuth()];

  app.get(
    '/api/v1/calendar/events',
    { preHandler: [...auth, requirePermission('calendar:view')] },
    async (request, reply) => {
      try {
        const data = await listCalendarEvents(request.authUser!, request.query as Record<string, string>);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/calendar/today',
    { preHandler: [...auth, requirePermission('calendar:view')] },
    async (request, reply) => {
      try {
        const data = await listTodayJobs(request.authUser!, request.query as Record<string, string>);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/calendar/unscheduled',
    { preHandler: [...auth, requirePermission('calendar:view')] },
    async (request, reply) => {
      try {
        const data = await listUnscheduledJobs(request.authUser!, request.query as Record<string, string>);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.patch(
    '/api/v1/calendar/events/:jobId',
    { preHandler: [...auth, requirePermission('calendar:manage')] },
    async (request, reply) => {
      try {
        const { jobId } = request.params as { jobId: string };
        const result = await rescheduleCalendarEvent(
          request.authUser!,
          jobId,
          request.body as never,
          request,
        );
        return reply.send(result);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );
}
