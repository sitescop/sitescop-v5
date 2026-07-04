import type { CompanySettings, Prisma } from '@prisma/client';
import type { AuthUser } from '@sitescop/shared-types';
import type {
  CompanyPreferences,
  CompanyProfile,
  CompanySettingsResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateCompanyPreferencesRequest,
  UpdateCompanyProfileRequest,
} from '@sitescop/shared-types';
import { z } from 'zod';
import { createAuditLog } from '../../shared/audit/audit.service.js';
import { generateSecureToken, hashToken } from '../../shared/auth/crypto.js';
import { NotFoundError, ForbiddenError } from '../../shared/http/errors.js';
import {
  assertCanManageCompany,
  requireCompanyId,
  resolveCompanyScope,
} from '../../shared/scoping/company-scope.js';
import { prisma } from '../../shared/database/prisma.js';
import { syncLegacyDemoBrandingIfNeeded } from '../../shared/branding/sync-legacy-demo-branding.js';
import {
  getSmtpConfigStatus,
  sendSmtpTestEmail,
  verifySmtpConnection,
} from '../../shared/email/email.service.js';
import {
  getTwilioConfigStatus,
  sendTwilioTestSms,
} from '../../shared/sms/sms.service.js';

const profileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  abn: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  website: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  logoUrl: z
    .string()
    .max(2000)
    .optional()
    .or(z.literal(''))
    .refine(
      (value) =>
        !value ||
        value.startsWith('data:') ||
        value.startsWith('/') ||
        /^https?:\/\//i.test(value),
      { message: 'Logo must be a URL, site path, or data URI' },
    ),
});

const preferencesSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  reportHeader: z.string().max(500).optional(),
  reportFooter: z.string().max(500).optional(),
  emailFromName: z.string().max(100).optional(),
  emailFromAddress: z.string().email().optional().or(z.literal('')),
  emailSignature: z.string().max(2000).optional(),
  smsEnabled: z.boolean().optional(),
  smsSenderId: z.string().max(20).optional(),
  pdfFooterText: z.string().max(500).optional(),
  pdfIncludeLogo: z.boolean().optional(),
  notifyNewJob: z.boolean().optional(),
  notifyJobAssigned: z.boolean().optional(),
  notifyJobCompleted: z.boolean().optional(),
  defaultBuildingPrice: z.number().int().min(0).nullable().optional(),
  defaultPestPrice: z.number().int().min(0).nullable().optional(),
  defaultCombinedPrice: z.number().int().min(0).nullable().optional(),
  gstRate: z.number().min(0).max(100).optional(),
  emailTemplates: z.record(z.string()).optional(),
  smsTemplates: z.record(z.string()).optional(),
  integrations: z.record(z.unknown()).optional(),
  agreementTemplates: z.record(z.object({
    sections: z.array(z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
    })),
  })).optional(),
  backupEnabled: z.boolean().optional(),
  backupFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
});

const apiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.string().datetime().optional(),
});

function mapProfile(company: {
  id: string;
  name: string;
  slug: string;
  abn: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  logoUrl: string | null;
}): CompanyProfile {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    abn: company.abn,
    email: company.email,
    phone: company.phone,
    website: company.website,
    address: company.address,
    logoUrl: company.logoUrl,
  };
}

function mapPreferences(settings: CompanySettings): CompanyPreferences {
  return {
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor,
    reportHeader: settings.reportHeader,
    reportFooter: settings.reportFooter,
    emailFromName: settings.emailFromName,
    emailFromAddress: settings.emailFromAddress,
    emailSignature: settings.emailSignature,
    smsEnabled: settings.smsEnabled,
    smsSenderId: settings.smsSenderId,
    pdfFooterText: settings.pdfFooterText,
    pdfIncludeLogo: settings.pdfIncludeLogo,
    notifyNewJob: settings.notifyNewJob,
    notifyJobAssigned: settings.notifyJobAssigned,
    notifyJobCompleted: settings.notifyJobCompleted,
    defaultBuildingPrice: settings.defaultBuildingPrice,
    defaultPestPrice: settings.defaultPestPrice,
    defaultCombinedPrice: settings.defaultCombinedPrice,
    gstRate: settings.gstRate,
    emailTemplates: (settings.emailTemplates as Record<string, string>) ?? {},
    smsTemplates: (settings.smsTemplates as Record<string, string>) ?? {},
    integrations: (settings.integrations as Record<string, unknown>) ?? {},
    agreementTemplates: (settings.agreementTemplates as CompanyPreferences['agreementTemplates']) ?? {},
    backupEnabled: settings.backupEnabled,
    backupFrequency: settings.backupFrequency,
  };
}

const testEmailSchema = z.object({
  toEmail: z.string().email().optional(),
});

const testSmsSchema = z.object({
  toPhone: z.string().min(8).max(30),
});

export async function getEmailDeliveryStatus(user: AuthUser) {
  const companyId = requireCompanyId(user);
  const smtp = getSmtpConfigStatus();
  const connection = smtp.configured
    ? await verifySmtpConnection()
    : { ok: false as const, error: smtp.reason ?? 'SMTP not configured' };

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { email: true },
  });

  return {
    smtp,
    connection,
    fromAddress: company?.email ?? null,
  };
}

export async function sendTestEmail(
  user: AuthUser,
  input: { toEmail?: string },
  request?: import('fastify').FastifyRequest,
) {
  const companyId = requireCompanyId(user);
  assertCanManageCompany(user, companyId);
  const { toEmail } = testEmailSchema.parse(input);

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { email: true },
  });

  const recipient = toEmail ?? company.email;
  if (!recipient) {
    throw new ForbiddenError('Provide toEmail or set company email in Settings.');
  }

  const result = await sendSmtpTestEmail(companyId, recipient);

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'email.test_sent',
    entityType: 'Company',
    entityId: companyId,
    metadata: { toEmail: recipient, success: result.sent, error: result.error },
    request,
  });

  return { toEmail: recipient, ...result };
}

export async function getSmsDeliveryStatus(user: AuthUser) {
  const companyId = requireCompanyId(user);
  const twilio = getTwilioConfigStatus();
  const settings = await prisma.companySettings.findUnique({
    where: { companyId },
    select: { smsEnabled: true, smsSenderId: true },
  });

  return {
    twilio,
    companyEnabled: settings?.smsEnabled ?? false,
    senderId: settings?.smsSenderId ?? null,
  };
}

export async function sendTestSms(
  user: AuthUser,
  input: { toPhone: string },
  request?: import('fastify').FastifyRequest,
) {
  const companyId = requireCompanyId(user);
  assertCanManageCompany(user, companyId);
  const { toPhone } = testSmsSchema.parse(input);

  const result = await sendTwilioTestSms(companyId, toPhone);

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'sms.test_sent',
    entityType: 'Company',
    entityId: companyId,
    metadata: { toPhone, success: result.sent, error: result.error },
    request,
  });

  return { toPhone, ...result };
}

async function getOrCreateSettings(companyId: string): Promise<CompanySettings> {
  return prisma.companySettings.upsert({
    where: { companyId },
    update: {},
    create: { companyId },
  });
}

export async function getCompanySettings(user: AuthUser): Promise<CompanySettingsResponse> {
  const companyId = requireCompanyId(user);
  const existing = await prisma.company.findUnique({ where: { id: companyId } });
  if (!existing) throw new NotFoundError('Company not found');

  const { company, settings } = await syncLegacyDemoBrandingIfNeeded(existing);
  return {
    company: mapProfile(company),
    preferences: mapPreferences(settings),
  };
}

export async function updateCompanyProfile(
  user: AuthUser,
  input: UpdateCompanyProfileRequest,
  request?: import('fastify').FastifyRequest,
): Promise<CompanySettingsResponse> {
  const data = profileSchema.parse(input);
  const companyId = requireCompanyId(user);
  assertCanManageCompany(user, companyId);

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      name: data.name,
      abn: data.abn,
      email: data.email === '' ? null : data.email,
      phone: data.phone,
      website: data.website === '' ? null : data.website,
      address: data.address,
      logoUrl: data.logoUrl === '' ? null : data.logoUrl,
    },
  });

  const settings = await getOrCreateSettings(companyId);

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'settings.company_updated',
    entityType: 'Company',
    entityId: companyId,
    request,
  });

  return { company: mapProfile(company), preferences: mapPreferences(settings) };
}

export async function updateCompanyPreferences(
  user: AuthUser,
  input: UpdateCompanyPreferencesRequest,
  request?: import('fastify').FastifyRequest,
): Promise<CompanySettingsResponse> {
  const data = preferencesSchema.parse(input);
  const companyId = requireCompanyId(user);
  assertCanManageCompany(user, companyId);

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError('Company not found');

  const settings = await prisma.companySettings.upsert({
    where: { companyId },
    update: data as Prisma.CompanySettingsUpdateInput,
    create: { companyId, ...(data as Omit<Prisma.CompanySettingsUncheckedCreateInput, 'companyId'>) },
  });

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'settings.preferences_updated',
    entityType: 'CompanySettings',
    entityId: settings.id,
    request,
  });

  return { company: mapProfile(company), preferences: mapPreferences(settings) };
}

export async function listApiKeys(user: AuthUser) {
  const companyId = requireCompanyId(user);
  const keys = await prisma.apiKey.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  });

  return keys.map((key) => ({
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    expiresAt: key.expiresAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
  }));
}

export async function createApiKey(
  user: AuthUser,
  input: CreateApiKeyRequest,
  request?: import('fastify').FastifyRequest,
): Promise<CreateApiKeyResponse> {
  const data = apiKeySchema.parse(input);
  const companyId = requireCompanyId(user);
  assertCanManageCompany(user, companyId);

  const secret = `ssk_${generateSecureToken()}`;
  const keyPrefix = secret.slice(0, 12);
  const keyHash = hashToken(secret);

  const apiKey = await prisma.apiKey.create({
    data: {
      companyId,
      name: data.name,
      keyPrefix,
      keyHash,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'settings.api_key_created',
    entityType: 'ApiKey',
    entityId: apiKey.id,
    metadata: { name: data.name },
    request,
  });

  return {
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      lastUsedAt: null,
      expiresAt: apiKey.expiresAt?.toISOString() ?? null,
      createdAt: apiKey.createdAt.toISOString(),
    },
    secret,
  };
}

export async function deleteApiKey(
  user: AuthUser,
  id: string,
  request?: import('fastify').FastifyRequest,
): Promise<{ success: true }> {
  const companyId = requireCompanyId(user);
  assertCanManageCompany(user, companyId);

  const key = await prisma.apiKey.findFirst({ where: { id, companyId } });
  if (!key) throw new NotFoundError('API key not found');

  await prisma.apiKey.delete({ where: { id } });

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'settings.api_key_deleted',
    entityType: 'ApiKey',
    entityId: id,
    request,
  });

  return { success: true };
}

export async function getSettingsForCompany(user: AuthUser, companyIdParam?: string) {
  const companyId = resolveCompanyScope(user, companyIdParam);
  if (!companyId) throw new ForbiddenError('Company ID required');

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError('Company not found');

  const settings = await getOrCreateSettings(companyId);
  return { company: mapProfile(company), preferences: mapPreferences(settings) };
}
