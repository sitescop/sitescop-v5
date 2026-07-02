import type { AuthUser, RoleDashboardData } from '@sitescop/shared-types';
import { UserRole } from '@sitescop/shared-types';

function buildStats(
  items: Array<{ id: string; label: string; value: string | number; change?: string; trend?: 'up' | 'down' | 'neutral' }>,
) {
  return items;
}

function buildActivities(
  items: Array<{ id: string; message: string; timestamp: string; type: 'info' | 'success' | 'warning' }>,
) {
  return items;
}

export function getDashboardDataForUser(user: AuthUser): RoleDashboardData {
  const now = new Date().toISOString();
  const name = user.firstName;

  switch (user.role) {
    case UserRole.SUPER_ADMIN:
      return {
        role: user.role,
        stats: buildStats([
          { id: 'companies', label: 'Active Companies', value: 1, change: '+0 this month', trend: 'neutral' },
          { id: 'users', label: 'Platform Users', value: 7, change: 'All roles seeded', trend: 'neutral' },
          { id: 'jobs', label: 'Total Jobs', value: 0, change: 'Phase 1', trend: 'neutral' },
          { id: 'agreements', label: 'Agreements', value: 0, change: 'Phase 2', trend: 'neutral' },
        ]),
        activities: buildActivities([
          { id: '1', message: 'Platform foundation deployed', timestamp: now, type: 'success' },
          { id: '2', message: 'Awaiting Phase 1 job module', timestamp: now, type: 'info' },
        ]),
        quickActions: [
          { id: 'companies', label: 'Manage Companies', href: '/admin/companies' },
          { id: 'users', label: 'Manage Users', href: '/admin' },
          { id: 'audit', label: 'View Audit Logs', href: '/admin/audit' },
        ],
      };

    case UserRole.COMPANY_ADMIN:
      return {
        role: user.role,
        stats: buildStats([
          { id: 'jobs-today', label: 'Jobs Today', value: 0 },
          { id: 'in-progress', label: 'In Progress', value: 0 },
          { id: 'agreements-pending', label: 'Pending Agreements', value: 0 },
          { id: 'inspectors', label: 'Active Inspectors', value: 1 },
        ]),
        activities: buildActivities([
          { id: '1', message: `${name}, your company workspace is ready`, timestamp: now, type: 'success' },
        ]),
        quickActions: [
          { id: 'new-job', label: 'Create Job', href: '/jobs/new' },
          { id: 'send-agreement', label: 'Send Agreement', href: '/agreements/send' },
          { id: 'users', label: 'Manage Users', href: '/admin' },
          { id: 'settings', label: 'Company Settings', href: '/settings' },
        ],
      };

    case UserRole.OFFICE_MANAGER:
      return {
        role: user.role,
        stats: buildStats([
          { id: 'unassigned', label: 'Unassigned Jobs', value: 0 },
          { id: 'overdue', label: 'Overdue Inspections', value: 0 },
          { id: 'agreements-sent', label: 'Agreements Sent', value: 0 },
          { id: 'scheduled-today', label: 'Scheduled Today', value: 0 },
        ]),
        activities: buildActivities([
          { id: '1', message: 'No overdue inspections', timestamp: now, type: 'success' },
        ]),
        quickActions: [
          { id: 'assign', label: 'Assign Inspector', href: '/jobs' },
          { id: 'calendar', label: 'View Calendar', href: '/calendar' },
          { id: 'agreements', label: 'Agreement Pipeline', href: '/agreements' },
        ],
      };

    case UserRole.OFFICE_STAFF:
      return {
        role: user.role,
        stats: buildStats([
          { id: 'open-jobs', label: 'Open Jobs', value: 0 },
          { id: 'draft-agreements', label: 'Draft Agreements', value: 0 },
          { id: 'clients', label: 'Clients', value: 0 },
        ]),
        activities: buildActivities([
          { id: '1', message: 'Ready to create new jobs and send agreements', timestamp: now, type: 'info' },
        ]),
        quickActions: [
          { id: 'new-job', label: 'New Job', href: '/jobs/new' },
          { id: 'send-agreement', label: 'Send Agreement', href: '/agreements/send' },
          { id: 'crm', label: 'View Clients', href: '/crm' },
        ],
      };

    case UserRole.INSPECTOR:
      return {
        role: user.role,
        stats: buildStats([
          { id: 'today', label: 'Jobs Today', value: 0 },
          { id: 'pending-accept', label: 'Awaiting Acceptance', value: 0 },
          { id: 'in-progress', label: 'In Progress', value: 0 },
          { id: 'sync', label: 'Sync Status', value: 'Online', trend: 'up' },
        ]),
        activities: buildActivities([
          { id: '1', message: 'No jobs assigned for today', timestamp: now, type: 'info' },
        ]),
        quickActions: [
          { id: 'schedule', label: 'My Schedule', href: '/calendar' },
          { id: 'jobs', label: 'My Jobs', href: '/jobs' },
        ],
      };

    case UserRole.ACCOUNTANT:
      return {
        role: user.role,
        stats: buildStats([
          { id: 'unpaid', label: 'Unpaid Agreements', value: 0 },
          { id: 'invoices', label: 'Invoices Due', value: 0 },
          { id: 'paid-month', label: 'Paid This Month', value: '$0' },
        ]),
        activities: buildActivities([
          { id: '1', message: 'No outstanding invoices', timestamp: now, type: 'success' },
        ]),
        quickActions: [
          { id: 'accounts', label: 'Accounts', href: '/accounts' },
          { id: 'reports', label: 'Financial Reports', href: '/reports' },
        ],
      };

    case UserRole.CLIENT:
      return {
        role: user.role,
        stats: buildStats([
          { id: 'agreements', label: 'My Agreements', value: 0 },
          { id: 'reports', label: 'Available Reports', value: 0 },
          { id: 'payments', label: 'Pending Payments', value: 0 },
        ]),
        activities: buildActivities([
          { id: '1', message: 'Welcome to your SiteScop client portal', timestamp: now, type: 'info' },
        ]),
        quickActions: [
          { id: 'agreements', label: 'View Agreements', href: '/agreements' },
          { id: 'reports', label: 'View Reports', href: '/reports' },
        ],
      };

    default:
      return {
        role: user.role,
        stats: [],
        activities: [],
        quickActions: [],
      };
  }
}
