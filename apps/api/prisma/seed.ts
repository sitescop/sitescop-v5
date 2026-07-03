import {
  PrismaClient,
  UserRole,
  UserStatus,
  JobStatus,
  JobType,
  ContactType,
  ContactStatus,
  AgreementStatus,
  InvoiceStatus,
  PaymentMethod,
  InspectionStatus,
  InspectionRoomType,
} from '@prisma/client';
import {
  buildRoomsFromCounts,
  createEmptyInspectionFormData,
  enrichInspectionFormData,
} from '@sitescop/room-engine-core';
import {
  SITESCOP_COMPANY_ABN,
  SITESCOP_COMPANY_EMAIL,
  SITESCOP_COMPANY_NAME,
  SITESCOP_COMPANY_PHONE,
  SITESCOP_COMPANY_WEBSITE,
  SITESCOP_LOGO_PATH,
  SITESCOP_PDF_FOOTER_TEXT,
} from '@sitescop/shared-types';
import { hashPassword, hashToken } from '../src/shared/auth/crypto.js';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'SiteScop2026!';

interface SeedUser {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companySlug?: string;
}

const seedUsers: SeedUser[] = [
  {
    email: 'superadmin@sitescop.com.au',
    firstName: 'Super',
    lastName: 'Admin',
    role: UserRole.SUPER_ADMIN,
  },
  {
    email: 'admin@sitescop-demo.com.au',
    firstName: 'Company',
    lastName: 'Admin',
    role: UserRole.COMPANY_ADMIN,
    companySlug: 'sitescop-demo',
  },
  {
    email: 'manager@sitescop-demo.com.au',
    firstName: 'Office',
    lastName: 'Manager',
    role: UserRole.OFFICE_MANAGER,
    companySlug: 'sitescop-demo',
  },
  {
    email: 'staff@sitescop-demo.com.au',
    firstName: 'Office',
    lastName: 'Staff',
    role: UserRole.OFFICE_STAFF,
    companySlug: 'sitescop-demo',
  },
  {
    email: 'inspector@sitescop-demo.com.au',
    firstName: 'Field',
    lastName: 'Inspector',
    role: UserRole.INSPECTOR,
    companySlug: 'sitescop-demo',
  },
  {
    email: 'accountant@sitescop-demo.com.au',
    firstName: 'Finance',
    lastName: 'Accountant',
    role: UserRole.ACCOUNTANT,
    companySlug: 'sitescop-demo',
  },
  {
    email: 'client@sitescop-demo.com.au',
    firstName: 'Property',
    lastName: 'Client',
    role: UserRole.CLIENT,
    companySlug: 'sitescop-demo',
  },
];

async function main() {
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  const company = await prisma.company.upsert({
    where: { slug: 'sitescop-demo' },
    update: {
      name: SITESCOP_COMPANY_NAME,
      abn: SITESCOP_COMPANY_ABN,
      logoUrl: SITESCOP_LOGO_PATH,
      email: SITESCOP_COMPANY_EMAIL,
      phone: SITESCOP_COMPANY_PHONE,
      website: SITESCOP_COMPANY_WEBSITE,
      address: null,
    },
    create: {
      name: SITESCOP_COMPANY_NAME,
      slug: 'sitescop-demo',
      abn: SITESCOP_COMPANY_ABN,
      logoUrl: SITESCOP_LOGO_PATH,
      email: SITESCOP_COMPANY_EMAIL,
      phone: SITESCOP_COMPANY_PHONE,
      website: SITESCOP_COMPANY_WEBSITE,
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
      defaultBuildingPrice: 45000,
      defaultPestPrice: 35000,
      defaultCombinedPrice: 65000,
      emailTemplates: {
        agreementSent: 'Dear {{clientName}}, please sign your agreement: {{signingUrl}}',
        agreementSigned: 'Agreement {{agreementNumber}} signed by {{clientName}}.',
        invoiceSent: 'Invoice {{invoiceNumber}} for {{totalAmount}} — due {{dueDate}}.',
        paymentReceived: 'Payment received for {{invoiceNumber}}. Job {{jobNumber}} is ready.',
        jobAssigned: 'Hi {{inspectorName}}, you have been assigned job {{jobNumber}}.',
        jobCompleted: 'Job {{jobNumber}} has been completed.',
      },
      smsTemplates: {
        jobReminder: 'Reminder: inspection {{jobNumber}} scheduled for {{date}}.',
      },
    },
  });

  const usersByEmail: Record<string, string> = {};

  for (const seedUser of seedUsers) {
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        firstName: seedUser.firstName,
        lastName: seedUser.lastName,
        role: seedUser.role,
        status: UserStatus.ACTIVE,
        passwordHash,
        companyId: seedUser.companySlug ? company.id : null,
      },
      create: {
        email: seedUser.email,
        firstName: seedUser.firstName,
        lastName: seedUser.lastName,
        role: seedUser.role,
        status: UserStatus.ACTIVE,
        passwordHash,
        companyId: seedUser.companySlug ? company.id : null,
      },
    });
    usersByEmail[seedUser.email] = user.id;
  }

  const clientContact = await prisma.contact.upsert({
    where: { id: 'seed-client-contact' },
    update: {},
    create: {
      id: 'seed-client-contact',
      companyId: company.id,
      type: ContactType.CLIENT,
      status: ContactStatus.ACTIVE,
      firstName: 'Sarah',
      lastName: 'Mitchell',
      email: 'sarah.mitchell@example.com',
      phone: '0412 345 678',
      address: '45 Ocean Street, Bondi NSW 2026',
    },
  });

  const agentContact = await prisma.contact.upsert({
    where: { id: 'seed-agent-contact' },
    update: {},
    create: {
      id: 'seed-agent-contact',
      companyId: company.id,
      type: ContactType.AGENT,
      status: ContactStatus.ACTIVE,
      firstName: 'James',
      lastName: 'Harper',
      email: 'james@premierrealty.com.au',
      phone: '0423 456 789',
      companyName: 'Premier Realty',
    },
  });

  await prisma.contact.upsert({
    where: { id: 'seed-builder-contact' },
    update: {},
    create: {
      id: 'seed-builder-contact',
      companyId: company.id,
      type: ContactType.BUILDER,
      status: ContactStatus.ACTIVE,
      firstName: 'BuildCo',
      lastName: 'Construction',
      email: 'projects@buildco.com.au',
      phone: '1300 BUILD',
      companyName: 'BuildCo Construction',
      abn: '98 765 432 109',
    },
  });

  const property = await prisma.property.upsert({
    where: { id: 'seed-property-1' },
    update: {},
    create: {
      id: 'seed-property-1',
      companyId: company.id,
      addressLine1: '45 Ocean Street',
      suburb: 'Bondi',
      state: 'NSW',
      postcode: '2026',
    },
  });

  const adminId = usersByEmail['admin@sitescop-demo.com.au'];
  const inspectorId = usersByEmail['inspector@sitescop-demo.com.au'];

  await prisma.job.upsert({
    where: { id: 'seed-job-1' },
    update: {},
    create: {
      id: 'seed-job-1',
      companyId: company.id,
      jobNumber: `JOB-${new Date().getFullYear()}-0001`,
      title: 'Pre-Purchase Building Inspection',
      description: 'Full building inspection for property purchase.',
      type: JobType.PRE_PURCHASE,
      status: JobStatus.ASSIGNED,
      propertyId: property.id,
      clientContactId: clientContact.id,
      agentContactId: agentContact.id,
      scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      scheduledTime: '10:00',
      priceCents: 45000,
      assignedInspectorId: inspectorId,
      createdById: adminId,
    },
  });

  await prisma.job.upsert({
    where: { id: 'seed-job-2' },
    update: {},
    create: {
      id: 'seed-job-2',
      companyId: company.id,
      jobNumber: `JOB-${new Date().getFullYear()}-0002`,
      title: 'Pest Inspection — Unit 12',
      type: JobType.PEST,
      status: JobStatus.PENDING_ASSIGNMENT,
      clientContactId: clientContact.id,
      priceCents: 35000,
      createdById: adminId,
    },
  });

  const year = new Date().getFullYear();
  const legalSections = {
    sections: [
      { id: 'terms', title: 'Terms & Conditions', content: 'Standard inspection terms apply.' },
      { id: 'declaration', title: 'Client Declaration', content: 'Client accepts the inspection agreement.' },
    ],
  };

  await prisma.agreement.upsert({
    where: { id: 'seed-agreement-1' },
    update: {
      status: AgreementStatus.SIGNED,
      signedAt: new Date(),
      signatureName: 'Sarah Mitchell',
      signatureData: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiPjx0ZXh0IHg9IjEwIiB5PSI0MCIgZm9udC1zaXplPSIzMCI+Uy4gTWl0Y2hlbGw8L3RleHQ+PC9zdmc+',
      declarationsAccepted: true,
    },
    create: {
      id: 'seed-agreement-1',
      companyId: company.id,
      agreementNumber: `AGR-${year}-0001`,
      jobId: 'seed-job-1',
      status: AgreementStatus.SIGNED,
      type: JobType.PRE_PURCHASE,
      clientContactId: clientContact.id,
      clientName: 'Sarah Mitchell',
      clientEmail: 'sarah.mitchell@example.com',
      clientPhone: '0412 345 678',
      propertyAddress: '45 Ocean Street, Bondi NSW 2026',
      priceCents: 45000,
      gstCents: 4500,
      totalCents: 49500,
      legalSections,
      signedAt: new Date(),
      signatureName: 'Sarah Mitchell',
      signatureData: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiPjx0ZXh0IHg9IjEwIiB5PSI0MCIgZm9udC1zaXplPSIzMCI+Uy4gTWl0Y2hlbGw8L3RleHQ+PC9zdmc+',
      declarationsAccepted: true,
      createdById: adminId,
    },
  });

  await prisma.invoice.upsert({
    where: { id: 'seed-invoice-1' },
    update: {
      status: InvoiceStatus.PAID,
      paidAt: new Date(),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentReference: 'SEED-PAY-001',
    },
    create: {
      id: 'seed-invoice-1',
      companyId: company.id,
      invoiceNumber: `INV-${year}-0001`,
      status: InvoiceStatus.PAID,
      jobId: 'seed-job-1',
      agreementId: 'seed-agreement-1',
      clientContactId: clientContact.id,
      clientName: 'Sarah Mitchell',
      clientEmail: 'sarah.mitchell@example.com',
      propertyAddress: '45 Ocean Street, Bondi NSW 2026',
      description: 'Pre-Purchase Building Inspection',
      subtotalCents: 45000,
      gstCents: 4500,
      totalCents: 49500,
      paidAt: new Date(),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentReference: 'SEED-PAY-001',
      createdById: adminId,
    },
  });

  const demoSigningToken = 'demo-agreement-2-signing-token';
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.agreement.upsert({
    where: { id: 'seed-agreement-2' },
    update: {
      accessTokenHash: hashToken(demoSigningToken),
      accessTokenExpiresAt: tokenExpiresAt,
      expiresAt: tokenExpiresAt,
    },
    create: {
      id: 'seed-agreement-2',
      companyId: company.id,
      agreementNumber: `AGR-${year}-0002`,
      jobId: 'seed-job-2',
      status: AgreementStatus.SENT,
      type: JobType.PEST,
      clientContactId: clientContact.id,
      clientName: 'Sarah Mitchell',
      clientEmail: 'sarah.mitchell@example.com',
      propertyAddress: 'Address to be confirmed',
      priceCents: 35000,
      gstCents: 3500,
      totalCents: 38500,
      legalSections,
      sentAt: new Date(),
      accessTokenHash: hashToken(demoSigningToken),
      accessTokenExpiresAt: tokenExpiresAt,
      expiresAt: tokenExpiresAt,
      createdById: adminId,
    },
  });

  const seedFormData = enrichInspectionFormData(
    createEmptyInspectionFormData('BUILDING', {
      jobNumber: `JOB-${year}-0001`,
      clientName: 'Sarah Mitchell',
      clientEmail: 'sarah.mitchell@example.com',
      clientPhone: '0412 345 678',
      agentName: 'James Agent',
      agentPhone: '0400 111 222',
      agentEmail: 'james.agent@example.com',
      propertyAddress: '45 Ocean Street, Bondi NSW 2026',
      scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      scheduledTime: '10:00',
      inspectorName: 'Demo Inspector',
      inspectorLicence: 'NSW-123456',
    }),
  );
  seedFormData.shared.propertyDescription.bedroomCount = 3;
  seedFormData.shared.propertyDescription.bathroomCount = 2;
  seedFormData.shared.propertyDescription.livingAreaCount = 2;
  seedFormData.shared.propertyDescription.garageCount = 1;

  const seedRooms = buildRoomsFromCounts({
    bedrooms: 3,
    bathrooms: 2,
    livingAreas: 2,
    garages: 1,
  });

  await prisma.job.update({
    where: { id: 'seed-job-1' },
    data: { status: JobStatus.IN_PROGRESS },
  });

  await prisma.inspection.upsert({
    where: { id: 'seed-inspection-1' },
    update: {
      status: InspectionStatus.IN_PROGRESS,
      progressPercent: 12,
      completedAt: null,
    },
    create: {
      id: 'seed-inspection-1',
      companyId: company.id,
      inspectionNumber: `INSP-${year}-0001`,
      jobId: 'seed-job-1',
      status: InspectionStatus.IN_PROGRESS,
      inspectorId,
      formData: seedFormData,
      progressPercent: 12,
      startedAt: new Date(),
      createdById: adminId,
      rooms: {
        create: seedRooms.map((room) => ({
          roomType:
            room.roomType === 'bedroom'
              ? InspectionRoomType.BEDROOM
              : room.roomType === 'bathroom'
                ? InspectionRoomType.BATHROOM
                : room.roomType === 'living'
                  ? InspectionRoomType.LIVING
                  : InspectionRoomType.GARAGE,
          roomIndex: room.roomIndex,
          label: room.label,
          data: room.data,
        })),
      },
    },
  });

  console.log('Seed complete.');
  console.log(`Default password for all seeded users: ${DEFAULT_PASSWORD}`);
  console.log(`Company: ${SITESCOP_COMPANY_NAME} (sitescop-demo)`);
  console.log(`Demo signing URL (agreement 2): http://localhost:5173/sign/${demoSigningToken}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
