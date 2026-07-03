import type { Company, CompanySettings } from '@prisma/client';
import {
  SITESCOP_COMPANY_ABN,
  SITESCOP_COMPANY_EMAIL,
  SITESCOP_COMPANY_NAME,
  SITESCOP_COMPANY_PHONE,
  SITESCOP_COMPANY_WEBSITE,
  SITESCOP_LOGO_PATH,
  SITESCOP_PDF_FOOTER_TEXT,
} from '@sitescop/shared-types';

export const LEGACY_DEMO_COMPANY_NAME = 'SiteScop Demo Inspections';
export const LEGACY_DEMO_ABN = '12 345 678 901';
export const LEGACY_DEMO_PHONE = '1300 000 000';
export const LEGACY_DEMO_EMAIL = 'info@sitescop-demo.com.au';
export const LEGACY_DEMO_ADDRESS = '123 Inspection Way, Sydney NSW 2000';

export interface ResolvedCompanyProfile {
  name: string;
  abn: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  logoUrl: string | null;
}

export interface ResolvedCompanySettings {
  pdfFooterText: string;
  pdfIncludeLogo: boolean;
  primaryColor: string;
  secondaryColor: string;
  reportHeader: string | null;
  reportFooter: string | null;
}

/** True when the DB still has the original seeded demo placeholder values. */
export function isLegacyDemoCompanyProfile(company: Pick<Company, 'name' | 'abn' | 'phone' | 'email' | 'address'>): boolean {
  return (
    company.name === LEGACY_DEMO_COMPANY_NAME ||
    company.abn === LEGACY_DEMO_ABN ||
    company.phone === LEGACY_DEMO_PHONE ||
    company.email === LEGACY_DEMO_EMAIL ||
    company.address === LEGACY_DEMO_ADDRESS
  );
}

/** Canonical Sitescop branding — used when legacy demo placeholders are still in the DB. */
export function canonicalSitescopCompanyProfile(): ResolvedCompanyProfile {
  return {
    name: SITESCOP_COMPANY_NAME,
    abn: SITESCOP_COMPANY_ABN,
    email: SITESCOP_COMPANY_EMAIL,
    phone: SITESCOP_COMPANY_PHONE,
    website: SITESCOP_COMPANY_WEBSITE,
    address: null,
    logoUrl: SITESCOP_LOGO_PATH,
  };
}

export function resolveCompanyProfileForReport(
  company: Company,
  settings: CompanySettings | null,
): { company: ResolvedCompanyProfile; settings: ResolvedCompanySettings } {
  const useCanonical = company.slug === 'sitescop-demo' && isLegacyDemoCompanyProfile(company);
  const canonical = useCanonical ? canonicalSitescopCompanyProfile() : null;

  return {
    company: {
      name: canonical?.name ?? company.name,
      abn: canonical?.abn ?? company.abn,
      email: canonical?.email ?? company.email,
      phone: canonical?.phone ?? company.phone,
      website: canonical?.website ?? company.website,
      address: canonical?.address ?? company.address,
      logoUrl: canonical?.logoUrl ?? company.logoUrl,
    },
    settings: {
      primaryColor: settings?.primaryColor ?? '#0B6E4F',
      secondaryColor: settings?.secondaryColor ?? '#1E3A5F',
      pdfFooterText:
        settings?.pdfFooterText?.trim() ||
        (useCanonical ? SITESCOP_PDF_FOOTER_TEXT : `${company.name} — Confidential Inspection Report`),
      pdfIncludeLogo: settings?.pdfIncludeLogo ?? true,
      reportHeader: settings?.reportHeader ?? null,
      reportFooter: settings?.reportFooter ?? null,
    },
  };
}

export function legacyDemoCompanyUpdateData(): Pick<
  Company,
  'name' | 'abn' | 'email' | 'phone' | 'website' | 'address' | 'logoUrl'
> {
  return {
    name: SITESCOP_COMPANY_NAME,
    abn: SITESCOP_COMPANY_ABN,
    email: SITESCOP_COMPANY_EMAIL,
    phone: SITESCOP_COMPANY_PHONE,
    website: SITESCOP_COMPANY_WEBSITE,
    address: null,
    logoUrl: SITESCOP_LOGO_PATH,
  };
}

export function legacyDemoSettingsUpdateData(): Pick<
  CompanySettings,
  'emailFromName' | 'emailFromAddress' | 'pdfFooterText' | 'pdfIncludeLogo'
> {
  return {
    emailFromName: SITESCOP_COMPANY_NAME,
    emailFromAddress: SITESCOP_COMPANY_EMAIL,
    pdfFooterText: SITESCOP_PDF_FOOTER_TEXT,
    pdfIncludeLogo: true,
  };
}
