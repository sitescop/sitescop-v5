import { UserRole } from './auth.js';
import type { Permission } from './permissions.js';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  permission?: Permission;
  roles?: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    id: 'jobs',
    label: 'Jobs',
    href: '/jobs',
    icon: 'Briefcase',
    permission: 'jobs:view',
  },
  {
    id: 'agreements',
    label: 'Agreements',
    href: '/agreements',
    icon: 'FileSignature',
    permission: 'agreements:view',
  },
  {
    id: 'inspections',
    label: 'Inspections',
    href: '/inspections',
    icon: 'ClipboardCheck',
    permission: 'inspections:view',
  },
  {
    id: 'crm',
    label: 'CRM',
    href: '/crm',
    icon: 'Users',
    permission: 'crm:view',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    href: '/calendar',
    icon: 'Calendar',
    permission: 'calendar:view',
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: 'FileText',
    permission: 'reports:view',
  },
  {
    id: 'accounts',
    label: 'Accounts',
    href: '/accounts',
    icon: 'CreditCard',
    permission: 'billing:view',
  },
  {
    id: 'admin',
    label: 'Admin',
    href: '/admin',
    icon: 'Shield',
    permission: 'users:view',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: 'Settings',
    permission: 'settings:view',
  },
  {
    id: 'companies',
    label: 'Companies',
    href: '/admin/companies',
    icon: 'Building2',
    roles: [UserRole.SUPER_ADMIN],
  },
];

export function getNavItemsForRole(
  role: UserRole,
  hasPermission: (permission: Permission) => boolean,
): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(role)) {
      return false;
    }
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    return true;
  });
}
