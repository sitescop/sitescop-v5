import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import {
  SITESCOP_COMPANY_ABN,
  SITESCOP_COMPANY_EMAIL,
  SITESCOP_COMPANY_NAME,
  SITESCOP_COMPANY_PHONE,
  SITESCOP_COMPANY_WEBSITE,
  SITESCOP_LOGO_PATH,
  SITESCOP_PDF_FOOTER_TEXT,
} from '@sitescop/shared-types';
import { hashPassword } from '../src/shared/auth/crypto.js';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.PROD_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.PROD_ADMIN_PASSWORD?.trim();
  const companyName = process.env.PROD_COMPANY_NAME?.trim() || SITESCOP_COMPANY_NAME;
  const companySlug = process.env.PROD_COMPANY_SLUG?.trim() || 'sitescop';

  if (!adminEmail || !adminPassword) {
    throw new Error('Set PROD_ADMIN_EMAIL and PROD_ADMIN_PASSWORD before running production seed.');
  }

  if (adminPassword.length < 12) {
    throw new Error('PROD_ADMIN_PASSWORD must be at least 12 characters.');
  }

  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    update: { name: companyName },
    create: {
      name: companyName,
      slug: companySlug,
      abn: SITESCOP_COMPANY_ABN,
      logoUrl: SITESCOP_LOGO_PATH,
      email: process.env.SMTP_USER?.trim() || SITESCOP_COMPANY_EMAIL,
      phone: SITESCOP_COMPANY_PHONE,
      website: SITESCOP_COMPANY_WEBSITE,
    },
  });

  await prisma.companySettings.upsert({
    where: { companyId: company.id },
    update: {
      emailFromName: companyName,
      emailFromAddress: process.env.SMTP_USER?.trim() || SITESCOP_COMPANY_EMAIL,
    },
    create: {
      companyId: company.id,
      emailFromName: companyName,
      emailFromAddress: process.env.SMTP_USER?.trim() || SITESCOP_COMPANY_EMAIL,
      pdfFooterText: SITESCOP_PDF_FOOTER_TEXT,
      pdfIncludeLogo: true,
    },
  });

  const passwordHash = await hashPassword(adminPassword);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.COMPANY_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      companyId: company.id,
    },
    create: {
      email: adminEmail,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.COMPANY_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      companyId: company.id,
    },
  });

  console.log('Production seed complete.');
  console.log(`Company: ${companyName} (${companySlug})`);
  console.log(`Admin login: ${adminEmail}`);
  console.log('Change the admin password after first login if this was a one-time setup password.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
