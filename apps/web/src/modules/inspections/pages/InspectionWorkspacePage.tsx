import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Download, FileText } from 'lucide-react';
import { InspectionStatus, ReportStatus, REPORT_TYPE_LABELS } from '@sitescop/shared-types';
import { jobTypeToFormKind } from '@sitescop/room-engine-core';
import { inspectionsApi } from '@/lib/api/inspections';
import { downloadReport, reportsApi } from '@/lib/api/reports';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import {
  Button,
  Card,
  LoadingOverlay,
  PageHeader,
} from '@/design-system/components';
import { BuildingInspectionForm } from '../components/BuildingInspectionForm';
import { CombinedInspectionForm } from '../components/CombinedInspectionForm';
import { InspectionOverviewHeader } from '../components/InspectionOverviewHeader';
import { InspectionRoomSections } from '../components/InspectionRoomSections';
import { PestInspectionForm } from '../components/PestInspectionForm';
import { useInspectionEditor } from '../hooks/useInspectionEditor';

export function InspectionWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canEdit = hasPermission('inspections:edit');
  const canGenerateReports = hasPermission('reports:generate');

  const { data, isLoading } = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => inspectionsApi.get(id!),
    enabled: Boolean(id),
  });

  const inspection = data?.inspection;
  const isCompleted = inspection?.status === InspectionStatus.COMPLETED;
  const readOnly = !canEdit;
  const formKind = inspection ? jobTypeToFormKind(inspection.jobType) : 'BUILDING';

  const { formData, rooms, saveState, patchSection, patchRoom, updateRoomData } = useInspectionEditor(
    inspection,
    id,
    readOnly,
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['inspection', id] });
    void queryClient.invalidateQueries({ queryKey: ['inspections'] });
    void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    void queryClient.invalidateQueries({ queryKey: ['inspection-by-job'] });
  };

  const completeMutation = useMutation({
    mutationFn: () => inspectionsApi.complete(id!),
    onSuccess: invalidate,
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['inspection-reports', id],
    queryFn: () => reportsApi.listForInspection(id!),
    enabled: Boolean(id) && isCompleted && hasPermission('reports:view'),
  });

  const generateReportsMutation = useMutation({
    mutationFn: () => reportsApi.generate(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inspection-reports', id] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  if (isLoading || !inspection || !formData) {
    return <LoadingOverlay message="Loading inspection..." fullScreen={false} />;
  }

  const jobTypeLabel =
    inspection.jobType === 'COMBINED'
      ? 'Combined Building & Pest'
      : inspection.jobType === 'PEST'
        ? 'Timber Pest'
        : 'Building';

  const formContent =
    formKind === 'COMBINED' ? (
      <CombinedInspectionForm
        formData={formData}
        onSectionChange={patchSection}
        readOnly={readOnly}
        rooms={rooms}
        onRoomPatch={patchRoom}
        onRoomDataChange={updateRoomData}
      />
    ) : formKind === 'PEST' && formData.pest ? (
      <div className="space-y-10">
        <BuildingInspectionForm formData={formData} onSectionChange={patchSection} readOnly={readOnly} mode="shared-only" />
        <div className="border-t border-border pt-8">
          <PestInspectionForm pest={formData.pest} onSectionChange={patchSection} readOnly={readOnly} />
        </div>
      </div>
    ) : (
      <BuildingInspectionForm
        formData={formData}
        onSectionChange={patchSection}
        readOnly={readOnly}
        roomSections={
          <InspectionRoomSections
            rooms={rooms}
            readOnly={readOnly}
            onRoomDataChange={updateRoomData}
            onRoomPatch={patchRoom}
          />
        }
      />
    );

  return (
    <div className="pb-24">
      <PageHeader
        title="Inspection"
        description={`${inspection.inspectionNumber} · ${jobTypeLabel}`}
        breadcrumbs={[
          { label: 'Inspections', href: '/inspections' },
          { label: inspection.inspectionNumber },
        ]}
      />

      <InspectionOverviewHeader inspection={inspection} saveState={saveState} />

      {isCompleted && canEdit && (
        <div className="mb-4 rounded-sm border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-text">
          This report is complete. You can edit any section below at any time — changes save automatically.
          {formKind === 'COMBINED' && ' Combined jobs produce separate building and pest PDFs when you generate reports.'}
        </div>
      )}

      {isCompleted && hasPermission('reports:view') && (
        <div className="mb-4 rounded-sm border border-border bg-surface px-4 py-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-text">Inspection PDFs</h3>
              <p className="text-sm text-text-muted">
                Generate AS 4349 compliant reports with Schedule 1 legal content.
              </p>
            </div>
            {canGenerateReports && (
              <Button
                variant="accent"
                onClick={() => generateReportsMutation.mutate()}
                isLoading={generateReportsMutation.isPending}
              >
                <FileText className="mr-2 h-4 w-4" />
                {reportsData?.reports?.length ? 'Regenerate PDFs' : 'Generate PDFs'}
              </Button>
            )}
          </div>
          {reportsLoading ? (
            <p className="text-sm text-text-muted">Loading reports...</p>
          ) : reportsData?.reports?.length ? (
            <ul className="space-y-2">
              {reportsData.reports.map((report) => (
                <li
                  key={report.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-text">{REPORT_TYPE_LABELS[report.reportType]}</p>
                    <p className="text-sm text-text-muted">
                      {report.status === ReportStatus.READY && report.generatedAt
                        ? `Ready · ${new Date(report.generatedAt).toLocaleString('en-AU')}`
                        : report.status === ReportStatus.FAILED
                          ? `Failed — ${report.errorMessage ?? 'Unknown error'}`
                          : 'Generating...'}
                    </p>
                  </div>
                  {report.status === ReportStatus.READY && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void downloadReport(report.id, report.fileName)}
                    >
                      <Download className="mr-1 h-4 w-4" />
                      Download
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">No PDFs generated yet.</p>
          )}
          <p className="mt-3 text-sm">
            <Link to="/reports" className="text-primary hover:underline">
              View all reports
            </Link>
          </p>
        </div>
      )}

      {isCompleted && !canEdit && (
        <div className="mb-4 rounded-sm border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text">
          This report is complete and read-only on your account.
        </div>
      )}

      <Card className="p-4 md:p-6">{formContent}</Card>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface p-3 md:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <Button variant="secondary" asChild>
            <Link to="/inspections">Back to List</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            {isCompleted && canEdit && (
              <span className="text-sm text-success">
                Report complete — your edits save automatically
                {saveState === 'saving' && ' · Saving...'}
                {saveState === 'saved' && ' · Saved'}
              </span>
            )}
            {isCompleted && !canEdit && (
              <span className="text-sm text-text-muted">Report complete (read-only)</span>
            )}
            <Button variant="secondary" asChild>
              <Link to={`/jobs/${inspection.jobId}`}>View Job</Link>
            </Button>
            {canEdit && !isCompleted && (
              <Button
                variant="accent"
                onClick={() => completeMutation.mutate()}
                isLoading={completeMutation.isPending}
              >
                Complete Inspection
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
