import {
  InspectionRoomType,
  InspectionStatus,
  JobStatus,
  type Prisma,
} from '@prisma/client';
import type { AuthUser } from '@sitescop/shared-types';
import { UserRole, roleHasPermission } from '@sitescop/shared-types';
import type {
  InspectionDetail,
  InspectionRoomDetail,
  InspectionsListResponse,
  InspectionSummary,
  SyncInspectionRoomsRequest,
  UpdateInspectionRequest,
  UpdateInspectionRoomRequest,
  UpdateInspectionSectionRequest,
} from '@sitescop/shared-types';
import {
  BUILDING_EXTENSION_SECTION_KEYS,
  PEST_INSPECTION_SECTION_KEYS,
  SHARED_INSPECTION_SECTION_KEYS,
  buildRoomsFromCounts,
  calculateInspectionProgress,
  createEmptyInspectionFormData,
  enrichInspectionFormData,
  jobTypeToFormKind,
  normalizeInspectionFormData,
  patchSectionData,
  type InspectionFormDataV2,
  type InspectionFormRealm,
  type PrefillJobContext,
  type RoomEngineType,
} from '@sitescop/room-engine-core';
import { z } from 'zod';
import { createAuditLog } from '../../shared/audit/audit.service.js';
import { prisma } from '../../shared/database/prisma.js';
import { AppError, ForbiddenError, NotFoundError } from '../../shared/http/errors.js';
import { parsePagination } from '../../shared/http/validation.js';
import { canInspectorAccessJob, mapContactSummary, mapProperty, mapUserSummary } from '../../shared/mappers/index.js';
import { resolveCompanyScope } from '../../shared/scoping/company-scope.js';

const inspectionInclude = {
  job: {
    include: {
      property: true,
      clientContact: true,
      agentContact: true,
      assignedInspector: true,
    },
  },
  inspector: true,
  createdBy: true,
  rooms: { orderBy: [{ roomType: 'asc' as const }, { roomIndex: 'asc' as const }] },
} satisfies Prisma.InspectionInclude;

type InspectionWithRelations = Prisma.InspectionGetPayload<{ include: typeof inspectionInclude }>;

function scopedCompanyId(user: AuthUser): string {
  const companyId = resolveCompanyScope(user) ?? user.companyId;
  if (!companyId) throw new ForbiddenError('Company context required');
  return companyId;
}

const realmSchema = z.enum(['shared', 'building', 'pest']);

function parseSectionUpdate(input: { realm: InspectionFormRealm; section: string; data: Record<string, unknown> }) {
  const allowed =
    input.realm === 'shared'
      ? SHARED_INSPECTION_SECTION_KEYS
      : input.realm === 'building'
        ? BUILDING_EXTENSION_SECTION_KEYS
        : PEST_INSPECTION_SECTION_KEYS;
  if (!(allowed as readonly string[]).includes(input.section)) {
    throw new AppError(`Invalid section "${input.section}" for realm "${input.realm}"`, 'VALIDATION_ERROR');
  }
  return input;
}

export const updateInspectionSchema = z.object({
  formData: z.record(z.unknown()).optional(),
  status: z.nativeEnum(InspectionStatus).optional(),
});

export const updateSectionSchema = z
  .object({
    realm: realmSchema,
    section: z.string(),
    data: z.record(z.unknown()),
  })
  .transform(parseSectionUpdate);

export const updateRoomSchema = z.object({
  data: z.record(z.unknown()),
  label: z.string().max(100).optional(),
});

export const syncRoomsSchema = z.object({
  bedroomCount: z.number().int().min(0).max(20),
  bathroomCount: z.number().int().min(0).max(20),
  livingAreaCount: z.number().int().min(0).max(20),
  garageCount: z.number().int().min(0).max(10),
});

async function generateInspectionNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INSP-${year}-`;
  const latest = await prisma.inspection.findFirst({
    where: { companyId, inspectionNumber: { startsWith: prefix } },
    orderBy: { inspectionNumber: 'desc' },
    select: { inspectionNumber: true },
  });
  const next = latest ? parseInt(latest.inspectionNumber.split('-').pop() ?? '0', 10) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

function mapRoomTypeToEngine(type: InspectionRoomType): RoomEngineType {
  const map: Record<InspectionRoomType, RoomEngineType> = {
    [InspectionRoomType.BEDROOM]: 'bedroom',
    [InspectionRoomType.BATHROOM]: 'bathroom',
    [InspectionRoomType.LIVING]: 'living',
    [InspectionRoomType.GARAGE]: 'garage',
  };
  return map[type];
}

function mapEngineToRoomType(type: RoomEngineType): InspectionRoomType {
  const map: Record<RoomEngineType, InspectionRoomType> = {
    bedroom: InspectionRoomType.BEDROOM,
    bathroom: InspectionRoomType.BATHROOM,
    living: InspectionRoomType.LIVING,
    garage: InspectionRoomType.GARAGE,
  };
  return map[type];
}

function formatPropertyAddress(job: InspectionWithRelations['job']): string | null {
  if (job.property) {
    const p = mapProperty(job.property);
    return [p.addressLine1, p.suburb, p.state, p.postcode].filter(Boolean).join(', ');
  }
  return null;
}

function mapSummary(row: InspectionWithRelations): InspectionSummary {
  return {
    id: row.id,
    inspectionNumber: row.inspectionNumber,
    status: row.status as InspectionSummary['status'],
    jobId: row.jobId,
    jobNumber: row.job.jobNumber,
    jobTitle: row.job.title,
    jobType: row.job.type as InspectionSummary['jobType'],
    propertyAddress: formatPropertyAddress(row.job),
    clientName: row.job.clientContact
      ? `${row.job.clientContact.firstName} ${row.job.clientContact.lastName}`.trim()
      : null,
    inspectorName: row.inspector ? mapUserSummary(row.inspector).displayName : null,
    progressPercent: row.progressPercent,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapRoom(row: InspectionWithRelations['rooms'][number]): InspectionRoomDetail {
  return {
    id: row.id,
    roomType: row.roomType as InspectionRoomDetail['roomType'],
    roomIndex: row.roomIndex,
    label: row.label,
    data: row.data as Record<string, unknown>,
  };
}

function mapDetail(row: InspectionWithRelations): InspectionDetail {
  const formKind = jobTypeToFormKind(row.job.type);
  const formData = enrichInspectionFormData(normalizeInspectionFormData(row.formData, formKind));
  return {
    ...mapSummary(row),
    formData,
    rooms: row.rooms.map(mapRoom),
    createdByName: mapUserSummary(row.createdBy).displayName,
  };
}

async function getInspectionOrThrow(id: string, companyId?: string): Promise<InspectionWithRelations> {
  const row = await prisma.inspection.findFirst({
    where: { id, ...(companyId ? { companyId } : {}) },
    include: inspectionInclude,
  });
  if (!row) throw new NotFoundError('Inspection not found');
  return row;
}

function assertInspectionAccess(user: AuthUser, row: InspectionWithRelations): void {
  if (user.role === UserRole.INSPECTOR) {
    const hasViewAll = roleHasPermission(user.role, 'jobs:view_all');
    if (!row.inspectorId || row.inspectorId !== user.id) {
      if (!canInspectorAccessJob(row.job, user.id, hasViewAll)) {
        throw new ForbiddenError('You do not have access to this inspection');
      }
    }
  }
}

function buildPrefill(job: InspectionWithRelations['job'], inspector?: { firstName: string; lastName: string } | null): PrefillJobContext {
  const propertyAddress = job.property
    ? [job.property.addressLine1, job.property.suburb, job.property.state, job.property.postcode].join(', ')
    : '';
  const client = job.clientContact;
  const agent = job.agentContact;
  return {
    jobNumber: job.jobNumber,
    clientName: client ? `${client.firstName} ${client.lastName}`.trim() : '',
    clientEmail: client?.email ?? '',
    clientPhone: client?.phone ?? '',
    agentName: agent ? `${agent.firstName} ${agent.lastName}`.trim() : '',
    agentPhone: agent?.phone ?? '',
    agentEmail: agent?.email ?? '',
    propertyAddress,
    scheduledDate: job.scheduledDate?.toISOString() ?? null,
    scheduledTime: job.scheduledTime,
    inspectorName: inspector ? `${inspector.firstName} ${inspector.lastName}`.trim() : '',
    inspectorLicence: '',
  };
}

function loadFormData(row: InspectionWithRelations): InspectionFormDataV2 {
  return normalizeInspectionFormData(row.formData, jobTypeToFormKind(row.job.type));
}

async function persistRooms(
  inspectionId: string,
  counts: SyncInspectionRoomsRequest,
  existingRooms: InspectionWithRelations['rooms'],
): Promise<void> {
  const generated = buildRoomsFromCounts({
    bedrooms: counts.bedroomCount,
    bathrooms: counts.bathroomCount,
    livingAreas: counts.livingAreaCount,
    garages: counts.garageCount,
  });

  const existingMap = new Map(
    existingRooms.map((room) => [`${room.roomType}:${room.roomIndex}`, room]),
  );

  const keepKeys = new Set<string>();

  for (const room of generated) {
    const roomType = mapEngineToRoomType(room.roomType);
    const key = `${roomType}:${room.roomIndex}`;
    keepKeys.add(key);
    const existing = existingMap.get(key);
    if (existing) {
      await prisma.inspectionRoom.update({
        where: { id: existing.id },
        data: { label: room.label },
      });
    } else {
      await prisma.inspectionRoom.create({
        data: {
          inspectionId,
          roomType,
          roomIndex: room.roomIndex,
          label: room.label,
          data: room.data as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  for (const room of existingRooms) {
    const key = `${room.roomType}:${room.roomIndex}`;
    if (!keepKeys.has(key)) {
      await prisma.inspectionRoom.delete({ where: { id: room.id } });
    }
  }
}

export async function listInspections(
  user: AuthUser,
  query: Record<string, string | undefined>,
): Promise<InspectionsListResponse> {
  const companyId = resolveCompanyScope(user);
  const { page, pageSize, skip } = parsePagination(query);
  const status = query.status as InspectionStatus | undefined;
  const search = query.search?.trim();

  const where: Prisma.InspectionWhereInput = { companyId };

  if (status) where.status = status;

  if (user.role === UserRole.INSPECTOR) {
    where.OR = [{ inspectorId: user.id }, { job: { assignedInspectorId: user.id } }];
  }

  if (search) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { inspectionNumber: { contains: search, mode: 'insensitive' } },
          { job: { jobNumber: { contains: search, mode: 'insensitive' } } },
          { job: { title: { contains: search, mode: 'insensitive' } } },
        ],
      },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      include: inspectionInclude,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.inspection.count({ where }),
  ]);

  return {
    inspections: rows.map(mapSummary),
    total,
    page,
    pageSize,
  };
}

export async function getInspection(user: AuthUser, id: string): Promise<InspectionDetail> {
  const companyId = resolveCompanyScope(user);
  const row = await getInspectionOrThrow(id, companyId);
  assertInspectionAccess(user, row);
  return mapDetail(row);
}

export async function getInspectionByJob(user: AuthUser, jobId: string): Promise<InspectionDetail | null> {
  const companyId = resolveCompanyScope(user);
  const row = await prisma.inspection.findFirst({
    where: { companyId, jobId },
    include: inspectionInclude,
    orderBy: { createdAt: 'desc' },
  });
  if (!row) return null;
  assertInspectionAccess(user, row);
  return mapDetail(row);
}

export async function createInspectionFromJob(
  user: AuthUser,
  jobId: string,
  request?: import('fastify').FastifyRequest,
): Promise<InspectionDetail> {
  const companyId = scopedCompanyId(user);

  if (!roleHasPermission(user.role, 'inspections:edit')) {
    throw new ForbiddenError('You cannot create inspections');
  }

  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId, deletedAt: null },
    include: {
      property: true,
      clientContact: true,
      agentContact: true,
      assignedInspector: true,
    },
  });

  if (!job) throw new NotFoundError('Job not found');

  if (job.archivedAt) {
    throw new AppError('Cannot start an inspection on an archived job. Unarchive the job first.', 'INVALID_STATE');
  }

  if (user.role === UserRole.INSPECTOR && !canInspectorAccessJob(job, user.id, false)) {
    throw new ForbiddenError('You are not assigned to this job');
  }

  const allowedStatuses: JobStatus[] = [JobStatus.ACCEPTED, JobStatus.IN_PROGRESS];
  if (!allowedStatuses.includes(job.status)) {
    throw new AppError('Job must be accepted or in progress to start an inspection', 'INVALID_STATE');
  }

  const existing = await prisma.inspection.findFirst({
    where: {
      jobId,
      companyId,
      status: { in: [InspectionStatus.DRAFT, InspectionStatus.IN_PROGRESS] },
    },
  });
  if (existing) {
    const row = await getInspectionOrThrow(existing.id, companyId);
    return mapDetail(row);
  }

  const prefill = buildPrefill(job, job.assignedInspector ?? user);
  const formKind = jobTypeToFormKind(job.type);
  const formData = enrichInspectionFormData(createEmptyInspectionFormData(formKind, prefill));
  const inspectionNumber = await generateInspectionNumber(companyId);
  const needsRooms = formKind === 'BUILDING' || formKind === 'COMBINED';
  const counts = formData.shared.propertyDescription;

  const row = await prisma.$transaction(async (tx) => {
    if (job.status === JobStatus.ACCEPTED) {
      await tx.job.update({
        where: { id: jobId },
        data: { status: JobStatus.IN_PROGRESS },
      });
    }

    return tx.inspection.create({
      data: {
        companyId,
        inspectionNumber,
        jobId,
        status: InspectionStatus.IN_PROGRESS,
        inspectorId: job.assignedInspectorId ?? (user.role === UserRole.INSPECTOR ? user.id : null),
        formData: formData as unknown as Prisma.InputJsonValue,
        progressPercent: calculateInspectionProgress(formData),
        startedAt: new Date(),
        createdById: user.id,
        ...(needsRooms
          ? {
              rooms: {
                create: buildRoomsFromCounts({
                  bedrooms: counts.bedroomCount,
                  bathrooms: counts.bathroomCount,
                  livingAreas: counts.livingAreaCount,
                  garages: counts.garageCount,
                }).map((room) => ({
                  roomType: mapEngineToRoomType(room.roomType),
                  roomIndex: room.roomIndex,
                  label: room.label,
                  data: room.data as unknown as Prisma.InputJsonValue,
                })),
              },
            }
          : {}),
      },
      include: inspectionInclude,
    });
  });

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'inspection.created',
    entityType: 'Inspection',
    entityId: row.id,
    metadata: { jobId, inspectionNumber },
    request,
  });

  return mapDetail(row);
}

export async function updateInspection(
  user: AuthUser,
  id: string,
  input: UpdateInspectionRequest,
  request?: import('fastify').FastifyRequest,
): Promise<InspectionDetail> {
  const parsed = updateInspectionSchema.parse(input);
  const companyId = scopedCompanyId(user);
  const existing = await getInspectionOrThrow(id, companyId);
  assertInspectionAccess(user, existing);

  if (!roleHasPermission(user.role, 'inspections:edit')) {
    throw new ForbiddenError('You cannot edit inspections');
  }

  let formData = loadFormData(existing);
  if (parsed.formData) {
    formData = enrichInspectionFormData({
      ...formData,
      ...(parsed.formData as Partial<InspectionFormDataV2>),
    });
  }

  const row = await prisma.inspection.update({
    where: { id },
    data: {
      formData: formData as unknown as Prisma.InputJsonValue,
      progressPercent: calculateInspectionProgress(formData),
      status: parsed.status ?? existing.status,
    },
    include: inspectionInclude,
  });

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'inspection.updated',
    entityType: 'Inspection',
    entityId: id,
    request,
  });

  return mapDetail(row);
}

export async function updateInspectionSection(
  user: AuthUser,
  id: string,
  input: UpdateInspectionSectionRequest,
  request?: import('fastify').FastifyRequest,
): Promise<InspectionDetail> {
  const { realm, section, data } = updateSectionSchema.parse(input);
  const companyId = scopedCompanyId(user);
  const existing = await getInspectionOrThrow(id, companyId);
  assertInspectionAccess(user, existing);

  if (!roleHasPermission(user.role, 'inspections:edit')) {
    throw new ForbiddenError('You cannot edit inspections');
  }

  let formData = patchSectionData(loadFormData(existing), realm, section, data);
  const enriched = enrichInspectionFormData(formData);

  const row = await prisma.inspection.update({
    where: { id },
    data: {
      formData: enriched as unknown as Prisma.InputJsonValue,
      progressPercent: calculateInspectionProgress(enriched),
    },
    include: inspectionInclude,
  });

  if (realm === 'shared' && section === 'propertyDescription') {
    const counts = {
      bedroomCount: enriched.shared.propertyDescription.bedroomCount,
      bathroomCount: enriched.shared.propertyDescription.bathroomCount,
      livingAreaCount: enriched.shared.propertyDescription.livingAreaCount,
      garageCount: enriched.shared.propertyDescription.garageCount,
    };
    await persistRooms(id, counts, existing.rooms);
    const refreshed = await getInspectionOrThrow(id, companyId);
    return mapDetail(refreshed);
  }

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'inspection.section_updated',
    entityType: 'Inspection',
    entityId: id,
    metadata: { realm, section },
    request,
  });

  return mapDetail(row);
}

export async function syncInspectionRooms(
  user: AuthUser,
  id: string,
  input: SyncInspectionRoomsRequest,
  request?: import('fastify').FastifyRequest,
): Promise<InspectionDetail> {
  const counts = syncRoomsSchema.parse(input);
  const companyId = scopedCompanyId(user);
  const existing = await getInspectionOrThrow(id, companyId);
  assertInspectionAccess(user, existing);

  if (!roleHasPermission(user.role, 'inspections:edit')) {
    throw new ForbiddenError('You cannot edit inspections');
  }

  let formData = loadFormData(existing);
  formData = {
    ...formData,
    shared: {
      ...formData.shared,
      propertyDescription: {
        ...formData.shared.propertyDescription,
        bedroomCount: counts.bedroomCount,
        bathroomCount: counts.bathroomCount,
        livingAreaCount: counts.livingAreaCount,
        garageCount: counts.garageCount,
      },
    },
  };

  await persistRooms(id, counts, existing.rooms);

  const enriched = enrichInspectionFormData(formData);
  const row = await prisma.inspection.update({
    where: { id },
    data: {
      formData: enriched as unknown as Prisma.InputJsonValue,
      progressPercent: calculateInspectionProgress(enriched),
    },
    include: inspectionInclude,
  });

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'inspection.rooms_synced',
    entityType: 'Inspection',
    entityId: id,
    metadata: counts,
    request,
  });

  return mapDetail(row);
}

export async function updateInspectionRoom(
  user: AuthUser,
  inspectionId: string,
  roomId: string,
  input: UpdateInspectionRoomRequest,
  request?: import('fastify').FastifyRequest,
): Promise<InspectionDetail> {
  const parsed = updateRoomSchema.parse(input);
  const companyId = resolveCompanyScope(user);
  const existing = await getInspectionOrThrow(inspectionId, companyId);
  assertInspectionAccess(user, existing);

  if (!roleHasPermission(user.role, 'inspections:edit')) {
    throw new ForbiddenError('You cannot edit inspections');
  }

  const room = existing.rooms.find((r) => r.id === roomId);
  if (!room) throw new NotFoundError('Room not found');

  await prisma.inspectionRoom.update({
    where: { id: roomId },
    data: {
      data: parsed.data as Prisma.InputJsonValue,
      label: parsed.label,
    },
  });

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'inspection.room_updated',
    entityType: 'InspectionRoom',
    entityId: roomId,
    metadata: { inspectionId, roomType: room.roomType },
    request,
  });

  const refreshed = await getInspectionOrThrow(inspectionId, companyId);
  return mapDetail(refreshed);
}

export async function completeInspection(
  user: AuthUser,
  id: string,
  request?: import('fastify').FastifyRequest,
): Promise<InspectionDetail> {
  const companyId = scopedCompanyId(user);
  const existing = await getInspectionOrThrow(id, companyId);
  assertInspectionAccess(user, existing);

  if (!roleHasPermission(user.role, 'inspections:edit')) {
    throw new ForbiddenError('You cannot complete inspections');
  }

  if (existing.status === InspectionStatus.COMPLETED) {
    throw new AppError('Inspection is already completed', 'INVALID_STATE');
  }

  let formData = enrichInspectionFormData(loadFormData(existing));
  if (formData.building) {
    formData = {
      ...formData,
      building: {
        ...formData.building,
        inspectorDeclaration: {
          ...formData.building.inspectorDeclaration,
          reportComplete: true,
        },
      },
    };
  }
  if (formData.pest) {
    formData = {
      ...formData,
      pest: {
        ...formData.pest,
        pestConclusion: {
          ...formData.pest.pestConclusion,
          reportComplete: true,
        },
      },
    };
  }

  const row = await prisma.$transaction(async (tx) => {
    await tx.job.update({
      where: { id: existing.jobId },
      data: { status: JobStatus.COMPLETED, completedAt: new Date() },
    });

    return tx.inspection.update({
      where: { id },
      data: {
        status: InspectionStatus.COMPLETED,
        completedAt: new Date(),
        formData: formData as unknown as Prisma.InputJsonValue,
        progressPercent: 100,
      },
      include: inspectionInclude,
    });
  });

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'inspection.completed',
    entityType: 'Inspection',
    entityId: id,
    request,
  });

  return mapDetail(row);
}

export async function reopenInspection(
  user: AuthUser,
  id: string,
  request?: import('fastify').FastifyRequest,
): Promise<InspectionDetail> {
  const companyId = scopedCompanyId(user);
  const existing = await getInspectionOrThrow(id, companyId);
  assertInspectionAccess(user, existing);

  if (!roleHasPermission(user.role, 'inspections:edit')) {
    throw new ForbiddenError('You cannot reopen inspections');
  }

  if (existing.status !== InspectionStatus.COMPLETED) {
    throw new AppError('Only completed inspections can be reopened', 'INVALID_STATE');
  }

  const job = await prisma.job.findFirst({
    where: { id: existing.jobId, companyId },
  });
  if (!job) throw new NotFoundError('Job not found');
  if (job.archivedAt) {
    throw new AppError('Unarchive the job before reopening the inspection for editing', 'INVALID_STATE');
  }

  let formData = loadFormData(existing);
  if (formData.building) {
    formData = {
      ...formData,
      building: {
        ...formData.building,
        inspectorDeclaration: {
          ...formData.building.inspectorDeclaration,
          reportComplete: false,
        },
      },
    };
  }
  if (formData.pest) {
    formData = {
      ...formData,
      pest: {
        ...formData.pest,
        pestConclusion: {
          ...formData.pest.pestConclusion,
          reportComplete: false,
        },
      },
    };
  }
  const enriched = enrichInspectionFormData(formData);

  const row = await prisma.$transaction(async (tx) => {
    await tx.job.update({
      where: { id: existing.jobId },
      data: { status: JobStatus.IN_PROGRESS, completedAt: null },
    });

    return tx.inspection.update({
      where: { id },
      data: {
        status: InspectionStatus.IN_PROGRESS,
        completedAt: null,
        formData: enriched as unknown as Prisma.InputJsonValue,
        progressPercent: calculateInspectionProgress(enriched),
      },
      include: inspectionInclude,
    });
  });

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'inspection.reopened',
    entityType: 'Inspection',
    entityId: id,
    request,
  });

  return mapDetail(row);
}
