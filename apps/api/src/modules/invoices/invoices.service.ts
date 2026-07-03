import {
  AgreementStatus,
  InvoiceStatus,
  JobType,
  NotificationType,
  PaymentMethod,
  type Prisma,
} from '@prisma/client';
import type { AuthUser } from '@sitescop/shared-types';
import {
  formatAudCents,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  serviceDescriptionForJobType,
} from '@sitescop/shared-types';
import type {
  CreateInvoiceRequest,
  InvoiceDetail,
  InvoicesListResponse,
  InvoiceSummary,
  MarkInvoicePaidRequest,
  SendInvoiceResponse,
  UpdateInvoiceRequest,
} from '@sitescop/shared-types';
import { generateInvoicePdf } from '@sitescop/report-pdf';
import { z } from 'zod';
import { createAuditLog } from '../../shared/audit/audit.service.js';
import { advanceJobAfterBillingComplete } from '../../shared/billing/job-billing-readiness.js';
import { createJobFromAgreement } from '../../shared/billing/create-job-from-agreement.js';
import { resolveCompanyProfileForReport } from '../../shared/branding/resolve-company-profile.js';
import { resolveCompanyLogoForPdf } from '../../shared/branding/resolve-company-logo.js';
import { loadCompanyEmailContext, sendCompanyEmail } from '../../shared/email/email.service.js';
import { AppError, ForbiddenError, NotFoundError } from '../../shared/http/errors.js';
import { parsePagination } from '../../shared/http/validation.js';
import { resolveCompanyScope } from '../../shared/scoping/company-scope.js';
import { prisma } from '../../shared/database/prisma.js';
import { notifyBillingTeam, notifyOfficeStaff } from '../notifications/notifications.service.js';

export const createInvoiceSchema = z.object({
  jobId: z.string().optional(),
  agreementId: z.string().optional(),
  clientContactId: z.string().optional(),
  clientName: z.string().min(1).max(200),
  clientEmail: z.string().email(),
  propertyAddress: z.string().max(500).optional(),
  description: z.string().min(1).max(500),
  subtotalCents: z.number().int().min(0),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export const markPaidSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentReference: z.string().max(200).optional(),
  paidAt: z.string().datetime().optional(),
});

const invoiceInclude = {
  job: { select: { jobNumber: true, type: true } },
  agreement: { select: { agreementNumber: true } },
  createdBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.InvoiceInclude;

type InvoiceRow = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

function calculatePricing(subtotalCents: number, gstRate: number) {
  const gstCents = Math.round(subtotalCents * (gstRate / 100));
  return { gstCents, totalCents: subtotalCents + gstCents };
}

async function getGstRate(companyId: string): Promise<number> {
  const settings = await prisma.companySettings.findUnique({ where: { companyId } });
  return settings?.gstRate ?? 10;
}

async function generateInvoiceNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const latest = await prisma.invoice.findFirst({
    where: { companyId, invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });
  const next = latest ? Number.parseInt(latest.invoiceNumber.split('-').pop() ?? '0', 10) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

function mapSummary(row: InvoiceRow): InvoiceSummary {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    status: row.status as InvoiceSummary['status'],
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    propertyAddress: row.propertyAddress,
    description: row.description,
    subtotalCents: row.subtotalCents,
    gstCents: row.gstCents,
    totalCents: row.totalCents,
    jobId: row.jobId,
    jobNumber: row.job?.jobNumber ?? null,
    agreementId: row.agreementId,
    agreementNumber: row.agreement?.agreementNumber ?? null,
    issueDate: row.issueDate.toISOString(),
    dueDate: row.dueDate?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapDetail(row: InvoiceRow): InvoiceDetail {
  return {
    ...mapSummary(row),
    clientContactId: row.clientContactId,
    paymentMethod: row.paymentMethod as InvoiceDetail['paymentMethod'],
    paymentReference: row.paymentReference,
    notes: row.notes,
    createdByName: `${row.createdBy.firstName} ${row.createdBy.lastName}`.trim(),
  };
}

async function getInvoiceOrThrow(id: string, companyId?: string): Promise<InvoiceRow> {
  const row = await prisma.invoice.findFirst({
    where: { id, ...(companyId ? { companyId } : {}) },
    include: invoiceInclude,
  });
  if (!row) throw new NotFoundError('Invoice not found');
  return row;
}

async function buildInvoicePdfBuffer(row: InvoiceRow): Promise<Buffer> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: row.companyId },
    include: { settings: true },
  });
  const { company: companyProfile, settings: reportSettings } = resolveCompanyProfileForReport(
    company,
    company.settings,
  );
  const logoUrl = await resolveCompanyLogoForPdf(companyProfile.logoUrl);

  return generateInvoicePdf({
    company: {
      name: companyProfile.name,
      abn: companyProfile.abn,
      email: companyProfile.email,
      phone: companyProfile.phone,
      website: companyProfile.website,
      logoUrl,
    },
    invoiceNumber: row.invoiceNumber,
    issueDate: row.issueDate.toISOString(),
    dueDate: row.dueDate?.toISOString() ?? null,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    propertyAddress: row.propertyAddress,
    description: row.description,
    subtotalCents: row.subtotalCents,
    gstCents: row.gstCents,
    totalCents: row.totalCents,
    paidAt: row.paidAt?.toISOString() ?? null,
    paymentMethod: row.paymentMethod ? PAYMENT_METHOD_LABELS[row.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] : null,
    paymentReference: row.paymentReference,
    statusLabel: INVOICE_STATUS_LABELS[row.status as keyof typeof INVOICE_STATUS_LABELS],
    footerText: reportSettings.pdfFooterText,
    primaryColor: reportSettings.primaryColor,
    secondaryColor: reportSettings.secondaryColor,
    pdfIncludeLogo: reportSettings.pdfIncludeLogo,
  });
}

export async function listInvoices(
  user: AuthUser,
  query: Record<string, string | undefined>,
): Promise<InvoicesListResponse> {
  const { page, pageSize, skip } = parsePagination(query);
  const companyId = resolveCompanyScope(user);

  const where: Prisma.InvoiceWhereInput = {
    ...(companyId ? { companyId } : {}),
  };

  if (query.status) {
    where.status = query.status as InvoiceStatus;
  }

  if (query.search) {
    where.OR = [
      { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
      { clientName: { contains: query.search, mode: 'insensitive' } },
      { clientEmail: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { invoices: rows.map(mapSummary), total, page, pageSize };
}

export async function getInvoice(user: AuthUser, id: string): Promise<InvoiceDetail> {
  const companyId = resolveCompanyScope(user);
  const row = await getInvoiceOrThrow(id, companyId);
  return mapDetail(row);
}

export async function createInvoice(
  user: AuthUser,
  input: CreateInvoiceRequest,
  request?: import('fastify').FastifyRequest,
): Promise<InvoiceDetail> {
  const data = createInvoiceSchema.parse(input);
  const companyId = resolveCompanyScope(user) ?? user.companyId;
  if (!companyId) throw new ForbiddenError('Company required');

  if (data.jobId) {
    const job = await prisma.job.findFirst({
      where: { id: data.jobId, companyId, deletedAt: null },
    });
    if (!job) throw new NotFoundError('Job not found');
  }

  if (data.agreementId) {
    const agreement = await prisma.agreement.findFirst({
      where: { id: data.agreementId, companyId },
    });
    if (!agreement) throw new NotFoundError('Agreement not found');
  }

  const gstRate = await getGstRate(companyId);
  const { gstCents, totalCents } = calculatePricing(data.subtotalCents, gstRate);
  const invoiceNumber = await generateInvoiceNumber(companyId);
  const defaultDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const row = await prisma.invoice.create({
    data: {
      companyId,
      invoiceNumber,
      jobId: data.jobId,
      agreementId: data.agreementId,
      clientContactId: data.clientContactId,
      clientName: data.clientName,
      clientEmail: data.clientEmail.toLowerCase(),
      propertyAddress: data.propertyAddress,
      description: data.description,
      subtotalCents: data.subtotalCents,
      gstCents,
      totalCents,
      issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : defaultDueDate,
      notes: data.notes,
      createdById: user.id,
    },
    include: invoiceInclude,
  });

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'invoice.created',
    entityType: 'Invoice',
    entityId: row.id,
    metadata: { invoiceNumber },
    request,
  });

  return mapDetail(row);
}

export async function createInvoiceFromAgreement(
  user: AuthUser,
  agreementId: string,
  request?: import('fastify').FastifyRequest,
): Promise<InvoiceDetail> {
  const companyId = resolveCompanyScope(user) ?? user.companyId;
  if (!companyId) throw new ForbiddenError('Company required');

  const agreement = await prisma.agreement.findFirst({
    where: { id: agreementId, companyId },
  });
  if (!agreement) throw new NotFoundError('Agreement not found');

  const existing = await prisma.invoice.findFirst({
    where: {
      agreementId,
      companyId,
      status: { not: InvoiceStatus.VOID },
    },
  });
  if (existing) {
    const row = await getInvoiceOrThrow(existing.id, companyId);
    return mapDetail(row);
  }

  return createInvoice(
    user,
    {
      jobId: agreement.jobId ?? undefined,
      agreementId: agreement.id,
      clientContactId: agreement.clientContactId ?? undefined,
      clientName: agreement.clientName,
      clientEmail: agreement.clientEmail,
      propertyAddress: agreement.propertyAddress,
      description: serviceDescriptionForJobType(agreement.type as unknown as import('@sitescop/shared-types').JobType),
      subtotalCents: agreement.priceCents,
    },
    request,
  );
}

export async function updateInvoice(
  user: AuthUser,
  id: string,
  input: UpdateInvoiceRequest,
  request?: import('fastify').FastifyRequest,
): Promise<InvoiceDetail> {
  const data = updateInvoiceSchema.parse(input);
  const companyId = resolveCompanyScope(user);
  const existing = await getInvoiceOrThrow(id, companyId);

  if (existing.status === InvoiceStatus.PAID || existing.status === InvoiceStatus.VOID) {
    throw new AppError('Paid or void invoices cannot be edited', 'INVALID_STATE');
  }

  const gstRate = await getGstRate(existing.companyId);
  const subtotalCents = data.subtotalCents ?? existing.subtotalCents;
  const { gstCents, totalCents } = calculatePricing(subtotalCents, gstRate);

  const row = await prisma.invoice.update({
    where: { id },
    data: {
      jobId: data.jobId,
      agreementId: data.agreementId,
      clientContactId: data.clientContactId,
      clientName: data.clientName,
      clientEmail: data.clientEmail?.toLowerCase(),
      propertyAddress: data.propertyAddress,
      description: data.description,
      subtotalCents,
      gstCents,
      totalCents,
      issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      notes: data.notes,
    },
    include: invoiceInclude,
  });

  await createAuditLog({
    companyId: row.companyId,
    actorId: user.id,
    action: 'invoice.updated',
    entityType: 'Invoice',
    entityId: id,
    request,
  });

  return mapDetail(row);
}

export async function sendInvoice(
  user: AuthUser,
  id: string,
  request?: import('fastify').FastifyRequest,
): Promise<SendInvoiceResponse> {
  const companyId = resolveCompanyScope(user);
  const existing = await getInvoiceOrThrow(id, companyId);

  if (existing.status === InvoiceStatus.PAID || existing.status === InvoiceStatus.VOID) {
    throw new AppError('Invoice cannot be sent in its current status', 'INVALID_STATE');
  }

  const pdfBuffer = await buildInvoicePdfBuffer(existing);
  const emailContext = await loadCompanyEmailContext(existing.companyId);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: existing.companyId } });

  await sendCompanyEmail({
    context: emailContext,
    toEmail: existing.clientEmail,
    templateKey: 'invoiceSent',
    variables: {
      clientName: existing.clientName,
      companyName: company.name,
      invoiceNumber: existing.invoiceNumber,
      description: existing.description,
      totalAmount: formatAudCents(existing.totalCents),
      dueDate: existing.dueDate ? existing.dueDate.toLocaleDateString('en-AU') : 'On receipt',
      propertyAddress: existing.propertyAddress ?? '',
      companyPhone: company.phone ?? '',
    },
    attachments: [
      {
        filename: `${existing.invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  const row = await prisma.invoice.update({
    where: { id },
    data: {
      status: existing.status === InvoiceStatus.DRAFT ? InvoiceStatus.SENT : existing.status,
      sentAt: new Date(),
    },
    include: invoiceInclude,
  });

  await createAuditLog({
    companyId: row.companyId,
    actorId: user.id,
    action: 'invoice.sent',
    entityType: 'Invoice',
    entityId: id,
    metadata: { clientEmail: row.clientEmail },
    request,
  });

  await notifyBillingTeam(row.companyId, {
    type: NotificationType.INVOICE_SENT,
    title: `Invoice sent — ${row.invoiceNumber}`,
    body: `Invoice for ${row.clientName} (${formatAudCents(row.totalCents)}) was emailed to ${row.clientEmail}.`,
    entityType: 'Invoice',
    entityId: row.id,
  });

  return { invoice: mapDetail(row), emailSent: true };
}

export async function markInvoicePaid(
  user: AuthUser,
  id: string,
  input: MarkInvoicePaidRequest,
  request?: import('fastify').FastifyRequest,
): Promise<InvoiceDetail> {
  const data = markPaidSchema.parse(input);
  const companyId = resolveCompanyScope(user);
  const existing = await getInvoiceOrThrow(id, companyId);

  if (existing.status === InvoiceStatus.PAID) {
    throw new AppError('Invoice is already marked as paid', 'INVALID_STATE');
  }
  if (existing.status === InvoiceStatus.VOID) {
    throw new AppError('Void invoices cannot be marked as paid', 'INVALID_STATE');
  }

  const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();

  const row = await prisma.invoice.update({
    where: { id },
    data: {
      status: InvoiceStatus.PAID,
      paidAt,
      paymentMethod: data.paymentMethod,
      paymentReference: data.paymentReference,
    },
    include: invoiceInclude,
  });

  await createAuditLog({
    companyId: row.companyId,
    actorId: user.id,
    action: 'invoice.paid',
    entityType: 'Invoice',
    entityId: id,
    metadata: {
      paymentMethod: data.paymentMethod,
      paymentReference: data.paymentReference,
    },
    request,
  });

  let jobId = row.jobId;
  if (jobId) {
    await advanceJobAfterBillingComplete(jobId, row.companyId);
  } else if (row.agreementId) {
    jobId = await createJobFromAgreement(row.agreementId, row.companyId, user.id);
    await prisma.invoice.update({
      where: { id },
      data: { jobId },
    });
  }

  const job = jobId
    ? await prisma.job.findUnique({ where: { id: jobId }, select: { jobNumber: true } })
    : null;
  const jobNumber = job?.jobNumber ?? row.job?.jobNumber ?? '—';
  await notifyBillingTeam(row.companyId, {
    type: NotificationType.INVOICE_PAID,
    title: `Payment received — ${row.invoiceNumber}`,
    body: `${formatAudCents(row.totalCents)} received from ${row.clientName}. Job ${jobNumber} may now proceed.`,
    entityType: 'Invoice',
    entityId: row.id,
  });

  await notifyOfficeStaff(row.companyId, {
    type: NotificationType.PAYMENT_RECEIVED,
    title: `Job ready for assignment — ${jobNumber}`,
    body: `Payment received for ${row.clientName}. Assign an inspector when ready.`,
    entityType: 'Job',
    ...(jobId ? { entityId: jobId } : {}),
  });

  const settings = await prisma.companySettings.findUnique({ where: { companyId: row.companyId } });
  if (settings?.notifyJobAssigned !== false) {
    const emailContext = await loadCompanyEmailContext(row.companyId);
    const company = await prisma.company.findUniqueOrThrow({ where: { id: row.companyId } });
    try {
      await sendCompanyEmail({
        context: emailContext,
        toEmail: emailContext.fromAddress,
        templateKey: 'paymentReceived',
        variables: {
          invoiceNumber: row.invoiceNumber,
          clientName: row.clientName,
          totalAmount: formatAudCents(row.totalCents),
          paymentReference: data.paymentReference ?? '—',
          jobNumber,
          companyName: company.name,
          companyPhone: company.phone ?? '',
        },
      });
    } catch {
      // Internal notification email is best-effort; in-app notifications already sent.
    }
  }

  return mapDetail(row);
}

export async function voidInvoice(
  user: AuthUser,
  id: string,
  request?: import('fastify').FastifyRequest,
): Promise<InvoiceDetail> {
  const companyId = resolveCompanyScope(user);
  const existing = await getInvoiceOrThrow(id, companyId);

  if (existing.status === InvoiceStatus.PAID) {
    throw new AppError('Paid invoices cannot be voided', 'INVALID_STATE');
  }

  const row = await prisma.invoice.update({
    where: { id },
    data: { status: InvoiceStatus.VOID },
    include: invoiceInclude,
  });

  await createAuditLog({
    companyId: row.companyId,
    actorId: user.id,
    action: 'invoice.voided',
    entityType: 'Invoice',
    entityId: id,
    request,
  });

  return mapDetail(row);
}

export async function getInvoicePdfBuffer(user: AuthUser, id: string): Promise<{ buffer: Buffer; fileName: string }> {
  const companyId = resolveCompanyScope(user);
  const row = await getInvoiceOrThrow(id, companyId);
  const buffer = await buildInvoicePdfBuffer(row);
  return { buffer, fileName: `${row.invoiceNumber}.pdf` };
}

export async function createDraftInvoiceForSignedAgreement(
  agreementId: string,
  companyId: string,
  createdById: string,
): Promise<string | null> {
  const existing = await prisma.invoice.findFirst({
    where: { agreementId, companyId, status: { not: InvoiceStatus.VOID } },
  });
  if (existing) return existing.id;

  const agreement = await prisma.agreement.findFirst({
    where: { id: agreementId, companyId },
  });
  if (!agreement) return null;

  const gstRate = await getGstRate(companyId);
  const { gstCents, totalCents } = calculatePricing(agreement.priceCents, gstRate);
  const invoiceNumber = await generateInvoiceNumber(companyId);
  const defaultDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const invoice = await prisma.invoice.create({
    data: {
      companyId,
      invoiceNumber,
      jobId: agreement.jobId,
      agreementId: agreement.id,
      clientContactId: agreement.clientContactId,
      clientName: agreement.clientName,
      clientEmail: agreement.clientEmail,
      propertyAddress: agreement.propertyAddress,
      description: serviceDescriptionForJobType(agreement.type as unknown as import('@sitescop/shared-types').JobType),
      subtotalCents: agreement.priceCents,
      gstCents,
      totalCents,
      dueDate: defaultDueDate,
      createdById,
    },
  });

  return invoice.id;
}

export async function trySendInvoiceForAgreement(
  agreementId: string,
  companyId: string,
  actorId: string,
): Promise<boolean> {
  const invoice = await prisma.invoice.findFirst({
    where: { agreementId, companyId, status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.VOID] } },
    orderBy: { createdAt: 'desc' },
    include: invoiceInclude,
  });
  if (!invoice) return false;

  try {
    const pdfBuffer = await buildInvoicePdfBuffer(invoice);
    const emailContext = await loadCompanyEmailContext(companyId);
    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });

    await sendCompanyEmail({
      context: emailContext,
      toEmail: invoice.clientEmail,
      templateKey: 'invoiceSent',
      variables: {
        clientName: invoice.clientName,
        companyName: company.name,
        invoiceNumber: invoice.invoiceNumber,
        description: invoice.description,
        totalAmount: formatAudCents(invoice.totalCents),
        dueDate: invoice.dueDate ? invoice.dueDate.toLocaleDateString('en-AU') : 'On receipt',
        propertyAddress: invoice.propertyAddress ?? '',
        companyPhone: company.phone ?? '',
      },
      attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer }],
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.SENT, sentAt: new Date() },
    });

    await createAuditLog({
      companyId,
      actorId,
      action: 'invoice.sent',
      entityType: 'Invoice',
      entityId: invoice.id,
      metadata: { clientEmail: invoice.clientEmail, source: 'agreement_signed' },
    });

    await notifyBillingTeam(companyId, {
      type: NotificationType.INVOICE_SENT,
      title: `Invoice sent — ${invoice.invoiceNumber}`,
      body: `Invoice for ${invoice.clientName} (${formatAudCents(invoice.totalCents)}) was emailed after agreement signing.`,
      entityType: 'Invoice',
      entityId: invoice.id,
    });

    return true;
  } catch {
    return false;
  }
}
