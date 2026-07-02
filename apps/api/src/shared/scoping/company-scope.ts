import type { AuthUser } from '@sitescop/shared-types';
import { UserRole } from '@sitescop/shared-types';
import { ForbiddenError } from '../http/errors.js';

export function requireCompanyId(user: AuthUser): string {
  if (user.role === UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Company context required for this operation');
  }
  if (!user.companyId) {
    throw new ForbiddenError('No company association');
  }
  return user.companyId;
}

export function resolveCompanyScope(
  user: AuthUser,
  requestedCompanyId?: string | null,
): string | undefined {
  if (user.role === UserRole.SUPER_ADMIN) {
    return requestedCompanyId ?? undefined;
  }
  if (!user.companyId) {
    throw new ForbiddenError('No company association');
  }
  if (requestedCompanyId && requestedCompanyId !== user.companyId) {
    throw new ForbiddenError('Cannot access another company');
  }
  return user.companyId;
}

export function assertSuperAdmin(user: AuthUser): void {
  if (user.role !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Super admin access required');
  }
}

export function assertCanManageCompany(user: AuthUser, companyId: string): void {
  if (user.role === UserRole.SUPER_ADMIN) {
    return;
  }
  if (user.companyId !== companyId) {
    throw new ForbiddenError('Cannot access another company');
  }
}
