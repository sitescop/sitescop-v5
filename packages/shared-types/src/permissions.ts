import { UserRole } from './auth.js';

export type Permission =
  | 'platform:manage'
  | 'companies:view_all'
  | 'companies:manage'
  | 'users:manage'
  | 'users:view'
  | 'jobs:view_all'
  | 'jobs:view'
  | 'jobs:create'
  | 'jobs:assign'
  | 'jobs:accept'
  | 'jobs:complete'
  | 'jobs:archive'
  | 'jobs:delete'
  | 'agreements:view'
  | 'agreements:send'
  | 'agreements:manage'
  | 'inspections:view'
  | 'inspections:edit'
  | 'reports:view'
  | 'reports:generate'
  | 'crm:view'
  | 'crm:manage'
  | 'calendar:view'
  | 'calendar:manage'
  | 'settings:view'
  | 'settings:manage'
  | 'audit:view'
  | 'billing:view'
  | 'client:portal';

const ALL_PERMISSIONS: Permission[] = [
  'platform:manage',
  'companies:view_all',
  'companies:manage',
  'users:manage',
  'users:view',
  'jobs:view_all',
  'jobs:view',
  'jobs:create',
  'jobs:assign',
  'jobs:accept',
  'jobs:complete',
  'jobs:archive',
  'jobs:delete',
  'agreements:view',
  'agreements:send',
  'agreements:manage',
  'inspections:view',
  'inspections:edit',
  'reports:view',
  'reports:generate',
  'crm:view',
  'crm:manage',
  'calendar:view',
  'calendar:manage',
  'settings:view',
  'settings:manage',
  'audit:view',
  'billing:view',
  'client:portal',
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: ALL_PERMISSIONS,
  [UserRole.COMPANY_ADMIN]: [
    'users:manage',
    'users:view',
    'jobs:view_all',
    'jobs:view',
    'jobs:create',
    'jobs:assign',
    'jobs:complete',
    'jobs:archive',
    'jobs:delete',
    'agreements:view',
    'agreements:send',
    'agreements:manage',
    'inspections:view',
    'inspections:edit',
    'reports:view',
    'reports:generate',
    'crm:view',
    'crm:manage',
    'calendar:view',
    'calendar:manage',
    'settings:view',
    'settings:manage',
    'audit:view',
    'billing:view',
  ],
  [UserRole.OFFICE_MANAGER]: [
    'users:view',
    'jobs:view_all',
    'jobs:view',
    'jobs:create',
    'jobs:assign',
    'jobs:complete',
    'jobs:archive',
    'agreements:view',
    'agreements:send',
    'agreements:manage',
    'inspections:view',
    'reports:view',
    'reports:generate',
    'crm:view',
    'crm:manage',
    'calendar:view',
    'calendar:manage',
    'settings:view',
  ],
  [UserRole.OFFICE_STAFF]: [
    'jobs:view',
    'jobs:create',
    'agreements:view',
    'agreements:send',
    'crm:view',
    'calendar:view',
    'settings:view',
  ],
  [UserRole.INSPECTOR]: [
    'jobs:view',
    'jobs:accept',
    'jobs:complete',
    'inspections:view',
    'inspections:edit',
    'calendar:view',
  ],
  [UserRole.ACCOUNTANT]: [
    'jobs:view',
    'agreements:view',
    'reports:view',
    'billing:view',
    'crm:view',
  ],
  [UserRole.CLIENT]: ['client:portal', 'agreements:view', 'reports:view'],
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}
