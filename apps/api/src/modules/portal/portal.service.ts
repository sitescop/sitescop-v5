import { ReportStatus, type Prisma } from '@prisma/client';
import type { AuthUser } from '@sitescop/shared-types';
import { UserRole } from '@sitescop/shared-types';
import type { ClientPortalResponse } from '@sitescop/shared-types';
import { prisma } from '../../shared/database/prisma.js';
import { config } from '../../config.js';
import { ForbiddenError, NotFoundError } from '../../shared/http/errors.js';
import { mapProperty } from '../../shared/mappers/index.js';
import { mapAgreementSummary } from '../agreements/agreements.service.js';
import { mapInvoiceSummary } from '../invoices/invoices.service.js';

const agreementInclude = {
  job: { select: { jobNumber: true } },
  createdBy: { select: { firstName: true, lastName: true } },
  company: { select: { name: true } },
} satisfies Prisma.AgreementInclude;

const invoiceInclude = {
  job: { select: { jobNumber: true, type: true, assignedInspectorId: true } },
  agreement: { select: { agreementNumber: true, createdById: true, job: { select: { assignedInspectorId: true } } } },
  createdBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.InvoiceInclude;

function assertClientPortalUser(user: AuthUser): void {
  if (user.role !== UserRole.CLIENT) {
    throw new ForbiddenError('Client portal access only');
  }
  if (!user.companyId) {
    throw new ForbiddenError('Company context required');
  }
}

function clientEmailFilter(email: string) {
  return { equals: email, mode: 'insensitive' as const };
}

export async function getClientPortalData(user: AuthUser): Promise<ClientPortalResponse> {
  assertClientPortalUser(user);
  const companyId = user.companyId!;
  const email = user.email.trim();

  const [agreements, invoices, reportRows] = await Promise.all([
    prisma.agreement.findMany({
      where: { companyId, clientEmail: clientEmailFilter(email) },
      include: agreementInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.invoice.findMany({
      where: { companyId, clientEmail: clientEmailFilter(email) },
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.inspectionReport.findMany({
      where: {
        companyId,
        status: ReportStatus.READY,
        inspection: {
          job: {
            clientContact: {
              email: clientEmailFilter(email),
            },
          },
        },
      },
      include: {
        inspection: {
          include: {
            job: { include: { property: true } },
          },
        },
      },
      orderBy: { generatedAt: 'desc' },
      take: 50,
    }),
  ]);

  return {
    agreements: agreements.map(mapAgreementSummary),
    invoices: invoices.map(mapInvoiceSummary),
    reports: reportRows.map((row) => ({
      id: row.id,
      reportType: row.reportType,
      fileName: row.fileName,
      inspectionId: row.inspectionId,
      inspectionNumber: row.inspection.inspectionNumber,
      jobNumber: row.inspection.job.jobNumber,
      propertyAddress: row.inspection.job.property
        ? mapProperty(row.inspection.job.property).formattedAddress
        : null,
      generatedAt: row.generatedAt?.toISOString() ?? null,
    })),
    stripeEnabled: Boolean(config.stripe.secretKey?.trim()),
  };
}

export async function assertClientOwnsReport(user: AuthUser, reportId: string) {
  assertClientPortalUser(user);
  const row = await prisma.inspectionReport.findFirst({
    where: {
      id: reportId,
      companyId: user.companyId!,
      status: ReportStatus.READY,
      inspection: {
        job: {
          clientContact: {
            email: clientEmailFilter(user.email),
          },
        },
      },
    },
    select: { id: true, filePath: true, fileName: true },
  });
  if (!row?.filePath) throw new NotFoundError('Report not found');
  return row;
}

export async function assertClientOwnsInvoice(user: AuthUser, invoiceId: string) {
  assertClientPortalUser(user);
  const row = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId: user.companyId!,
      clientEmail: clientEmailFilter(user.email),
    },
  });
  if (!row) throw new NotFoundError('Invoice not found');
  return row;
}

export async function assertClientOwnsAgreement(user: AuthUser, agreementId: string) {
  assertClientPortalUser(user);
  const row = await prisma.agreement.findFirst({
    where: {
      id: agreementId,
      companyId: user.companyId!,
      clientEmail: clientEmailFilter(user.email),
    },
    select: { id: true, agreementNumber: true, companyId: true },
  });
  if (!row) throw new NotFoundError('Agreement not found');
  return row;
}
