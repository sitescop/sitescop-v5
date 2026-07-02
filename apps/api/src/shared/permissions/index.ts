import {
  type Permission,
  roleHasPermission,
  getPermissionsForRole,
  UserRole,
} from '@sitescop/shared-types';

export { roleHasPermission, getPermissionsForRole };

export function assertPermission(role: UserRole, permission: Permission): void {
  if (!roleHasPermission(role, permission)) {
    throw new PermissionDeniedError(permission);
  }
}

export class PermissionDeniedError extends Error {
  readonly permission: Permission;

  constructor(permission: Permission) {
    super(`Permission denied: ${permission}`);
    this.name = 'PermissionDeniedError';
    this.permission = permission;
  }
}

export function createPermissionChecker(role: UserRole) {
  return {
    has: (permission: Permission) => roleHasPermission(role, permission),
    all: () => getPermissionsForRole(role),
    assert: (permission: Permission) => assertPermission(role, permission),
  };
}
