import type { User, Company } from '@prisma/client';
import {
  type AuthUser,
  type CompanySummary,
  UserRole as SharedUserRole,
  UserStatus as SharedUserStatus,
} from '@sitescop/shared-types';

type UserWithCompany = User & { company: Company | null };

export function mapUserToAuthUser(user: UserWithCompany): AuthUser {
  const company: CompanySummary | null = user.company
    ? {
        id: user.company.id,
        name: user.company.name,
        slug: user.company.slug,
      }
    : null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as SharedUserRole,
    companyId: user.companyId,
    company,
    status: user.status as SharedUserStatus,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export function getUserDisplayName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`.trim();
}
