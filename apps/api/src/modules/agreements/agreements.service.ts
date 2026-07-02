import {
  AgreementStatus,
  JobType,
  UserRole,
  type Prisma,
} from '@prisma/client';
import type { AuthUser } from '@sitescop/shared-types';
import type {
  AgreementDetail,
  AgreementsListResponse,
  AgreementSummary,
  CreateAgreementRequest,
  DeclineAgreementRequest,
  PublicAgreementView,
  SendAgreementResponse,
  SignAgreementRequest,
  UpdateAgreementRequest,
  AgreementLegalContent,
} from '@sitescop/shared-types';
import { z } from 'zod';
import { createAuditLog } from '../../shared/audit/audit.service.js';
import { generateSecureToken, hashToken } from '../../shared/auth/crypto.js';
import { config } from '../../config.js';
import { AppError, ForbiddenError, NotFoundError } from '../../shared/http/errors.js';
import { parsePagination } from '../../shared/http/validation.js';
import { resolveCompanyScope } from '../../shared/scoping/company-scope.js';
import { prisma } from '../../shared/database/prisma.js';
import { getDefaultLegalSections, maskEmail, mergeLegalSections } from './legal/default-templates.js';

const AGREEMENT_TOKEN_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;

export const createAgreementSchema = z.object({
  jobId: z.string().optional(),
  type: z.nativeEnum(JobType),
  clientContactId: z.string().optional(),
  clientName: z.string().min(1).max(200),
  clientEmail: z.string().email(),
  clientPhone: z.string().max(30).optional(),
  propertyAddress: z.string().min(1).max(500),
  priceCents: z.number().int().min(0),
  agreementDate: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
});

export const updateAgreementSchema = createAgreementSchema.partial();

export const signAgreementSchema = z.object({
  signatureName: z.string().min(1).max(200),
  signatureData: z.string().min(10),
  declarationsAccepted: z.literal(true),
});

export const declineAgreementSchema = z.object({
  reason: z.string().max(500).optional(),
});

const agreementInclude = {
  job: { select: { jobNumber: true } },
  createdBy: { select: { firstName: true, lastName: true } },
  company: { select: { name: true } },
} satisfies Prisma.AgreementInclude;

type AgreementRow = Prisma.AgreementGetPayload<{ include: typeof agreementInclude }>;

async function getCompanyTemplates(companyId: string): Promise<Record<string, AgreementLegalContent> | null> {
  const settings = await prisma.companySettings.findUnique({ where: { companyId } });
  if (!settings?.agreementTemplates) return null;
  return settings.agreementTemplates as unknown as Record<string, AgreementLegalContent>;
}

function calculatePricing(priceCents: number, gstRate: number) {
  const gstCents = Math.round(priceCents * (gstRate / 100));
  return { gstCents, totalCents: priceCents + gstCents };
}

async function generateAgreementNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `AGR-${year}-`;
  const latest = await prisma.agreement.findFirst({
    where: { companyId, agreementNumber: { startsWith: prefix } },
    orderBy: { agreementNumber: 'desc' },
    select: { agreementNumber: true },
  });
  const next = latest ? Number.parseInt(latest.agreementNumber.split('-').pop() ?? '0', 10) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

function mapSummary(row: AgreementRow): AgreementSummary {
  return {
    id: row.id,
    agreementNumber: row.agreementNumber,
    status: row.status as AgreementSummary['status'],
    type: row.type as AgreementSummary['type'],
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    propertyAddress: row.propertyAddress,
    priceCents: row.priceCents,
    totalCents: row.totalCents,
    jobId: row.jobId,
    jobNumber: row.job?.jobNumber ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    signedAt: row.signedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapDetail(row: AgreementRow): AgreementDetail {
  return {
    ...mapSummary(row),
    clientPhone: row.clientPhone,
    clientContactId: row.clientContactId,
    gstCents: row.gstCents,
    agreementDate: row.agreementDate.toISOString(),
    notes: row.notes,
    legalSections: row.legalSections as unknown as AgreementLegalContent,
    viewedAt: row.viewedAt?.toISOString() ?? null,
    declinedAt: row.declinedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    declineReason: row.declineReason,
    signatureName: row.signatureName,
    declarationsAccepted: row.declarationsAccepted,
    createdByName: `${row.createdBy.firstName} ${row.createdBy.lastName}`.trim(),
  };
}

async function getAgreementOrThrow(id: string, companyId?: string): Promise<AgreementRow> {
  const row = await prisma.agreement.findFirst({
    where: { id, ...(companyId ? { companyId } : {}) },
    include: agreementInclude,
  });
  if (!row) throw new NotFoundError('Agreement not found');
  return row;
}

function assertAgreementAccess(user: AuthUser, agreement: AgreementRow): void {
  if (user.role === UserRole.CLIENT) {
    if (user.email.toLowerCase() !== agreement.clientEmail.toLowerCase()) {
      throw new ForbiddenError('You can only access your own agreements');
    }
    return;
  }
  if (user.role !== UserRole.SUPER_ADMIN && user.companyId !== agreement.companyId) {
    throw new ForbiddenError('Cannot access this agreement');
  }
}

async function getGstRate(companyId: string): Promise<number> {
  const settings = await prisma.companySettings.findUnique({ where: { companyId } });
  return settings?.gstRate ?? 10;
}

export async function listAgreements(
  user: AuthUser,
  query: { page?: string; pageSize?: string; status?: string; search?: string },
): Promise<AgreementsListResponse> {
  const { page, pageSize, skip } = parsePagination(query);
  const companyId = resolveCompanyScope(user);

  const where: Prisma.AgreementWhereInput = {
    ...(companyId ? { companyId } : {}),
  };

  if (user.role === UserRole.CLIENT) {
    where.clientEmail = { equals: user.email, mode: 'insensitive' };
  }

  if (query.status) {
    where.status = query.status as AgreementStatus;
  }

  if (query.search) {
    where.OR = [
      { agreementNumber: { contains: query.search, mode: 'insensitive' } },
      { clientName: { contains: query.search, mode: 'insensitive' } },
      { clientEmail: { contains: query.search, mode: 'insensitive' } },
      { propertyAddress: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.agreement.findMany({
      where,
      include: agreementInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.agreement.count({ where }),
  ]);

  return { agreements: rows.map(mapSummary), total, page, pageSize };
}

export async function getAgreement(user: AuthUser, id: string): Promise<AgreementDetail> {
  const companyId = resolveCompanyScope(user);
  const row = await getAgreementOrThrow(id, companyId);
  assertAgreementAccess(user, row);
  return mapDetail(row);
}

export async function createAgreement(
  user: AuthUser,
  input: CreateAgreementRequest,
  request?: import('fastify').FastifyRequest,
): Promise<AgreementDetail> {
  const data = createAgreementSchema.parse(input);
  const companyId = resolveCompanyScope(user) ?? user.companyId;
  if (!companyId) throw new ForbiddenError('Company required');

  if (data.jobId) {
    const job = await prisma.job.findFirst({
      where: { id: data.jobId, companyId, deletedAt: null },
    });
    if (!job) throw new NotFoundError('Job not found');
  }

  const gstRate = await getGstRate(companyId);
  const { gstCents, totalCents } = calculatePricing(data.priceCents, gstRate);
  const templates = await getCompanyTemplates(companyId);
  const legalSections = mergeLegalSections(data.type, templates);
  const agreementNumber = await generateAgreementNumber(companyId);

  const row = await prisma.agreement.create({
    data: {
      companyId,
      agreementNumber,
      jobId: data.jobId,
      type: data.type,
      clientContactId: data.clientContactId,
      clientName: data.clientName,
      clientEmail: data.clientEmail.toLowerCase(),
      clientPhone: data.clientPhone,
      propertyAddress: data.propertyAddress,
      priceCents: data.priceCents,
      gstCents,
      totalCents,
      agreementDate: data.agreementDate ? new Date(data.agreementDate) : new Date(),
      notes: data.notes,
      legalSections: legalSections as unknown as Prisma.InputJsonValue,
      createdById: user.id,
    },
    include: agreementInclude,
  });

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'agreement.created',
    entityType: 'Agreement',
    entityId: row.id,
    metadata: { agreementNumber },
    request,
  });

  return mapDetail(row);
}

export async function createAgreementFromJob(
  user: AuthUser,
  jobId: string,
  request?: import('fastify').FastifyRequest,
): Promise<AgreementDetail> {
  const companyId = resolveCompanyScope(user) ?? user.companyId;
  const job = await prisma.job.findFirst({
    where: { id: jobId, ...(companyId ? { companyId } : {}), deletedAt: null },
    include: { property: true, clientContact: true },
  });
  if (!job) throw new NotFoundError('Job not found');

  const propertyAddress = job.property
    ? `${job.property.addressLine1}, ${job.property.suburb} ${job.property.state} ${job.property.postcode}`
    : 'Address to be confirmed';

  const priceCents = job.priceCents ?? 0;

  if (!job.clientContact?.email) {
    throw new AppError('Job must have a client contact with an email to create an agreement', 'VALIDATION_ERROR');
  }

  return createAgreement(
    user,
    {
      jobId: job.id,
      type: job.type as CreateAgreementRequest['type'],
      clientContactId: job.clientContactId ?? undefined,
      clientName: `${job.clientContact.firstName} ${job.clientContact.lastName}`.trim(),
      clientEmail: job.clientContact.email,
      clientPhone: job.clientContact.phone ?? undefined,
      propertyAddress,
      priceCents,
    },
    request,
  );
}

export async function updateAgreement(
  user: AuthUser,
  id: string,
  input: UpdateAgreementRequest,
  request?: import('fastify').FastifyRequest,
): Promise<AgreementDetail> {
  const data = updateAgreementSchema.parse(input);
  const companyId = resolveCompanyScope(user);
  const existing = await getAgreementOrThrow(id, companyId);
  assertAgreementAccess(user, existing);

  if (existing.status !== AgreementStatus.DRAFT) {
    throw new AppError('Only draft agreements can be edited', 'INVALID_STATE');
  }

  const gstRate = await getGstRate(existing.companyId);
  const priceCents = data.priceCents ?? existing.priceCents;
  const { gstCents, totalCents } = calculatePricing(priceCents, gstRate);

  let legalSections = existing.legalSections as unknown as AgreementLegalContent;
  if (data.type && data.type !== existing.type) {
    const templates = await getCompanyTemplates(existing.companyId);
    legalSections = mergeLegalSections(data.type, templates);
  }

  const row = await prisma.agreement.update({
    where: { id },
    data: {
      jobId: data.jobId,
      type: data.type,
      clientContactId: data.clientContactId,
      clientName: data.clientName,
      clientEmail: data.clientEmail?.toLowerCase(),
      clientPhone: data.clientPhone,
      propertyAddress: data.propertyAddress,
      priceCents,
      gstCents,
      totalCents,
      agreementDate: data.agreementDate ? new Date(data.agreementDate) : undefined,
      notes: data.notes,
      legalSections: legalSections as unknown as Prisma.InputJsonValue,
    },
    include: agreementInclude,
  });

  await createAuditLog({
    companyId: row.companyId,
    actorId: user.id,
    action: 'agreement.updated',
    entityType: 'Agreement',
    entityId: id,
    request,
  });

  return mapDetail(row);
}

async function issueSigningToken(agreementId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + AGREEMENT_TOKEN_EXPIRY_MS);
  await prisma.agreement.update({
    where: { id: agreementId },
    data: {
      accessTokenHash: hashToken(token),
      accessTokenExpiresAt: expiresAt,
      expiresAt,
    },
  });
  return { token, expiresAt };
}

function buildSigningUrl(token: string): string {
  return `${config.webAppUrl}/sign/${token}`;
}

export async function sendAgreement(
  user: AuthUser,
  id: string,
  request?: import('fastify').FastifyRequest,
): Promise<SendAgreementResponse> {
  const companyId = resolveCompanyScope(user);
  const existing = await getAgreementOrThrow(id, companyId);

  const sendableStatuses: AgreementStatus[] = [
    AgreementStatus.DRAFT,
    AgreementStatus.SENT,
    AgreementStatus.VIEWED,
  ];
  if (!sendableStatuses.includes(existing.status)) {
    throw new AppError('Agreement cannot be sent in its current status', 'INVALID_STATE');
  }

  const { token } = await issueSigningToken(id);
  const signingUrl = buildSigningUrl(token);

  const row = await prisma.agreement.update({
    where: { id },
    data: {
      status: AgreementStatus.SENT,
      sentAt: new Date(),
      viewedAt: null,
    },
    include: agreementInclude,
  });

  await createAuditLog({
    companyId: row.companyId,
    actorId: user.id,
    action: 'agreement.sent',
    entityType: 'Agreement',
    entityId: id,
    metadata: { clientEmail: row.clientEmail },
    request,
  });

  const response: SendAgreementResponse = {
    agreement: mapDetail(row),
    signingUrl,
  };

  if (!config.isProduction) {
    response.devSigningUrl = signingUrl;
  }

  return response;
}

export async function cancelAgreement(
  user: AuthUser,
  id: string,
  request?: import('fastify').FastifyRequest,
): Promise<AgreementDetail> {
  const companyId = resolveCompanyScope(user);
  const existing = await getAgreementOrThrow(id, companyId);

  if (existing.status === AgreementStatus.SIGNED) {
    throw new AppError('Signed agreements cannot be cancelled', 'INVALID_STATE');
  }

  const row = await prisma.agreement.update({
    where: { id },
    data: {
      status: AgreementStatus.CANCELLED,
      cancelledAt: new Date(),
      accessTokenHash: null,
    },
    include: agreementInclude,
  });

  await createAuditLog({
    companyId: row.companyId,
    actorId: user.id,
    action: 'agreement.cancelled',
    entityType: 'Agreement',
    entityId: id,
    request,
  });

  return mapDetail(row);
}

async function findByToken(token: string): Promise<AgreementRow> {
  const tokenHash = hashToken(token);
  const row = await prisma.agreement.findFirst({
    where: { accessTokenHash: tokenHash },
    include: agreementInclude,
  });
  if (!row) throw new NotFoundError('Agreement link is invalid or expired');

  if (row.accessTokenExpiresAt && row.accessTokenExpiresAt < new Date()) {
    await prisma.agreement.update({
      where: { id: row.id },
      data: { status: AgreementStatus.EXPIRED },
    });
    throw new AppError('Agreement link has expired', 'EXPIRED');
  }

  if (row.status === AgreementStatus.CANCELLED) {
    throw new AppError('Agreement has been cancelled', 'INVALID_STATE');
  }

  return row;
}

export async function getPublicAgreement(token: string): Promise<PublicAgreementView> {
  const row = await findByToken(token);
  const signableStatuses: AgreementStatus[] = [AgreementStatus.SENT, AgreementStatus.VIEWED];
  const canSign = signableStatuses.includes(row.status);

  return {
    id: row.id,
    agreementNumber: row.agreementNumber,
    status: row.status as PublicAgreementView['status'],
    type: row.type as PublicAgreementView['type'],
    companyName: row.company.name,
    clientName: row.clientName,
    clientEmailMasked: maskEmail(row.clientEmail),
    propertyAddress: row.propertyAddress,
    priceCents: row.priceCents,
    gstCents: row.gstCents,
    totalCents: row.totalCents,
    agreementDate: row.agreementDate.toISOString(),
    legalSections: row.legalSections as unknown as AgreementLegalContent,
    canSign,
  };
}

export async function markAgreementViewed(
  token: string,
  request?: import('fastify').FastifyRequest,
): Promise<PublicAgreementView> {
  const row = await findByToken(token);

  if (row.status === AgreementStatus.SENT) {
    await prisma.agreement.update({
      where: { id: row.id },
      data: { status: AgreementStatus.VIEWED, viewedAt: new Date() },
    });

    await createAuditLog({
      companyId: row.companyId,
      actorId: null,
      action: 'agreement.viewed',
      entityType: 'Agreement',
      entityId: row.id,
      request,
    });
  }

  return getPublicAgreement(token);
}

export async function signPublicAgreement(
  token: string,
  input: SignAgreementRequest,
  request?: import('fastify').FastifyRequest,
): Promise<{ success: true; agreementNumber: string }> {
  const data = signAgreementSchema.parse(input);
  const row = await findByToken(token);

  const signableStatuses: AgreementStatus[] = [AgreementStatus.SENT, AgreementStatus.VIEWED];
  if (!signableStatuses.includes(row.status)) {
    throw new AppError('Agreement cannot be signed in its current status', 'INVALID_STATE');
  }

  await prisma.agreement.update({
    where: { id: row.id },
    data: {
      status: AgreementStatus.SIGNED,
      signedAt: new Date(),
      signatureName: data.signatureName,
      signatureData: data.signatureData,
      signedIp: request?.ip ?? null,
      declarationsAccepted: true,
      accessTokenHash: null,
    },
  });

  await createAuditLog({
    companyId: row.companyId,
    actorId: null,
    action: 'agreement.signed',
    entityType: 'Agreement',
    entityId: row.id,
    metadata: { signatureName: data.signatureName },
    request,
  });

  return { success: true, agreementNumber: row.agreementNumber };
}

export async function declinePublicAgreement(
  token: string,
  input: DeclineAgreementRequest,
  request?: import('fastify').FastifyRequest,
): Promise<{ success: true }> {
  const { reason } = declineAgreementSchema.parse(input);
  const row = await findByToken(token);

  const signableStatuses: AgreementStatus[] = [AgreementStatus.SENT, AgreementStatus.VIEWED];
  if (!signableStatuses.includes(row.status)) {
    throw new AppError('Agreement cannot be declined in its current status', 'INVALID_STATE');
  }

  await prisma.agreement.update({
    where: { id: row.id },
    data: {
      status: AgreementStatus.DECLINED,
      declinedAt: new Date(),
      declineReason: reason,
      accessTokenHash: null,
    },
  });

  await createAuditLog({
    companyId: row.companyId,
    actorId: null,
    action: 'agreement.declined',
    entityType: 'Agreement',
    entityId: row.id,
    metadata: { reason },
    request,
  });

  return { success: true };
}

export async function getAgreementTemplate(user: AuthUser, type: JobType) {
  const companyId = resolveCompanyScope(user) ?? user.companyId;
  if (!companyId) throw new ForbiddenError('Company required');
  const templates = await getCompanyTemplates(companyId);
  return mergeLegalSections(type, templates);
}

export async function updateAgreementTemplate(
  user: AuthUser,
  type: JobType,
  content: AgreementLegalContent,
  request?: import('fastify').FastifyRequest,
) {
  const companyId = resolveCompanyScope(user) ?? user.companyId;
  if (!companyId) throw new ForbiddenError('Company required');

  const settings = await prisma.companySettings.upsert({
    where: { companyId },
    update: {},
    create: { companyId },
  });

  const existing = (settings.agreementTemplates as unknown as Record<string, AgreementLegalContent>) ?? {};
  existing[type] = content;

  await prisma.companySettings.update({
    where: { companyId },
    data: { agreementTemplates: existing as unknown as Prisma.InputJsonValue },
  });

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'agreement.template_updated',
    entityType: 'AgreementTemplate',
    entityId: type,
    request,
  });

  return content;
}

export { getDefaultLegalSections };
