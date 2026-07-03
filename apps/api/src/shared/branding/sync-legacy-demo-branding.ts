import type { Company, CompanySettings } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import {
  isLegacyDemoCompanyProfile,
  legacyDemoCompanyUpdateData,
  legacyDemoSettingsUpdateData,
} from './resolve-company-profile.js';

/** Persist canonical Sitescop branding when the DB still has seeded demo placeholders. */
export async function syncLegacyDemoBrandingIfNeeded(company: Company): Promise<{
  company: Company;
  settings: CompanySettings;
}> {
  if (company.slug !== 'sitescop-demo' || !isLegacyDemoCompanyProfile(company)) {
    const settings = await prisma.companySettings.upsert({
      where: { companyId: company.id },
      update: {},
      create: { companyId: company.id },
    });
    return { company, settings };
  }

  const updatedCompany = await prisma.company.update({
    where: { id: company.id },
    data: legacyDemoCompanyUpdateData(),
  });

  const settings = await prisma.companySettings.upsert({
    where: { companyId: company.id },
    update: legacyDemoSettingsUpdateData(),
    create: { companyId: company.id, ...legacyDemoSettingsUpdateData() },
  });

  return { company: updatedCompany, settings };
}
