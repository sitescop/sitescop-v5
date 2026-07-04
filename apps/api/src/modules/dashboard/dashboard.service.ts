import type { AuthUser, RoleDashboardData } from '@sitescop/shared-types';
import { UserRole } from '@sitescop/shared-types';
import { JobStatus, AgreementStatus, InspectionStatus } from '@prisma/client';
import { prisma } from '../../shared/database/prisma.js';
import { resolveCompanyScope } from '../../shared/scoping/company-scope.js';

export async function getDashboardDataForUser(user: AuthUser): Promise<RoleDashboardData> {
  const companyId = resolveCompanyScope(user);
  const jobWhere = {
    ...(companyId ? { companyId } : {}),
    deletedAt: null,
    archivedAt: null,
  };

  const agreementWhere = companyId ? { companyId } : {};

  const [
    totalJobs,
    inProgressJobs,
    pendingAssignment,
    inspectorCount,
    contactCount,
    companyCount,
    userCount,
    pendingAgreements,
    signedAgreements,
    activeInspections,
    recentAudit,
  ] = await Promise.all([
    prisma.job.count({ where: jobWhere }),
    prisma.job.count({ where: { ...jobWhere, status: JobStatus.IN_PROGRESS } }),
    prisma.job.count({ where: { ...jobWhere, status: JobStatus.PENDING_ASSIGNMENT } }),
    prisma.user.count({
      where: {
        ...(companyId ? { companyId } : {}),
        role: UserRole.INSPECTOR,
        status: 'ACTIVE',
      },
    }),
    prisma.contact.count({
      where: { ...(companyId ? { companyId } : {}), deletedAt: null },
    }),
    prisma.company.count(),
    prisma.user.count({ where: companyId ? { companyId } : {} }),
    prisma.agreement.count({
      where: {
        ...agreementWhere,
        status: { in: [AgreementStatus.DRAFT, AgreementStatus.SENT, AgreementStatus.VIEWED] },
      },
    }),
    prisma.agreement.count({
      where: { ...agreementWhere, status: AgreementStatus.SIGNED },
    }),
    prisma.inspection.count({
      where: {
        ...(companyId ? { companyId } : {}),
        status: { in: [InspectionStatus.DRAFT, InspectionStatus.IN_PROGRESS] },
      },
    }),
    prisma.auditLog.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const activities = recentAudit.map((log) => ({
    id: log.id,
    message: `${log.action} on ${log.entityType}`,
    timestamp: log.createdAt.toISOString(),
    type: log.action.includes('deleted') || log.action.includes('cancelled')
      ? ('warning' as const)
      : log.action.includes('created') || log.action.includes('completed')
        ? ('success' as const)
        : ('info' as const),
  }));

  const name = user.firstName;

  switch (user.role) {
    case UserRole.SUPER_ADMIN:
      return {
        role: user.role,
        stats: [
          { id: 'companies', label: 'Active Companies', value: companyCount },
          { id: 'users', label: 'Platform Users', value: userCount },
          { id: 'jobs', label: 'Total Jobs', value: totalJobs },
          { id: 'contacts', label: 'CRM Contacts', value: contactCount },
        ],
        activities: activities.length
          ? activities
          : [{ id: '1', message: 'Platform ready', timestamp: new Date().toISOString(), type: 'info' as const }],
        quickActions: [
          { id: 'companies', label: 'Manage Companies', href: '/admin/companies' },
          { id: 'users', label: 'Manage Users', href: '/admin/users' },
          { id: 'audit', label: 'View Audit Logs', href: '/admin/audit' },
        ],
      };

    case UserRole.COMPANY_ADMIN:
      return {
        role: user.role,
        stats: [
          { id: 'jobs-today', label: 'Active Jobs', value: totalJobs },
          { id: 'in-progress', label: 'In Progress', value: inProgressJobs },
          { id: 'agreements-pending', label: 'Pending Agreements', value: pendingAgreements },
          { id: 'inspections-active', label: 'Active Inspections', value: activeInspections },
          { id: 'inspectors', label: 'Active Inspectors', value: inspectorCount },
        ],
        activities: activities.length
          ? activities
          : [{ id: '1', message: `${name}, your company workspace is ready`, timestamp: new Date().toISOString(), type: 'success' as const }],
        quickActions: [
          { id: 'new-job', label: 'Create Job', href: '/jobs/new' },
          { id: 'send-agreement', label: 'Send Agreement', href: '/agreements/send' },
          { id: 'inspections', label: 'View Inspections', href: '/inspections' },
          { id: 'users', label: 'Manage Users', href: '/admin/users' },
          { id: 'settings', label: 'Company Settings', href: '/settings/company' },
        ],
      };

    case UserRole.OFFICE_MANAGER:
      return {
        role: user.role,
        stats: [
          { id: 'unassigned', label: 'Unassigned Jobs', value: pendingAssignment },
          { id: 'agreements-pending', label: 'Pending Agreements', value: pendingAgreements },
          { id: 'total', label: 'Active Jobs', value: totalJobs },
          { id: 'contacts', label: 'CRM Contacts', value: contactCount },
        ],
        activities,
        quickActions: [
          { id: 'assign', label: 'Assign Inspector', href: '/jobs' },
          { id: 'agreements', label: 'Agreement Pipeline', href: '/agreements' },
          { id: 'admin-jobs', label: 'All Jobs', href: '/admin/jobs' },
        ],
      };

    case UserRole.OFFICE_STAFF:
      return {
        role: user.role,
        stats: [
          { id: 'open-jobs', label: 'Open Jobs', value: totalJobs },
          { id: 'draft-agreements', label: 'Draft Agreements', value: pendingAgreements },
          { id: 'clients', label: 'Clients', value: contactCount },
        ],
        activities,
        quickActions: [
          { id: 'new-job', label: 'New Job', href: '/jobs/new' },
          { id: 'send-agreement', label: 'Send Agreement', href: '/agreements/send' },
          { id: 'crm', label: 'View Clients', href: '/crm' },
        ],
      };

    case UserRole.INSPECTOR: {
      const myJobs = await prisma.job.count({
        where: {
          ...(companyId ? { companyId } : {}),
          assignedInspectorId: user.id,
          deletedAt: null,
          archivedAt: null,
        },
      });
      const awaiting = await prisma.job.count({
        where: {
          ...(companyId ? { companyId } : {}),
          assignedInspectorId: user.id,
          status: JobStatus.ASSIGNED,
          deletedAt: null,
        },
      });
      return {
        role: user.role,
        stats: [
          { id: 'my-jobs', label: 'My Jobs', value: myJobs },
          { id: 'pending-accept', label: 'Awaiting Acceptance', value: awaiting },
          { id: 'in-progress', label: 'In Progress', value: inProgressJobs },
        ],
        activities,
        quickActions: [
          { id: 'today', label: "Today's Jobs", href: '/dashboard?tab=today' },
          { id: 'jobs', label: 'My Jobs', href: '/jobs' },
          { id: 'inspections', label: 'My Inspections', href: '/inspections' },
          { id: 'calendar', label: 'Calendar', href: '/calendar?view=today' },
        ],
      };
    }

    case UserRole.ACCOUNTANT:
      return {
        role: user.role,
        stats: [
          { id: 'jobs', label: 'Jobs', value: totalJobs },
          { id: 'contacts', label: 'Contacts', value: contactCount },
        ],
        activities,
        quickActions: [{ id: 'crm', label: 'View CRM', href: '/crm' }],
      };

    case UserRole.CLIENT: {
      const myAgreements = await prisma.agreement.count({
        where: {
          ...(companyId ? { companyId } : {}),
          clientEmail: { equals: user.email, mode: 'insensitive' },
        },
      });
      const mySigned = await prisma.agreement.count({
        where: {
          ...(companyId ? { companyId } : {}),
          clientEmail: { equals: user.email, mode: 'insensitive' },
          status: AgreementStatus.SIGNED,
        },
      });
      return {
        role: user.role,
        stats: [
          { id: 'agreements', label: 'My Agreements', value: myAgreements },
          { id: 'signed', label: 'Signed', value: mySigned },
        ],
        activities: [
          {
            id: '1',
            message: 'Welcome to your SiteScop client portal',
            timestamp: new Date().toISOString(),
            type: 'info' as const,
          },
        ],
        quickActions: [{ id: 'agreements', label: 'View Agreements', href: '/agreements' }],
      };
    }

    default:
      return { role: user.role, stats: [], activities: [], quickActions: [] };
  }
}
