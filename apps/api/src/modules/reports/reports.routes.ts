import type { FastifyInstance } from 'fastify';
import { createReadStream } from 'node:fs';
import { requireAuth, requirePermission } from '../../shared/auth/middleware.js';
import { handleRouteError } from '../../shared/http/handler.js';
import {
  generateInspectionReports,
  getReport,
  getReportFilePath,
  listInspectionReports,
  listReports,
} from './reports.service.js';

export async function registerReportsRoutes(app: FastifyInstance): Promise<void> {
  const auth = [requireAuth()];

  app.get(
    '/api/v1/reports',
    { preHandler: [...auth, requirePermission('reports:view')] },
    async (request, reply) => {
      try {
        const data = await listReports(request.authUser!, request.query as Record<string, string>);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/reports/:id',
    { preHandler: [...auth, requirePermission('reports:view')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await getReport(request.authUser!, id);
        return reply.send({ report: data });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/reports/:id/download',
    { preHandler: [...auth, requirePermission('reports:view')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { path, fileName } = await getReportFilePath(request.authUser!, id);
        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="${fileName}"`)
          .send(createReadStream(path));
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/inspections/:id/reports',
    { preHandler: [...auth, requirePermission('reports:view')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await listInspectionReports(request.authUser!, id);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/inspections/:id/reports/generate',
    { preHandler: [...auth, requirePermission('reports:generate')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await generateInspectionReports(request.authUser!, id, request);
        return reply.status(201).send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );
}
