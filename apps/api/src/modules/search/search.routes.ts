import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/auth/middleware.js';
import { handleRouteError } from '../../shared/http/handler.js';
import { globalSearch } from './search.service.js';

export async function registerSearchRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/v1/search',
    { preHandler: [requireAuth()] },
    async (request, reply) => {
      try {
        const { q = '' } = request.query as { q?: string };
        const data = await globalSearch(request.authUser!, q);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );
}
