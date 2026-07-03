import {
  AssignmentStatus,
  InspectionStatus,
  JobStatus,
  JobType,
  type Prisma,
} from '@prisma/client';
import type { AuthUser } from '@sitescop/shared-types';
import { UserRole, roleHasPermission } from '@sitescop/shared-types';
import type {
  AssignJobRequest,
  CreateJobRequest,
  DeclineJobRequest,
  JobDetail,
  JobsListResponse,
  JobSummary,
  UpdateJobRequest,
} from '@sitescop/shared-types';
import { z } from 'zod';
import { createAuditLog } from '../../shared/audit/audit.service.js';
import { NotFoundError, ForbiddenError, AppError } from '../../shared/http/errors.js';
import { parsePagination } from '../../shared/http/validation.js';
import {
  canInspectorAccessJob,
  generateJobNumber,
  mapContactSummary,
  mapProperty,
  mapUserSummary,
} from '../../shared/mappers/index.js';
import { resolveCompanyScope } from '../../shared/scoping/company-scope.js';
import { prisma } from '../../shared/database/prisma.js';
import {
  assertJobReadyForInspection,
  getJobBillingStatus,
} from '../../shared/billing/job-billing-readiness.js';
import { NotificationType, AgreementStatus } from '@prisma/client';
import { createNotification } from '../notifications/notifications.service.js';
import { loadCompanyEmailContext, sendCompanyEmail } from '../../shared/email/email.service.js';
import { formatPropertyAddress } from '../../shared/mappers/index.js';
import {
  createAgreementFromJob,
  sendAgreement,
} from '../agreements/agreements.service.js';
import type { SendJobAgreementResponse } from '@sitescop/shared-types';

const propertySchema = z.object({
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  suburb: z.string().min(1, 'Suburb is required'),
  state: z.string().min(2).max(3),
  postcode: z.string().min(4).max(4),
});

export const createJobSchema = z.object({
  companyId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  type: z.nativeEnum(JobType),
  clientContactId: z.string().min(1, 'Client is required'),
  agentContactId: z.string().optional(),
  property: propertySchema,
  scheduledDate: z.string().datetime().optional(),
  scheduledTime: z.string().max(20).optional(),
  priceCents: z.number().int().min(1, 'Price is required'),
  notes: z.string().max(5000).optional(),
});

export const updateJobSchema = createJobSchema.partial();

export const assignJobSchema = z.object({
  inspectorId: z.string().min(1),
});

export const declineJobSchema = z.object({
  reason: z.string().max(500).optional(),
});

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

async function buildJobDetailResponse(job: JobWithRelations): Promise<JobDetail> {
  const billing = await getJobBillingStatus(job.id, job.companyId);
  return mapJobDetail(job, billing);
}

function mapJobSummary(job: JobWithRelations): JobSummary {
  return {
    id: job.id,
    jobNumber: job.jobNumber,
    title: job.title,
    type: job.type as JobSummary['type'],
    status: job.status as JobSummary['status'],
    scheduledDate: job.scheduledDate?.toISOString() ?? null,
    scheduledTime: job.scheduledTime,
    priceCents: job.priceCents,
    property: job.property ? mapProperty(job.property) : null,
    clientContact: job.clientContact ? mapContactSummary(job.clientContact) : null,
    agentContact: job.agentContact ? mapContactSummary(job.agentContact) : null,
    assignedInspector: job.assignedInspector ? mapUserSummary(job.assignedInspector) : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    deletedAt: job.deletedAt?.toISOString() ?? null,
    archivedAt: job.archivedAt?.toISOString() ?? null,
  };
}

function mapJobDetail(job: JobWithRelations, billing?: Awaited<ReturnType<typeof getJobBillingStatus>>): JobDetail {
  return {
    ...mapJobSummary(job),
    description: job.description,
    notes: job.notes,
    completedAt: job.completedAt?.toISOString() ?? null,
    cancelledAt: job.cancelledAt?.toISOString() ?? null,
    createdBy: mapUserSummary(job.createdBy),
    assignments: job.assignments.map((a) => ({
      id: a.id,
      inspectorId: a.inspectorId,
      inspector: mapUserSummary(a.inspector),
      status: a.status as JobDetail['assignments'][0]['status'],
      declineReason: a.declineReason,
      respondedAt: a.respondedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    ...(billing ? { billing } : {}),
  };
}

async function getJobOrThrow(id: string, companyId?: string): Promise<JobWithRelations> {
  const job = await prisma.job.findFirst({
    where: {
      id,
      ...(companyId ? { companyId } : {}),
    },
    include: jobInclude,
  });
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  return job;
}

function assertJobAccess(user: AuthUser, job: JobWithRelations): void {
  const hasViewAll = roleHasPermission(user.role, 'jobs:view_all');
  if (user.role === UserRole.INSPECTOR && !hasViewAll) {
    if (!canInspectorAccessJob(job, user.id, false)) {
      throw new ForbiddenError('You can only access assigned jobs');
    }
  }
}

export async function listJobs(
  user: AuthUser,
  query: {
    page?: string;
    pageSize?: string;
    status?: string;
    search?: string;
    view?: string;
    companyId?: string;
  },
): Promise<JobsListResponse> {
  const { page, pageSize, skip } = parsePagination(query);
  const companyId = resolveCompanyScope(user, query.companyId);
  const hasViewAll = roleHasPermission(user.role, 'jobs:view_all');

  const where: Prisma.JobWhereInput = {
    ...(companyId ? { companyId } : {}),
  };

  if (query.view === 'recycle') {
    where.deletedAt = { not: null };
  } else if (query.view === 'archived') {
    where.archivedAt = { not: null };
    where.deletedAt = null;
  } else {
    where.deletedAt = null;
    where.archivedAt = null;
  }

  if (query.status) {
    where.status = query.status as JobStatus;
  }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { jobNumber: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (user.role === UserRole.INSPECTOR && !hasViewAll) {
    where.assignedInspectorId = user.id;
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: jobInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.job.count({ where }),
  ]);

  return {
    jobs: jobs.map(mapJobSummary),
    total,
    page,
    pageSize,
  };
}

export async function getJob(user: AuthUser, id: string): Promise<JobDetail> {
  const companyId = resolveCompanyScope(user);
  const job = await getJobOrThrow(id, companyId);
  assertJobAccess(user, job);
  return buildJobDetailResponse(job);
}

export async function createJob(
  user: AuthUser,
  input: CreateJobRequest,
  request?: import('fastify').FastifyRequest,
): Promise<JobDetail> {
  const data = createJobSchema.parse(input);
  let companyId = resolveCompanyScope(user, data.companyId);
  if (!companyId) {
    companyId = requireCompanyForCreate(user);
  }

  if (data.clientContactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: data.clientContactId, companyId, deletedAt: null },
    });
    if (!contact) throw new NotFoundError('Client contact not found');
    if (!contact.email?.trim()) {
      throw new AppError(
        'Client must have an email address before a job can be created. Update the client in CRM first.',
        'VALIDATION_ERROR',
      );
    }
  }

  if (data.agentContactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: data.agentContactId, companyId, deletedAt: null },
    });
    if (!contact) throw new NotFoundError('Agent contact not found');
  }

  const jobNumber = await generateJobNumber(companyId);

  const job = await prisma.$transaction(async (tx) => {
    let propertyId: string | undefined;
    if (data.property) {
      const property = await tx.property.create({
        data: { companyId, ...data.property },
      });
      propertyId = property.id;
    }

    return tx.job.create({
      data: {
        companyId,
        jobNumber,
        title: data.title,
        description: data.description,
        type: data.type,
        status: JobStatus.DRAFT,
        propertyId,
        clientContactId: data.clientContactId,
        agentContactId: data.agentContactId,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        scheduledTime: data.scheduledTime,
        priceCents: data.priceCents,
        notes: data.notes,
        createdById: user.id,
      },
      include: jobInclude,
    });
  });

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'job.created',
    entityType: 'Job',
    entityId: job.id,
    metadata: { jobNumber: job.jobNumber },
    request,
  });

  return buildJobDetailResponse(job);
}

export async function sendJobAgreement(
  user: AuthUser,
  jobId: string,
  request?: import('fastify').FastifyRequest,
): Promise<SendJobAgreementResponse> {
  const companyId = resolveCompanyScope(user) ?? user.companyId;
  if (!companyId) throw new ForbiddenError('Company required');

  await getJobOrThrow(jobId, companyId);

  const existing = await prisma.agreement.findFirst({
    where: {
      jobId,
      companyId,
      status: { notIn: [AgreementStatus.CANCELLED, AgreementStatus.DECLINED] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  });

  if (existing?.status === AgreementStatus.SIGNED) {
    throw new AppError('Agreement is already signed for this job.', 'INVALID_STATE');
  }

  const agreementId = existing
    ? existing.id
    : (await createAgreementFromJob(user, jobId, request)).id;

  const result = await sendAgreement(user, agreementId, request);

  return {
    agreementId: result.agreement.id,
    agreementNumber: result.agreement.agreementNumber,
    emailSent: result.emailSent,
    ...(result.devSigningUrl ? { signingUrl: result.devSigningUrl } : {}),
  };
}

function requireCompanyForCreate(user: AuthUser): string {
  if (!user.companyId) throw new ForbiddenError('Company required to create jobs');
  return user.companyId;
}

export async function updateJob(
  user: AuthUser,
  id: string,
  input: UpdateJobRequest,
  request?: import('fastify').FastifyRequest,
): Promise<JobDetail> {
  const data = updateJobSchema.parse(input);
  const companyId = resolveCompanyScope(user);
  const existing = await getJobOrThrow(id, companyId);
  assertJobAccess(user, existing);

  if (existing.deletedAt) {
    throw new AppError('Cannot edit deleted job', 'INVALID_STATE');
  }

  let propertyId = existing.propertyId;
  if (data.property) {
    if (existing.propertyId) {
      await prisma.property.update({
        where: { id: existing.propertyId },
        data: data.property,
      });
    } else {
      const property = await prisma.property.create({
        data: { companyId: existing.companyId, ...data.property },
      });
      propertyId = property.id;
    }
  }

  const job = await prisma.job.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      type: data.type,
      propertyId,
      clientContactId: data.clientContactId,
      agentContactId: data.agentContactId,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
      scheduledTime: data.scheduledTime,
      priceCents: data.priceCents,
      notes: data.notes,
    },
    include: jobInclude,
  });

  await createAuditLog({
    companyId: job.companyId,
    actorId: user.id,
    action: 'job.updated',
    entityType: 'Job',
    entityId: job.id,
    request,
  });

  return buildJobDetailResponse(job);
}

export async function assignJob(
  user: AuthUser,
  id: string,
  input: AssignJobRequest,
  request?: import('fastify').FastifyRequest,
): Promise<JobDetail> {
  const { inspectorId } = assignJobSchema.parse(input);
  const companyId = resolveCompanyScope(user);
  const job = await getJobOrThrow(id, companyId);

  if (job.status === JobStatus.PENDING_ASSIGNMENT || job.status === JobStatus.DRAFT) {
    await assertJobReadyForInspection(job.id, job.companyId);
  }

  const inspector = await prisma.user.findFirst({
    where: {
      id: inspectorId,
      companyId: job.companyId,
      role: UserRole.INSPECTOR,
      status: 'ACTIVE',
    },
  });
  if (!inspector) throw new NotFoundError('Inspector not found');

  const updated = await prisma.$transaction(async (tx) => {
    await tx.jobAssignment.create({
      data: {
        jobId: job.id,
        inspectorId,
        assignedById: user.id,
        status: AssignmentStatus.PENDING,
      },
    });

    return tx.job.update({
      where: { id },
      data: {
        assignedInspectorId: inspectorId,
        status: JobStatus.ASSIGNED,
      },
      include: jobInclude,
    });
  });

  await createAuditLog({
    companyId: job.companyId,
    actorId: user.id,
    action: 'job.assigned',
    entityType: 'Job',
    entityId: job.id,
    metadata: { inspectorId },
    request,
  });

  const settings = await prisma.companySettings.findUnique({ where: { companyId: job.companyId } });
  await createNotification({
    companyId: job.companyId,
    userId: inspectorId,
    type: NotificationType.JOB_ASSIGNED,
    title: `Job assigned — ${updated.jobNumber}`,
    body: `${updated.title} has been assigned to you.`,
    entityType: 'Job',
    entityId: updated.id,
  });

  if (settings?.notifyJobAssigned !== false) {
    try {
      const emailContext = await loadCompanyEmailContext(job.companyId);
      await sendCompanyEmail({
        context: emailContext,
        toEmail: inspector.email,
        templateKey: 'jobAssigned',
        variables: {
          inspectorName: `${inspector.firstName} ${inspector.lastName}`.trim(),
          jobNumber: updated.jobNumber,
          jobTitle: updated.title,
          propertyAddress: updated.property ? formatPropertyAddress(updated.property) : '',
          scheduledDate: updated.scheduledDate
            ? `${updated.scheduledDate.toLocaleDateString('en-AU')}${updated.scheduledTime ? ` at ${updated.scheduledTime}` : ''}`
            : 'To be confirmed',
          companyName: emailContext.fromName,
          companyPhone: '',
        },
      });
    } catch {
      // Email delivery failure should not block assignment.
    }
  }

  return buildJobDetailResponse(updated);
}

export async function acceptJob(
  user: AuthUser,
  id: string,
  request?: import('fastify').FastifyRequest,
): Promise<JobDetail> {
  const companyId = resolveCompanyScope(user);
  const job = await getJobOrThrow(id, companyId);

  if (job.assignedInspectorId !== user.id) {
    throw new ForbiddenError('Only the assigned inspector can accept this job');
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.jobAssignment.updateMany({
      where: {
        jobId: job.id,
        inspectorId: user.id,
        status: AssignmentStatus.PENDING,
      },
      data: {
        status: AssignmentStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    return tx.job.update({
      where: { id },
      data: { status: JobStatus.ACCEPTED },
      include: jobInclude,
    });
  });

  await createAuditLog({
    companyId: job.companyId,
    actorId: user.id,
    action: 'job.accepted',
    entityType: 'Job',
    entityId: job.id,
    request,
  });

  return buildJobDetailResponse(updated);
}

export async function declineJob(
  user: AuthUser,
  id: string,
  input: DeclineJobRequest,
  request?: import('fastify').FastifyRequest,
): Promise<JobDetail> {
  const { reason } = declineJobSchema.parse(input);
  const companyId = resolveCompanyScope(user);
  const job = await getJobOrThrow(id, companyId);

  if (job.assignedInspectorId !== user.id) {
    throw new ForbiddenError('Only the assigned inspector can decline this job');
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.jobAssignment.updateMany({
      where: {
        jobId: job.id,
        inspectorId: user.id,
        status: AssignmentStatus.PENDING,
      },
      data: {
        status: AssignmentStatus.DECLINED,
        declineReason: reason,
        respondedAt: new Date(),
      },
    });

    return tx.job.update({
      where: { id },
      data: {
        assignedInspectorId: null,
        status: JobStatus.PENDING_ASSIGNMENT,
      },
      include: jobInclude,
    });
  });

  await createAuditLog({
    companyId: job.companyId,
    actorId: user.id,
    action: 'job.declined',
    entityType: 'Job',
    entityId: job.id,
    metadata: { reason },
    request,
  });

  return buildJobDetailResponse(updated);
}

async function transitionJob(
  user: AuthUser,
  id: string,
  status: JobStatus,
  extra: Prisma.JobUpdateInput,
  auditAction: string,
  request?: import('fastify').FastifyRequest,
): Promise<JobDetail> {
  const companyId = resolveCompanyScope(user);
  const job = await getJobOrThrow(id, companyId);
  assertJobAccess(user, job);

  const updated = await prisma.job.update({
    where: { id },
    data: { status, ...extra },
    include: jobInclude,
  });

  await createAuditLog({
    companyId: job.companyId,
    actorId: user.id,
    action: auditAction,
    entityType: 'Job',
    entityId: job.id,
    request,
  });

  return buildJobDetailResponse(updated);
}

export async function startJob(user: AuthUser, id: string, request?: import('fastify').FastifyRequest) {
  return transitionJob(user, id, JobStatus.IN_PROGRESS, {}, 'job.started', request);
}

export async function completeJob(user: AuthUser, id: string, request?: import('fastify').FastifyRequest) {
  return transitionJob(
    user,
    id,
    JobStatus.COMPLETED,
    { completedAt: new Date() },
    'job.completed',
    request,
  );
}

export async function cancelJob(user: AuthUser, id: string, request?: import('fastify').FastifyRequest) {
  return transitionJob(
    user,
    id,
    JobStatus.CANCELLED,
    { cancelledAt: new Date() },
    'job.cancelled',
    request,
  );
}

export async function archiveJob(user: AuthUser, id: string, request?: import('fastify').FastifyRequest) {
  const companyId = resolveCompanyScope(user);
  const job = await getJobOrThrow(id, companyId);

  const openInspection = await prisma.inspection.findFirst({
    where: {
      jobId: id,
      companyId,
      status: { in: [InspectionStatus.DRAFT, InspectionStatus.IN_PROGRESS] },
    },
  });
  if (openInspection) {
    throw new AppError(
      'Cannot archive a job with an open inspection. Complete the inspection first or continue it from the Inspections list.',
      'INVALID_STATE',
    );
  }

  return transitionJob(
    user,
    id,
    JobStatus.ARCHIVED,
    { archivedAt: new Date() },
    'job.archived',
    request,
  );
}

export async function unarchiveJob(user: AuthUser, id: string, request?: import('fastify').FastifyRequest) {
  const companyId = resolveCompanyScope(user);
  const job = await getJobOrThrow(id, companyId);

  if (!job.archivedAt) {
    throw new AppError('Job is not archived', 'INVALID_STATE');
  }

  const restoredStatus =
    job.status === JobStatus.ARCHIVED
      ? job.completedAt
        ? JobStatus.COMPLETED
        : job.assignedInspectorId
          ? JobStatus.ACCEPTED
          : JobStatus.PENDING_ASSIGNMENT
      : job.status;

  const updated = await prisma.job.update({
    where: { id },
    data: {
      archivedAt: null,
      status: restoredStatus,
    },
    include: jobInclude,
  });

  await createAuditLog({
    companyId: job.companyId,
    actorId: user.id,
    action: 'job.unarchived',
    entityType: 'Job',
    entityId: job.id,
    request,
  });

  return buildJobDetailResponse(updated);
}

export async function softDeleteJob(user: AuthUser, id: string, request?: import('fastify').FastifyRequest) {
  const companyId = resolveCompanyScope(user);
  const job = await getJobOrThrow(id, companyId);

  const updated = await prisma.job.update({
    where: { id },
    data: { deletedAt: new Date() },
    include: jobInclude,
  });

  await createAuditLog({
    companyId: job.companyId,
    actorId: user.id,
    action: 'job.deleted',
    entityType: 'Job',
    entityId: job.id,
    request,
  });

  return buildJobDetailResponse(updated);
}

export async function restoreJob(user: AuthUser, id: string, request?: import('fastify').FastifyRequest) {
  const companyId = resolveCompanyScope(user);
  const job = await getJobOrThrow(id, companyId);

  const updated = await prisma.job.update({
    where: { id },
    data: { deletedAt: null },
    include: jobInclude,
  });

  await createAuditLog({
    companyId: job.companyId,
    actorId: user.id,
    action: 'job.restored',
    entityType: 'Job',
    entityId: job.id,
    request,
  });

  return buildJobDetailResponse(updated);
}

export async function permanentDeleteJob(
  user: AuthUser,
  id: string,
  request?: import('fastify').FastifyRequest,
): Promise<{ success: true }> {
  const companyId = resolveCompanyScope(user);
  const job = await getJobOrThrow(id, companyId);

  if (!job.deletedAt) {
    throw new AppError('Job must be in recycle bin before permanent deletion', 'INVALID_STATE');
  }

  await prisma.job.delete({ where: { id } });

  await createAuditLog({
    companyId: job.companyId,
    actorId: user.id,
    action: 'job.permanently_deleted',
    entityType: 'Job',
    entityId: job.id,
    request,
  });

  return { success: true };
}

export async function listInspectors(user: AuthUser, companyIdParam?: string) {
  const companyId = resolveCompanyScope(user, companyIdParam) ?? user.companyId;
  if (!companyId) return [];

  const inspectors = await prisma.user.findMany({
    where: {
      companyId,
      role: UserRole.INSPECTOR,
      status: 'ACTIVE',
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  return inspectors.map(mapUserSummary);
}
