import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/auth/middleware.js';
import { handleRouteError } from '../../shared/http/handler.js';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notifications.service.js';

export async function registerNotificationsRoutes(app: FastifyInstance): Promise<void> {
  const auth = [requireAuth()];

  app.get(
    '/api/v1/notifications',
    { preHandler: auth },
    async (request, reply) => {
      try {
        const data = await listNotifications(request.authUser!, request.query as Record<string, string>);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/notifications/unread-count',
    { preHandler: auth },
    async (request, reply) => {
      try {
        const unreadCount = await getUnreadCount(request.authUser!);
        return reply.send({ unreadCount });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/notifications/:id/read',
    { preHandler: auth },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const notification = await markNotificationRead(request.authUser!, id);
        return reply.send({ notification });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/notifications/read-all',
    { preHandler: auth },
    async (request, reply) => {
      try {
        const result = await markAllNotificationsRead(request.authUser!);
        return reply.send(result);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );
}
