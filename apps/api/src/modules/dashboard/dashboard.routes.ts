import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/auth/middleware.js';
import { getDashboardDataForUser } from './dashboard.service.js';

export async function registerDashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/dashboard', { preHandler: requireAuth() }, async (request, reply) => {
    const data = getDashboardDataForUser(request.authUser!);
    return reply.send(data);
  });
}
