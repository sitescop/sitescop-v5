import type { FastifyInstance } from 'fastify';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { requireAuth, requirePermission } from '../../shared/auth/middleware.js';
import { handleRouteError } from '../../shared/http/handler.js';
import {
  assertClientOwnsAgreement,
  assertClientOwnsInvoice,
  assertClientOwnsReport,
  getClientPortalData,
} from './portal.service.js';
import {
  confirmStripeCheckoutSession,
  createInvoiceCheckoutSession,
} from './stripe.service.js';
import { getInvoicePdfBufferForCompany } from '../invoices/invoices.service.js';
import { buildAgreementPdfBuffer } from '../agreements/agreement-pdf.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_STORAGE_ROOT = join(__dirname, '../../../storage/reports');

export async function registerPortalRoutes(app: FastifyInstance): Promise<void> {
  const auth = [requireAuth()];

  app.get(
    '/api/v1/portal',
    { preHandler: [...auth, requirePermission('client:portal')] },
    async (request, reply) => {
      try {
        const data = await getClientPortalData(request.authUser!);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/portal/reports/:id/download',
    { preHandler: [...auth, requirePermission('client:portal')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const inline = (request.query as { inline?: string }).inline === '1';
        const row = await assertClientOwnsReport(request.authUser!, id);
        const path = join(REPORTS_STORAGE_ROOT, row.filePath!);
        return reply
          .header('Content-Type', 'application/pdf')
          .header(
            'Content-Disposition',
            `${inline ? 'inline' : 'attachment'}; filename="${row.fileName}"`,
          )
          .send(createReadStream(path));
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/portal/agreements/:id/download',
    { preHandler: [...auth, requirePermission('client:portal')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const inline = (request.query as { inline?: string }).inline === '1';
        const user = request.authUser!;
        const agreement = await assertClientOwnsAgreement(user, id);
        const buffer = await buildAgreementPdfBuffer(agreement.id, agreement.companyId);
        const fileName = `${agreement.agreementNumber}.pdf`;
        return reply
          .header('Content-Type', 'application/pdf')
          .header(
            'Content-Disposition',
            `${inline ? 'inline' : 'attachment'}; filename="${fileName}"`,
          )
          .send(buffer);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.get(
    '/api/v1/portal/invoices/:id/download',
    { preHandler: [...auth, requirePermission('client:portal')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const inline = (request.query as { inline?: string }).inline === '1';
        const user = request.authUser!;
        await assertClientOwnsInvoice(user, id);
        const { buffer, fileName } = await getInvoicePdfBufferForCompany(user.companyId!, id);
        return reply
          .header('Content-Type', 'application/pdf')
          .header(
            'Content-Disposition',
            `${inline ? 'inline' : 'attachment'}; filename="${fileName}"`,
          )
          .send(buffer);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/portal/invoices/:id/checkout',
    { preHandler: [...auth, requirePermission('client:portal')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await createInvoiceCheckoutSession(request.authUser!, id);
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );

  app.post(
    '/api/v1/portal/payments/confirm',
    { preHandler: [...auth, requirePermission('client:portal')] },
    async (request, reply) => {
      try {
        const { sessionId } = request.body as { sessionId: string };
        const data = await confirmStripeCheckoutSession(
          request.authUser!,
          sessionId,
          request,
        );
        return reply.send(data);
      } catch (error) {
        return handleRouteError(error, request, reply);
      }
    },
  );
}
