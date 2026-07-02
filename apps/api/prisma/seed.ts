import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { hashPassword } from '../src/shared/auth/crypto.js';

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
      name: 'SiteScop Demo Inspections',
      email: 'info@sitescop-demo.com.au',
      phone: '1300 000 000',
      address: '123 Inspection Way, Sydney NSW 2000',
    },
    create: {
      name: 'SiteScop Demo Inspections',
      slug: 'sitescop-demo',
      abn: '12 345 678 901',
      email: 'info@sitescop-demo.com.au',
      phone: '1300 000 000',
      address: '123 Inspection Way, Sydney NSW 2000',
    },
  });

  for (const seedUser of seedUsers) {
    await prisma.user.upsert({
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
  }

  console.log('Seed complete.');
  console.log(`Default password for all seeded users: ${DEFAULT_PASSWORD}`);
  console.log('Demo company: SiteScop Demo Inspections (sitescop-demo)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
