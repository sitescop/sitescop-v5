import { PrismaClient } from '@prisma/client';

const SITESCOP_COMPANY_NAME = 'Sitescop PTY LTD';
const SITESCOP_COMPANY_ABN = '67 134 217 039';
const SITESCOP_COMPANY_PHONE = '0401 427 366';
const SITESCOP_COMPANY_EMAIL = 'info@sitescop.com.au';
const SITESCOP_COMPANY_WEBSITE = 'www.sitescop.com.au';
const SITESCOP_LOGO_PATH = '/branding/sitescop-logo.jpg';
const SITESCOP_PDF_FOOTER_TEXT =
  'SiteScop Building & pest Inspections — Confidential Inspection Report';

const prisma = new PrismaClient();

const company = await prisma.company.update({
  where: { slug: 'sitescop-demo' },
  data: {
    name: SITESCOP_COMPANY_NAME,
    abn: SITESCOP_COMPANY_ABN,
    phone: SITESCOP_COMPANY_PHONE,
    email: SITESCOP_COMPANY_EMAIL,
    website: SITESCOP_COMPANY_WEBSITE,
    logoUrl: SITESCOP_LOGO_PATH,
    address: null,
  },
});

await prisma.companySettings.upsert({
  where: { companyId: company.id },
  update: {
    emailFromName: SITESCOP_COMPANY_NAME,
    emailFromAddress: SITESCOP_COMPANY_EMAIL,
    pdfFooterText: SITESCOP_PDF_FOOTER_TEXT,
    pdfIncludeLogo: true,
  },
  create: {
    companyId: company.id,
    emailFromName: SITESCOP_COMPANY_NAME,
    emailFromAddress: SITESCOP_COMPANY_EMAIL,
    pdfFooterText: SITESCOP_PDF_FOOTER_TEXT,
    pdfIncludeLogo: true,
  },
});

console.log('Updated company branding:', {
  name: company.name,
  abn: SITESCOP_COMPANY_ABN,
  phone: SITESCOP_COMPANY_PHONE,
  email: SITESCOP_COMPANY_EMAIL,
  website: SITESCOP_COMPANY_WEBSITE,
  pdfFooterText: SITESCOP_PDF_FOOTER_TEXT,
});

await prisma.$disconnect();
