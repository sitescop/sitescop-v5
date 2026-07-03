import type { FastifyInstance } from 'fastify';
import { requireAuth, requirePermission } from '../../shared/auth/middleware.js';
import { handleRouteError } from '../../shared/http/handler.js';
import {
  createInvoice,
  createInvoiceFromAgreement,
  getInvoice,
  getInvoicePdfBuffer,
  listInvoices,
  markInvoicePaid,
  sendInvoice,
  updateInvoice,
  voidInvoice,
} from './invoices.service.js';

export async function registerInvoicesRoutes(app: FastifyInstance): Promise<void> {
  const auth = [requireAuth()];

  app.get(
    '/api/v1/invoices',
    { preHandler: [...auth, requirePermission('billing:view')] },
    async (request, reply) => {
      try {
        const data = await listInvoices(request.authUser!, request.query as Record<string, string>);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/invoices/:id',
    { preHandler: [...auth, requirePermission('billing:view')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const invoice = await getInvoice(request.authUser!, id);
        return reply.send({ invoice });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/invoices/:id/download',
    { preHandler: [...auth, requirePermission('billing:view')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { buffer, fileName } = await getInvoicePdfBuffer(request.authUser!, id);
        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="${fileName}"`)
          .send(buffer);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/invoices',
    { preHandler: [...auth, requirePermission('billing:manage')] },
    async (request, reply) => {
      try {
        const invoice = await createInvoice(request.authUser!, request.body as never, request);
        return reply.status(201).send({ invoice });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/invoices/from-agreement/:agreementId',
    { preHandler: [...auth, requirePermission('billing:manage')] },
    async (request, reply) => {
      try {
        const { agreementId } = request.params as { agreementId: string };
        const invoice = await createInvoiceFromAgreement(request.authUser!, agreementId, request);
        return reply.status(201).send({ invoice });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.patch(
    '/api/v1/invoices/:id',
    { preHandler: [...auth, requirePermission('billing:manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const invoice = await updateInvoice(request.authUser!, id, request.body as never, request);
        return reply.send({ invoice });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/invoices/:id/send',
    { preHandler: [...auth, requirePermission('billing:manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await sendInvoice(request.authUser!, id, request);
        return reply.send(result);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/invoices/:id/mark-paid',
    { preHandler: [...auth, requirePermission('billing:manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const invoice = await markInvoicePaid(request.authUser!, id, request.body as never, request);
        return reply.send({ invoice });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/invoices/:id/void',
    { preHandler: [...auth, requirePermission('billing:manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const invoice = await voidInvoice(request.authUser!, id, request);
        return reply.send({ invoice });
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );
}
