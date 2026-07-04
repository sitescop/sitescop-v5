import { InspectionStatus, JobType, ReportStatus, ReportType, type Prisma } from '@prisma/client';
import type { AuthUser } from '@sitescop/shared-types';
import { UserRole, roleHasPermission } from '@sitescop/shared-types';
import type {
  GenerateReportsResponse,
  ReportSummary,
  ReportsListResponse,
} from '@sitescop/shared-types';
import {
  generateBuildingReportPdf,
  generatePestReportPdf,
  type ReportRenderContext,
} from '@sitescop/report-pdf';
import {
  enrichInspectionFormData,
  enrichPestConclusion,
  jobTypeToFormKind,
  mergeRoomDataForReport,
  normalizeInspectionFormData,
} from '@sitescop/room-engine-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuditLog } from '../../shared/audit/audit.service.js';
import { prisma } from '../../shared/database/prisma.js';
import { AppError, ForbiddenError, NotFoundError } from '../../shared/http/errors.js';
import { parsePagination } from '../../shared/http/validation.js';
import { canInspectorAccessJob, formatPropertyAddress } from '../../shared/mappers/index.js';
import { resolveCompanyScope } from '../../shared/scoping/company-scope.js';
import { resolveCompanyLogoForPdf } from '../../shared/branding/resolve-company-logo.js';
import {
  isLegacyDemoCompanyProfile,
  resolveCompanyProfileForReport,
} from '../../shared/branding/resolve-company-profile.js';
import { syncLegacyDemoBrandingIfNeeded } from '../../shared/branding/sync-legacy-demo-branding.js';
import { isEmailConfigured, loadCompanyEmailContext, trySendCompanyEmail } from '../../shared/email/email.service.js';
import { notifyClientSms } from '../../shared/sms/notify-client.js';
import { readFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_STORAGE_ROOT = join(__dirname, '../../../storage/reports');

const reportInclude = {
  inspection: {
    include: {
      job: {
        include: {
          property: true,
          clientContact: true,
        },
      },
    },
  },
  generatedBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.InspectionReportInclude;

type ReportRow = Prisma.InspectionReportGetPayload<{ include: typeof reportInclude }>;

const inspectionInclude = {
  job: {
    include: {
      property: true,
      clientContact: true,
      assignedInspector: true,
    },
  },
  inspector: true,
  company: { include: { settings: true } },
  rooms: { orderBy: [{ roomType: 'asc' as const }, { roomIndex: 'asc' as const }] },
} satisfies Prisma.InspectionInclude;

type InspectionRow = Prisma.InspectionGetPayload<{ include: typeof inspectionInclude }>;

function scopedCompanyId(user: AuthUser): string {
  const companyId = resolveCompanyScope(user) ?? user.companyId;
  if (!companyId) throw new ForbiddenError('Company context required');
  return companyId;
}

function mapReport(row: ReportRow): ReportSummary {
  const job = row.inspection.job;
  return {
    id: row.id,
    reportType: row.reportType as ReportSummary['reportType'],
    status: row.status as ReportSummary['status'],
    fileName: row.fileName,
    fileSizeBytes: row.fileSizeBytes,
    errorMessage: row.errorMessage,
    inspectionId: row.inspectionId,
    inspectionNumber: row.inspection.inspectionNumber,
    jobId: job.id,
    jobNumber: job.jobNumber,
    jobType: job.type,
    propertyAddress: job.property ? formatPropertyAddress(job.property) : null,
    clientName: job.clientContact
      ? `${job.clientContact.firstName} ${job.clientContact.lastName}`.trim()
      : null,
    generatedByName: `${row.generatedBy.firstName} ${row.generatedBy.lastName}`.trim(),
    generatedAt: row.generatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function reportTypesForJob(jobType: JobType): ReportType[] {
  switch (jobType) {
    case JobType.BUILDING:
    case JobType.PRE_PURCHASE:
    case JobType.PRE_SALE:
      return [ReportType.BUILDING];
    case JobType.PEST:
      return [ReportType.PEST];
    case JobType.COMBINED:
      return [ReportType.BUILDING, ReportType.PEST];
    default:
      return [ReportType.BUILDING];
  }
}

function reportFileName(inspectionNumber: string, reportType: ReportType): string {
  const suffix = reportType === ReportType.BUILDING ? 'Building' : 'Pest';
  return `${inspectionNumber}-${suffix}.pdf`;
}

async function buildRenderContext(inspection: InspectionRow): Promise<ReportRenderContext> {
  const job = inspection.job;

  if (
    inspection.company.slug === 'sitescop-demo' &&
    isLegacyDemoCompanyProfile(inspection.company)
  ) {
    void syncLegacyDemoBrandingIfNeeded(inspection.company).catch(() => undefined);
  }

  const { company: companyProfile, settings: reportSettings } = resolveCompanyProfileForReport(
    inspection.company,
    inspection.company.settings,
  );

  const formKind = jobTypeToFormKind(job.type);
  let formData = enrichInspectionFormData(normalizeInspectionFormData(inspection.formData, formKind));

  const inspectorName = inspection.inspector
    ? `${inspection.inspector.firstName} ${inspection.inspector.lastName}`.trim()
    : undefined;

  if (formData.pest) {
    formData = {
      ...formData,
      pest: enrichPestConclusion(formData.pest, {
        building: formData.building,
        inspectorName,
      }),
    };
  }

  const clientName =
    job.clientContact
      ? `${job.clientContact.firstName} ${job.clientContact.lastName}`.trim()
      : formData.shared.jobInformation.clientName || 'Client';

  const logoUrl = await resolveCompanyLogoForPdf(companyProfile.logoUrl);

  return {
    company: {
      name: companyProfile.name,
      abn: companyProfile.abn,
      email: companyProfile.email,
      phone: companyProfile.phone,
      website: companyProfile.website,
      address: companyProfile.address,
      logoUrl,
    },
    settings: reportSettings,
    inspection: {
      inspectionNumber: inspection.inspectionNumber,
      completedAt: inspection.completedAt,
      startedAt: inspection.startedAt,
    },
    job: {
      jobNumber: job.jobNumber,
      jobType: job.type,
      propertyAddress: job.property ? formatPropertyAddress(job.property) : job.title,
      clientName,
    },
    inspector: inspection.inspector
      ? {
          name: `${inspection.inspector.firstName} ${inspection.inspector.lastName}`.trim(),
          email: inspection.inspector.email,
        }
      : null,
    formData,
    rooms: inspection.rooms.map((room) => ({
      label: room.label,
      roomType: room.roomType,
      roomIndex: room.roomIndex,
      data: mergeRoomDataForReport(room.roomType, room.roomIndex, room.data as Record<string, unknown>),
    })),
  };
}

async function assertInspectionAccess(user: AuthUser, inspection: InspectionRow): Promise<void> {
  const companyId = scopedCompanyId(user);
  if (inspection.companyId !== companyId) throw new NotFoundError('Inspection not found');

  if (user.role === UserRole.INSPECTOR && !roleHasPermission(user.role, 'jobs:view_all')) {
    const allowed = canInspectorAccessJob(inspection.job, user.id, false);
    if (!allowed) throw new ForbiddenError('Access denied');
  }
}

async function loadInspection(user: AuthUser, inspectionId: string): Promise<InspectionRow> {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: inspectionInclude,
  });
  if (!inspection) throw new NotFoundError('Inspection not found');
  await assertInspectionAccess(user, inspection);
  return inspection;
}

async function assertReportAccess(user: AuthUser, row: ReportRow): Promise<void> {
  if (user.role === UserRole.INSPECTOR && !roleHasPermission(user.role, 'jobs:view_all')) {
    const job = row.inspection.job;
    const isAssigned = canInspectorAccessJob(job, user.id, false);
    const isInspector = row.inspection.inspectorId === user.id;
    if (!isAssigned && !isInspector) {
      throw new ForbiddenError('Access denied');
    }
  }
}

async function loadReportRow(
  user: AuthUser,
  id: string,
  extraWhere?: Prisma.InspectionReportWhereInput,
): Promise<ReportRow> {
  const companyId = scopedCompanyId(user);
  const row = await prisma.inspectionReport.findFirst({
    where: { id, companyId, ...extraWhere },
    include: reportInclude,
  });
  if (!row) throw new NotFoundError('Report not found');
  await assertReportAccess(user, row);
  return row;
}

function inspectorReportFilter(user: AuthUser): Prisma.InspectionReportWhereInput | undefined {
  if (user.role !== UserRole.INSPECTOR || roleHasPermission(user.role, 'jobs:view_all')) {
    return undefined;
  }
  return {
    OR: [
      { inspection: { inspectorId: user.id } },
      { inspection: { job: { assignedInspectorId: user.id } } },
    ],
  };
}

async function generatePdfBuffer(
  reportType: ReportType,
  ctx: ReportRenderContext,
): Promise<Buffer> {
  if (reportType === ReportType.PEST) {
    if (!ctx.formData.pest) {
      throw new AppError('Pest inspection data is missing', 'VALIDATION_ERROR');
    }
    return generatePestReportPdf(ctx);
  }
  return generateBuildingReportPdf(ctx);
}

async function writeReportFile(companyId: string, reportId: string, buffer: Buffer): Promise<string> {
  const relativePath = join(companyId, `${reportId}.pdf`);
  const absolutePath = join(REPORTS_STORAGE_ROOT, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return relativePath;
}

export async function listReports(
  user: AuthUser,
  query: Record<string, string>,
): Promise<ReportsListResponse> {
  const companyId = scopedCompanyId(user);
  const { page, pageSize, skip } = parsePagination(query);
  const status = query.status?.trim();
  const search = query.search?.trim();
  const inspectionId = query.inspectionId?.trim();

  const inspectorFilter = inspectorReportFilter(user);

  const where: Prisma.InspectionReportWhereInput = {
    companyId,
    ...(inspectorFilter ?? {}),
    ...(status ? { status: status as ReportStatus } : {}),
    ...(inspectionId ? { inspectionId } : {}),
    ...(search
      ? {
          OR: [
            { fileName: { contains: search, mode: 'insensitive' } },
            { inspection: { inspectionNumber: { contains: search, mode: 'insensitive' } } },
            { inspection: { job: { jobNumber: { contains: search, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.inspectionReport.findMany({
      where,
      include: reportInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.inspectionReport.count({ where }),
  ]);

  return {
    reports: rows.map(mapReport),
    total,
    page,
    pageSize,
  };
}

export async function getReport(user: AuthUser, id: string): Promise<ReportSummary> {
  const row = await loadReportRow(user, id);
  return mapReport(row);
}

export async function getReportFilePath(user: AuthUser, id: string): Promise<{ path: string; fileName: string }> {
  const row = await loadReportRow(user, id, { status: ReportStatus.READY });
  if (!row.filePath) throw new NotFoundError('Report file not found');
  return { path: join(REPORTS_STORAGE_ROOT, row.filePath), fileName: row.fileName };
}

export async function generateInspectionReports(
  user: AuthUser,
  inspectionId: string,
  request?: import('fastify').FastifyRequest,
): Promise<GenerateReportsResponse> {
  if (!roleHasPermission(user.role, 'reports:generate')) {
    throw new ForbiddenError('Permission denied');
  }

  const inspection = await loadInspection(user, inspectionId);
  if (inspection.status !== InspectionStatus.COMPLETED) {
    throw new AppError('Inspection must be completed before generating reports', 'VALIDATION_ERROR');
  }

  const companyId = scopedCompanyId(user);
  const types = reportTypesForJob(inspection.job.type);
  const ctx = await buildRenderContext(inspection);
  const results: ReportSummary[] = [];
  let clientReportSmsSent = false;

  for (const reportType of types) {
    const fileName = reportFileName(inspection.inspectionNumber, reportType);

    const existing = await prisma.inspectionReport.findUnique({
      where: {
        inspectionId_reportType: { inspectionId, reportType },
      },
    });

    const report = existing
      ? await prisma.inspectionReport.update({
          where: { id: existing.id },
          data: {
            status: ReportStatus.GENERATING,
            fileName,
            filePath: null,
            fileSizeBytes: null,
            errorMessage: null,
            generatedById: user.id,
            generatedAt: null,
          },
          include: reportInclude,
        })
      : await prisma.inspectionReport.create({
          data: {
            companyId,
            inspectionId,
            reportType,
            status: ReportStatus.GENERATING,
            fileName,
            generatedById: user.id,
          },
          include: reportInclude,
        });

    try {
      const buffer = await generatePdfBuffer(reportType, ctx);
      const filePath = await writeReportFile(companyId, report.id, buffer);
      const updated = await prisma.inspectionReport.update({
        where: { id: report.id },
        data: {
          status: ReportStatus.READY,
          filePath,
          fileSizeBytes: buffer.length,
          generatedAt: new Date(),
        },
        include: reportInclude,
      });
      results.push(mapReport(updated));

      if (isEmailConfigured() && updated.status === ReportStatus.READY && updated.filePath) {
        const clientEmail = inspection.job.clientContact?.email?.trim();
        if (clientEmail) {
          try {
            const emailContext = await loadCompanyEmailContext(companyId);
            const company = inspection.company;
            const pdfBuffer = await readFile(join(REPORTS_STORAGE_ROOT, updated.filePath));
            await trySendCompanyEmail({
              context: emailContext,
              toEmail: clientEmail,
              templateKey: 'reportReady',
              variables: {
                clientName: inspection.job.clientContact?.firstName
                  ? `${inspection.job.clientContact.firstName} ${inspection.job.clientContact.lastName ?? ''}`.trim()
                  : inspection.job.clientContact?.lastName ?? 'Client',
                propertyAddress: inspection.job.property
                  ? formatPropertyAddress(inspection.job.property)
                  : '—',
                jobNumber: inspection.job.jobNumber,
                inspectionNumber: inspection.inspectionNumber,
                companyPhone: company.phone ?? '',
              },
              attachments: [{ filename: updated.fileName, content: pdfBuffer }],
            });
          } catch {
            // Client report email is best-effort; PDF generation already succeeded.
          }
        }
      }

      if (!clientReportSmsSent && updated.status === ReportStatus.READY) {
        clientReportSmsSent = true;
        const clientName = inspection.job.clientContact?.firstName
          ? `${inspection.job.clientContact.firstName} ${inspection.job.clientContact.lastName ?? ''}`.trim()
          : inspection.job.clientContact?.lastName ?? 'Client';
        void notifyClientSms(
          companyId,
          {
            phone: inspection.job.clientContact?.phone,
            contactId: inspection.job.clientContactId,
          },
          'reportReady',
          {
            clientName,
            propertyAddress: inspection.job.property
              ? formatPropertyAddress(inspection.job.property)
              : '—',
            jobNumber: inspection.job.jobNumber,
            companyName: inspection.company.name,
            companyPhone: inspection.company.phone ?? '',
          },
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PDF generation failed';
      const failed = await prisma.inspectionReport.update({
        where: { id: report.id },
        data: {
          status: ReportStatus.FAILED,
          errorMessage: message,
        },
        include: reportInclude,
      });
      results.push(mapReport(failed));
    }
  }

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'reports.generate',
    entityType: 'inspection',
    entityId: inspectionId,
    metadata: { reportTypes: types, reportIds: results.map((r) => r.id) },
    request,
  });

  return { reports: results };
}

export async function listInspectionReports(
  user: AuthUser,
  inspectionId: string,
): Promise<GenerateReportsResponse> {
  await loadInspection(user, inspectionId);
  const companyId = scopedCompanyId(user);
  const rows = await prisma.inspectionReport.findMany({
    where: { companyId, inspectionId },
    include: reportInclude,
    orderBy: { reportType: 'asc' },
  });
  return { reports: rows.map(mapReport) };
}
