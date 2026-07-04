import type { Prisma } from '@prisma/client';
import type { AuthUser } from '@sitescop/shared-types';
import { UserRole, roleHasPermission } from '@sitescop/shared-types';
import type { GlobalSearchResponse, SearchResultItem } from '@sitescop/shared-types';
import { prisma } from '../../shared/database/prisma.js';
import { resolveCompanyScope } from '../../shared/scoping/company-scope.js';
import { mapProperty } from '../../shared/mappers/index.js';

const MIN_QUERY_LENGTH = 2;
const LIMIT_PER_TYPE = 5;

function containsQuery(q: string): Prisma.StringFilter {
  return { contains: q, mode: 'insensitive' };
}

export async function globalSearch(user: AuthUser, rawQuery: string): Promise<GlobalSearchResponse> {
  const query = rawQuery.trim();
  if (query.length < MIN_QUERY_LENGTH) {
    return { query, results: [] };
  }

  const companyId = resolveCompanyScope(user);
  const companyFilter = companyId ? { companyId } : {};
  const hasViewAll = roleHasPermission(user.role, 'jobs:view_all');
  const inspectorOwnJobs =
    user.role === UserRole.INSPECTOR && !hasViewAll ? { assignedInspectorId: user.id } : {};

  const tasks: Promise<SearchResultItem[]>[] = [];

  if (roleHasPermission(user.role, 'jobs:view')) {
    tasks.push(
      prisma.job
        .findMany({
          where: {
            ...companyFilter,
            ...inspectorOwnJobs,
            deletedAt: null,
            archivedAt: null,
            OR: [
              { jobNumber: containsQuery(query) },
              { title: containsQuery(query) },
              { property: { addressLine1: containsQuery(query) } },
              { property: { suburb: containsQuery(query) } },
              { clientContact: { firstName: containsQuery(query) } },
              { clientContact: { lastName: containsQuery(query) } },
            ],
          },
          include: { property: true, clientContact: true },
          orderBy: { updatedAt: 'desc' },
          take: LIMIT_PER_TYPE,
        })
        .then((jobs) =>
          jobs.map((job) => ({
            id: job.id,
            type: 'job' as const,
            title: `${job.jobNumber} — ${job.title}`,
            subtitle: job.property ? mapProperty(job.property).formattedAddress : null,
          })),
        ),
    );
  }

  if (roleHasPermission(user.role, 'crm:view')) {
    tasks.push(
      prisma.contact
        .findMany({
          where: {
            ...companyFilter,
            deletedAt: null,
            OR: [
              { firstName: containsQuery(query) },
              { lastName: containsQuery(query) },
              { email: containsQuery(query) },
              { phone: containsQuery(query) },
              { companyName: containsQuery(query) },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          take: LIMIT_PER_TYPE,
        })
        .then((contacts) =>
          contacts.map((contact) => ({
            id: contact.id,
            type: 'contact' as const,
            title: `${contact.firstName} ${contact.lastName}`.trim(),
            subtitle: contact.email ?? contact.phone,
          })),
        ),
    );
  }

  if (roleHasPermission(user.role, 'agreements:view')) {
    tasks.push(
      prisma.agreement
        .findMany({
          where: {
            ...companyFilter,
            OR: [
              { agreementNumber: containsQuery(query) },
              { clientName: containsQuery(query) },
              { clientEmail: containsQuery(query) },
              { propertyAddress: containsQuery(query) },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          take: LIMIT_PER_TYPE,
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            type: 'agreement' as const,
            title: `${row.agreementNumber} — ${row.clientName}`,
            subtitle: row.propertyAddress,
          })),
        ),
    );
  }

  if (roleHasPermission(user.role, 'inspections:view')) {
    const searchOr: Prisma.InspectionWhereInput[] = [
      { inspectionNumber: containsQuery(query) },
      { job: { jobNumber: containsQuery(query) } },
      { job: { title: containsQuery(query) } },
    ];

    const inspectionWhere: Prisma.InspectionWhereInput = {
      ...companyFilter,
      OR: searchOr,
      ...(user.role === UserRole.INSPECTOR && !hasViewAll
        ? { job: { assignedInspectorId: user.id } }
        : {}),
    };

    tasks.push(
      prisma.inspection
        .findMany({
          where: inspectionWhere,
          include: { job: { include: { property: true } } },
          orderBy: { updatedAt: 'desc' },
          take: LIMIT_PER_TYPE,
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            type: 'inspection' as const,
            title: `${row.inspectionNumber} — ${row.job.title}`,
            subtitle: row.job.property ? mapProperty(row.job.property).formattedAddress : null,
          })),
        ),
    );
  }

  if (roleHasPermission(user.role, 'billing:view')) {
    tasks.push(
      prisma.invoice
        .findMany({
          where: {
            ...companyFilter,
            OR: [
              { invoiceNumber: containsQuery(query) },
              { clientName: containsQuery(query) },
              { clientEmail: containsQuery(query) },
              { description: containsQuery(query) },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          take: LIMIT_PER_TYPE,
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            type: 'invoice' as const,
            title: `${row.invoiceNumber} — ${row.clientName}`,
            subtitle: row.description,
          })),
        ),
    );
  }

  const groups = await Promise.all(tasks);
  return { query, results: groups.flat() };
}
