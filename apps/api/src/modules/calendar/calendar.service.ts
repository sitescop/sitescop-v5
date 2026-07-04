import { JobStatus, type Prisma } from '@prisma/client';
import type { AuthUser } from '@sitescop/shared-types';
import { UserRole, roleHasPermission } from '@sitescop/shared-types';
import type {
  CalendarEvent,
  CalendarEventsResponse,
  RescheduleCalendarEventRequest,
  TodayJobsResponse,
  UnscheduledJobSummary,
  UnscheduledJobsResponse,
} from '@sitescop/shared-types';
import { z } from 'zod';
import { createAuditLog } from '../../shared/audit/audit.service.js';
import { prisma } from '../../shared/database/prisma.js';
import { AppError, ForbiddenError, NotFoundError } from '../../shared/http/errors.js';
import { mapContactSummary, mapProperty, mapUserSummary, formatPropertyAddress } from '../../shared/mappers/index.js';
import { notifyClientSms } from '../../shared/sms/notify-client.js';
import { clientFirstNameFromParts } from '../../shared/crm/client-name.js';
import { resolveCompanyScope } from '../../shared/scoping/company-scope.js';

const jobInclude = {
  property: true,
  clientContact: true,
  agentContact: true,
  assignedInspector: true,
  createdBy: true,
  assignments: {
    include: { inspector: true },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.JobInclude;

type JobWithRelations = Prisma.JobGetPayload<{ include: typeof jobInclude }>;

async function getJobOrThrow(id: string, companyId?: string): Promise<JobWithRelations> {
  const job = await prisma.job.findFirst({
    where: { id, ...(companyId ? { companyId } : {}), deletedAt: null },
    include: jobInclude,
  });
  if (!job) throw new NotFoundError('Job not found');
  return job;
}

const ACTIVE_STATUSES: JobStatus[] = [
  JobStatus.DRAFT,
  JobStatus.PENDING_ASSIGNMENT,
  JobStatus.ASSIGNED,
  JobStatus.ACCEPTED,
  JobStatus.IN_PROGRESS,
  JobStatus.COMPLETED,
];

export const calendarQuerySchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  inspectorId: z.string().optional(),
});

export const rescheduleSchema = z.object({
  scheduledDate: z.string().min(1),
  scheduledTime: z.string().max(20).optional(),
  inspectorId: z.string().optional(),
});

function parseRangeDate(value: string, endOfDay: boolean): Date {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
    if (Number.isNaN(date.getTime())) {
      throw new AppError('Invalid date range', 'VALIDATION_ERROR');
    }
    return date;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid date range', 'VALIDATION_ERROR');
  }
  return date;
}

function toScheduledIso(dateInput: string): Date {
  const trimmed = dateInput.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00.000Z`);
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid scheduled date', 'VALIDATION_ERROR');
  }
  return date;
}

function mapCalendarEvent(
  job: Prisma.JobGetPayload<{
    include: {
      property: true;
      clientContact: true;
      assignedInspector: true;
    };
  }>,
  inspection: { id: string; status: string } | null,
): CalendarEvent {
  const client = job.clientContact ? mapContactSummary(job.clientContact) : null;
  return {
    id: job.id,
    jobId: job.id,
    jobNumber: job.jobNumber,
    title: job.title,
    type: job.type as CalendarEvent['type'],
    status: job.status as CalendarEvent['status'],
    inspectionStatus: (inspection?.status ?? null) as CalendarEvent['inspectionStatus'],
    inspectionId: inspection?.id ?? null,
    scheduledDate: job.scheduledDate!.toISOString(),
    scheduledTime: job.scheduledTime,
    propertyAddress: job.property ? mapProperty(job.property).formattedAddress : null,
    clientName: client?.displayName ?? null,
    clientFirstName: client
      ? clientFirstNameFromParts(client.firstName, client.lastName)
      : null,
    inspectorId: job.assignedInspectorId,
    inspectorName: job.assignedInspector ? mapUserSummary(job.assignedInspector).displayName : null,
  };
}

function inspectionMapFromRows(
  rows: { jobId: string; id: string; status: string }[],
): Map<string, { id: string; status: string }> {
  const map = new Map<string, { id: string; status: string }>();
  for (const row of rows) {
    if (!map.has(row.jobId)) {
      map.set(row.jobId, { id: row.id, status: row.status });
    }
  }
  return map;
}

export async function listCalendarEvents(
  user: AuthUser,
  query: Record<string, string>,
): Promise<CalendarEventsResponse> {
  const data = calendarQuerySchema.parse(query);
  const companyId = resolveCompanyScope(user);
  const hasViewAll = roleHasPermission(user.role, 'jobs:view_all');
  const start = parseRangeDate(data.start, false);
  const end = parseRangeDate(data.end, true);

  const baseWhere: Prisma.JobWhereInput = {
    ...(companyId ? { companyId } : {}),
    deletedAt: null,
    archivedAt: null,
    status: { in: ACTIVE_STATUSES },
  };

  if (user.role === UserRole.INSPECTOR && !hasViewAll) {
    baseWhere.assignedInspectorId = user.id;
  } else if (data.inspectorId) {
    baseWhere.assignedInspectorId = data.inspectorId;
  }

  const [scheduledJobs, unscheduledCount] = await Promise.all([
    prisma.job.findMany({
      where: {
        ...baseWhere,
        scheduledDate: { gte: start, lte: end },
      },
      include: {
        property: true,
        clientContact: true,
        assignedInspector: true,
      },
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
    }),
    prisma.job.count({
      where: {
        ...baseWhere,
        scheduledDate: null,
      },
    }),
  ]);

  const jobIds = scheduledJobs.map((job) => job.id);
  const inspectionRows =
    jobIds.length === 0
      ? []
      : await prisma.inspection.findMany({
          where: { jobId: { in: jobIds }, ...(companyId ? { companyId } : {}) },
          orderBy: { createdAt: 'desc' },
          select: { jobId: true, id: true, status: true },
        });

  const inspectionByJob = inspectionMapFromRows(inspectionRows);

  return {
    events: scheduledJobs.map((job) => mapCalendarEvent(job, inspectionByJob.get(job.id) ?? null)),
    unscheduledCount,
  };
}

export async function listTodayJobs(
  user: AuthUser,
  query: Record<string, string>,
): Promise<TodayJobsResponse> {
  const date = query.date?.trim();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError('date query param required (YYYY-MM-DD)', 'VALIDATION_ERROR');
  }

  const result = await listCalendarEvents(user, {
    start: date,
    end: date,
    ...(query.inspectorId ? { inspectorId: query.inspectorId } : {}),
  });

  return {
    date,
    events: result.events,
    total: result.events.length,
  };
}

export async function listUnscheduledJobs(
  user: AuthUser,
  query: Record<string, string>,
): Promise<UnscheduledJobsResponse> {
  const companyId = resolveCompanyScope(user);
  const hasViewAll = roleHasPermission(user.role, 'jobs:view_all');
  const limit = Math.min(Number.parseInt(query.limit ?? '20', 10) || 20, 50);

  const baseWhere: Prisma.JobWhereInput = {
    ...(companyId ? { companyId } : {}),
    deletedAt: null,
    archivedAt: null,
    scheduledDate: null,
    status: { in: ACTIVE_STATUSES.filter((s) => s !== JobStatus.COMPLETED && s !== JobStatus.CANCELLED) },
  };

  if (user.role === UserRole.INSPECTOR && !hasViewAll) {
    baseWhere.assignedInspectorId = user.id;
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where: baseWhere,
      include: { property: true, clientContact: true, assignedInspector: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.job.count({ where: baseWhere }),
  ]);

  return {
    jobs: jobs.map((job) => {
      const client = job.clientContact ? mapContactSummary(job.clientContact) : null;
      return {
        id: job.id,
        jobNumber: job.jobNumber,
        title: job.title,
        type: job.type as UnscheduledJobSummary['type'],
        status: job.status as UnscheduledJobSummary['status'],
        clientName: client?.displayName ?? null,
        propertyAddress: job.property ? mapProperty(job.property).formattedAddress : null,
        inspectorName: job.assignedInspector ? mapUserSummary(job.assignedInspector).displayName : null,
      };
    }),
    total,
  };
}

export async function rescheduleCalendarEvent(
  user: AuthUser,
  jobId: string,
  input: RescheduleCalendarEventRequest,
  request?: import('fastify').FastifyRequest,
) {
  if (!roleHasPermission(user.role, 'calendar:manage')) {
    throw new ForbiddenError('You cannot reschedule jobs on the calendar');
  }

  const data = rescheduleSchema.parse(input);
  const companyId = resolveCompanyScope(user);
  const job = await getJobOrThrow(jobId, companyId);

  if (job.deletedAt || job.archivedAt) {
    throw new AppError('Cannot schedule an archived or deleted job', 'INVALID_STATE');
  }

  if (job.status === JobStatus.CANCELLED) {
    throw new AppError('Cannot schedule a cancelled job', 'INVALID_STATE');
  }

  let assignedInspectorId = job.assignedInspectorId;
  if (data.inspectorId && data.inspectorId !== job.assignedInspectorId) {
    if (!roleHasPermission(user.role, 'jobs:assign')) {
      throw new ForbiddenError('You cannot reassign the inspector');
    }
    const inspector = await prisma.user.findFirst({
      where: {
        id: data.inspectorId,
        companyId: job.companyId,
        role: UserRole.INSPECTOR,
        status: 'ACTIVE',
      },
    });
    if (!inspector) {
      throw new AppError('Inspector not found', 'VALIDATION_ERROR');
    }
    assignedInspectorId = inspector.id;
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      scheduledDate: toScheduledIso(data.scheduledDate),
      scheduledTime: data.scheduledTime?.trim() || null,
      ...(data.inspectorId ? { assignedInspectorId: assignedInspectorId } : {}),
    },
  });

  await createAuditLog({
    companyId: job.companyId,
    actorId: user.id,
    action: 'calendar.rescheduled',
    entityType: 'Job',
    entityId: jobId,
    metadata: {
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      inspectorId: data.inspectorId,
    },
    request,
  });

  const updated = await getJobOrThrow(jobId, companyId);
  const latestInspection = await prisma.inspection.findFirst({
    where: { jobId, companyId: job.companyId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  });

  if (updated.scheduledDate) {
    const company = await prisma.company.findUnique({
      where: { id: job.companyId },
      select: { name: true, phone: true },
    });
    const scheduledDate = `${updated.scheduledDate.toLocaleDateString('en-AU')}${
      updated.scheduledTime ? ` at ${updated.scheduledTime}` : ''
    }`;
    void notifyClientSms(
      job.companyId,
      {
        phone: updated.clientContact?.phone,
        contactId: updated.clientContactId,
      },
      'jobReminder',
      {
        clientName:
          clientFirstNameFromParts(
            updated.clientContact?.firstName ?? '',
            updated.clientContact?.lastName ?? '',
          ) || 'Client',
        jobNumber: updated.jobNumber,
        propertyAddress: updated.property ? formatPropertyAddress(updated.property) : '—',
        scheduledDate,
        companyName: company?.name ?? '',
        companyPhone: company?.phone ?? '',
      },
    );
  }

  return {
    event: mapCalendarEvent(updated, latestInspection),
  };
}
