import { type Prisma } from '@prisma/client';
import type { AgreementLegalContent, AuthUser } from '@sitescop/shared-types';
import { JOB_TYPE_LABELS } from '@sitescop/shared-types';
import type { JobType as SharedJobType } from '@sitescop/shared-types';
import { generateAgreementPdf } from '@sitescop/report-pdf';
import { prisma } from '../../shared/database/prisma.js';
import { resolveCompanyProfileForReport } from '../../shared/branding/resolve-company-profile.js';
import { resolveCompanyLogoForPdf } from '../../shared/branding/resolve-company-logo.js';
import { NotFoundError } from '../../shared/http/errors.js';
import { resolveCompanyScope } from '../../shared/scoping/company-scope.js';

type AgreementPdfRow = Prisma.AgreementGetPayload<{
  include: { company: { include: { settings: true } } };
}>;

export async function buildAgreementPdfBuffer(agreementId: string, companyId: string): Promise<Buffer> {
  const row = await prisma.agreement.findFirst({
    where: { id: agreementId, companyId },
    include: { company: { include: { settings: true } } },
  });
  if (!row) {
    throw new Error('Agreement not found');
  }
  return buildAgreementPdfFromRow(row);
}

async function buildAgreementPdfFromRow(row: AgreementPdfRow): Promise<Buffer> {
  const { company: companyProfile, settings: reportSettings } = resolveCompanyProfileForReport(
    row.company,
    row.company.settings,
  );
  const logoUrl = await resolveCompanyLogoForPdf(companyProfile.logoUrl);
  const legalSections = (row.legalSections as unknown as AgreementLegalContent).sections ?? [];

  return generateAgreementPdf({
    company: {
      name: companyProfile.name,
      abn: companyProfile.abn,
      email: companyProfile.email,
      phone: companyProfile.phone,
      website: companyProfile.website,
      logoUrl,
    },
    agreementNumber: row.agreementNumber,
    agreementDate: row.agreementDate.toISOString(),
    typeLabel: JOB_TYPE_LABELS[row.type as SharedJobType] ?? row.type,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    clientPhone: row.clientPhone,
    propertyAddress: row.propertyAddress,
    priceCents: row.priceCents,
    gstCents: row.gstCents,
    totalCents: row.totalCents,
    legalSections: legalSections.map((section) => ({
      title: section.title,
      content: section.content,
    })),
    signatureName: row.signatureName,
    signatureData: row.signatureData,
    signedAt: row.signedAt?.toISOString() ?? null,
    notes: row.notes,
    footerText: reportSettings.pdfFooterText,
    primaryColor: reportSettings.primaryColor,
    secondaryColor: reportSettings.secondaryColor,
    pdfIncludeLogo: reportSettings.pdfIncludeLogo,
  });
}

export async function getAgreementPdfForUser(
  user: AuthUser,
  agreementId: string,
): Promise<{ buffer: Buffer; fileName: string }> {
  const companyId = resolveCompanyScope(user);
  const row = await prisma.agreement.findFirst({
    where: { id: agreementId, ...(companyId ? { companyId } : {}) },
    select: { agreementNumber: true, companyId: true },
  });
  if (!row) throw new NotFoundError('Agreement not found');
  const buffer = await buildAgreementPdfBuffer(agreementId, row.companyId);
  return { buffer, fileName: `${row.agreementNumber}.pdf` };
}
