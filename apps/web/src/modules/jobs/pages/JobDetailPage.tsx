import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { jobsApi } from '@/lib/api/jobs';
import { inspectionsApi } from '@/lib/api/inspections';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import {
  Badge,
  Button,
  Card,
  JobStatusBadge,
  LoadingOverlay,
  Modal,
  PageHeader,
  Select,
} from '@/design-system/components';
import { JOB_STATUS_LABELS, JobStatus } from '@sitescop/shared-types';

const WORKFLOW_STEPS = [
  { status: JobStatus.PENDING_ASSIGNMENT, label: 'Create job', hint: 'Job is created and waiting for an inspector.' },
  { status: JobStatus.ACCEPTED, label: 'Assign inspector', hint: 'Office assigns an inspector — job becomes ready for inspection.' },
  { status: JobStatus.IN_PROGRESS, label: 'Start inspection', hint: 'Open the inspection form and complete the report on site.' },
  { status: JobStatus.COMPLETED, label: 'Complete', hint: 'Finish the inspection report and mark the job complete.' },
] as const;

function workflowStepIndex(status: JobStatus): number {
  if (status === JobStatus.ASSIGNED) return 1;
  if (status === JobStatus.ACCEPTED) return 2;
  if (status === JobStatus.IN_PROGRESS) return 2;
  if (status === JobStatus.COMPLETED) return 3;
  if (status === JobStatus.PENDING_ASSIGNMENT) return 0;
  return -1;
}

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const showCreatedBanner = Boolean((location.state as { created?: boolean } | null)?.created);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canSendAgreement = hasPermission('agreements:send');
  const [assignOpen, setAssignOpen] = useState(false);
  const [inspectorId, setInspectorId] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id!),
    enabled: Boolean(id),
  });

  const { data: inspectorsData } = useQuery({
    queryKey: ['inspectors'],
    queryFn: () => jobsApi.listInspectors(),
    enabled: assignOpen && hasPermission('jobs:assign'),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['job', id] });
    void queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  const actionMutation = useMutation({
    mutationFn: async (action: string) => {
      switch (action) {
        case 'accept':
          return jobsApi.accept(id!);
        case 'decline':
          return jobsApi.decline(id!);
        case 'start':
          return jobsApi.start(id!);
        case 'complete':
          return jobsApi.complete(id!);
        case 'cancel':
          return jobsApi.cancel(id!);
        case 'archive':
          return jobsApi.archive(id!);
        case 'unarchive':
          return jobsApi.unarchive(id!);
        case 'delete':
          return jobsApi.remove(id!);
        case 'restore':
          return jobsApi.restore(id!);
        case 'permanent':
          return jobsApi.permanentDelete(id!);
        default:
          throw new Error('Unknown action');
      }
    },
    onSuccess: (_, action) => {
      if (action === 'delete') navigate('/jobs?view=recycle');
      else if (action === 'permanent') navigate('/jobs');
      else if (action === 'archive') navigate('/jobs?view=archived');
      else if (action === 'unarchive') navigate('/jobs');
      else invalidate();
    },
  });

  const { data: inspectionData } = useQuery({
    queryKey: ['inspection-by-job', id],
    queryFn: () => inspectionsApi.getByJob(id!),
    enabled: Boolean(id) && hasPermission('inspections:view'),
  });

  const startInspectionMutation = useMutation({
    mutationFn: () => inspectionsApi.createFromJob(id!),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['job', id] });
      navigate(`/inspections/${result.inspection.id}`);
    },
  });

  const assignMutation = useMutation({
    mutationFn: () => jobsApi.assign(id!, { inspectorId }),
    onSuccess: () => {
      setAssignOpen(false);
      invalidate();
    },
  });

  if (isLoading) return <LoadingOverlay message="Loading job..." fullScreen={false} />;
  if (error || !data) {
    return (
      <Card className="p-6">
        <p className="text-danger">Job not found or access denied.</p>
        <Button className="mt-4" variant="secondary" asChild>
          <Link to="/jobs">Back to Jobs</Link>
        </Button>
      </Card>
    );
  }

  const job = data.job;
  const isAssignedInspector = job.assignedInspector?.id === user?.id;
  const canManageInspection =
    hasPermission('inspections:edit') && (isAssignedInspector || hasPermission('jobs:assign'));
  const inspectionReady =
    !job.archivedAt && [JobStatus.ACCEPTED, JobStatus.IN_PROGRESS].includes(job.status);
  const openInspection = inspectionData?.inspection;
  const currentStep = workflowStepIndex(job.status);
  const nextStepHint =
    job.archivedAt
      ? 'This job is archived. Unarchive it to assign an inspector or start a new inspection.'
      : job.status === JobStatus.PENDING_ASSIGNMENT
        ? 'Next: assign an inspector from the Actions panel.'
        : job.status === JobStatus.ASSIGNED
          ? 'Next: the assigned inspector must accept the job.'
          : job.status === JobStatus.ACCEPTED && !openInspection
            ? 'Next: click Start Inspection to open the report form.'
            : job.status === JobStatus.IN_PROGRESS || openInspection
              ? 'Continue the inspection form until the report is complete.'
              : job.status === JobStatus.COMPLETED
                ? 'Job is complete. Review the inspection report, then archive the job when you are finished filing it.'
                : null;

  return (
    <div>
      <PageHeader
        title={job.title}
        description={job.jobNumber}
        breadcrumbs={[
          { label: 'Jobs', href: '/jobs' },
          { label: job.jobNumber },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canSendAgreement && !job.deletedAt && (
              <Button variant="secondary" asChild>
                <Link to={`/agreements/send?jobId=${job.id}`}>Create Agreement</Link>
              </Button>
            )}
            {hasPermission('jobs:create') && !job.deletedAt && (
              <Button variant="secondary" asChild>
                <Link to={`/jobs/${job.id}/edit`}>Edit</Link>
              </Button>
            )}
            {hasPermission('jobs:assign') && !job.deletedAt && !job.archivedAt && (
              <Button variant="secondary" onClick={() => setAssignOpen(true)}>
                Assign Inspector
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <JobStatusBadge status={job.status} />
        {job.deletedAt && <Badge variant="danger">In Recycle Bin</Badge>}
        {job.archivedAt && <Badge variant="default">Archived</Badge>}
      </div>

      {showCreatedBanner && (
        <div className="mb-6 rounded-sm border border-success/40 bg-success/10 px-4 py-3 text-sm text-text">
          Job created successfully. It appears under the Active jobs list. Assign an inspector, then start the inspection form.
        </div>
      )}

      {!job.deletedAt && !job.archivedAt && currentStep >= 0 && (
        <Card className="mb-6 p-4">
          <h3 className="mb-3 font-semibold text-text">Inspection workflow</h3>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW_STEPS.map((step, index) => {
              const isDone = currentStep > index || job.status === JobStatus.COMPLETED;
              const isCurrent = currentStep === index || (index === 2 && job.status === JobStatus.IN_PROGRESS);
              return (
                <li
                  key={step.label}
                  className={`rounded-sm border p-3 text-sm ${
                    isCurrent ? 'border-primary bg-primary/5' : isDone ? 'border-success/40 bg-success/5' : 'border-border'
                  }`}
                >
                  <p className="font-medium text-text">
                    {index + 1}. {step.label}
                  </p>
                  <p className="mt-1 text-text-muted">{step.hint}</p>
                </li>
              );
            })}
          </ol>
          {nextStepHint && <p className="mt-3 text-sm text-text">{nextStepHint}</p>}
        </Card>
      )}

      {job.archivedAt && (
        <div className="mb-6 rounded-sm border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text">
          This job is archived (filed away in the Archived jobs list). Archiving does not create a PDF — it only
          hides the job from Active jobs.{' '}
          {openInspection ? (
            <>
              You can still{' '}
              <Link to={`/inspections/${openInspection.id}`} className="text-primary underline">
                review the inspection report
              </Link>
              . Unarchive the job if you need to edit it again.
            </>
          ) : (
            <>Unarchive the job to make it active again.</>
          )}
        </div>
      )}

      {job.status === JobStatus.COMPLETED && !job.archivedAt && openInspection && (
        <div className="mb-6 rounded-sm border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-text">
          This job is complete. Open the inspection report to review or edit it. Archive the job when you want to file it under Archived jobs (this does not create a PDF).
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-4 p-6">
          <div>
            <h3 className="text-sm font-medium text-text-light">Description</h3>
            <p className="mt-1 text-text">{job.description || 'No description provided.'}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-text-light">Property</h3>
              <p className="mt-1 text-text">{job.property?.formattedAddress ?? 'Not specified'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Scheduled</h3>
              <p className="mt-1 text-text">
                {job.scheduledDate
                  ? `${new Date(job.scheduledDate).toLocaleDateString('en-AU')}${job.scheduledTime ? ` at ${job.scheduledTime}` : ''}`
                  : 'Not scheduled'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Client</h3>
              <p className="mt-1 text-text">{job.clientContact?.displayName ?? '—'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Agent</h3>
              <p className="mt-1 text-text">{job.agentContact?.displayName ?? '—'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Price</h3>
              <p className="mt-1 text-text">
                {job.priceCents != null ? `$${(job.priceCents / 100).toFixed(2)}` : '—'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Inspector</h3>
              <p className="mt-1 text-text">{job.assignedInspector?.displayName ?? 'Unassigned'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Status</h3>
              <p className="mt-1 text-text">{JOB_STATUS_LABELS[job.status]}</p>
            </div>
          </div>
          {job.notes && (
            <div>
              <h3 className="text-sm font-medium text-text-light">Notes</h3>
              <p className="mt-1 whitespace-pre-wrap text-text">{job.notes}</p>
            </div>
          )}
        </Card>

        <Card className="space-y-3 p-6">
          <h3 className="font-semibold text-text">Actions</h3>

          {openInspection && hasPermission('inspections:view') && (
            <Button className="w-full" variant="accent" asChild>
              <Link to={`/inspections/${openInspection.id}`}>
                {openInspection.status === 'COMPLETED'
                  ? canManageInspection
                    ? 'Open Inspection Report'
                    : 'Review Inspection Report'
                  : 'Continue Inspection'}
              </Link>
            </Button>
          )}

          {canManageInspection && inspectionReady && !openInspection && (
            <Button
              className="w-full"
              onClick={() => startInspectionMutation.mutate()}
              isLoading={startInspectionMutation.isPending}
            >
              Start Inspection
            </Button>
          )}

          {hasPermission('jobs:assign') &&
            !job.deletedAt &&
            !job.archivedAt &&
            job.status === JobStatus.PENDING_ASSIGNMENT && (
              <Button className="w-full" variant="secondary" onClick={() => setAssignOpen(true)}>
                Assign Inspector
              </Button>
            )}

          {hasPermission('jobs:accept') && isAssignedInspector && job.status === JobStatus.ASSIGNED && (
            <>
              <Button className="w-full" onClick={() => actionMutation.mutate('accept')} isLoading={actionMutation.isPending}>
                Accept Job
              </Button>
              <Button className="w-full" variant="secondary" onClick={() => actionMutation.mutate('decline')} isLoading={actionMutation.isPending}>
                Decline Job
              </Button>
            </>
          )}

          {hasPermission('jobs:complete') &&
            isAssignedInspector &&
            [JobStatus.ACCEPTED, JobStatus.IN_PROGRESS].includes(job.status) &&
            !job.archivedAt && (
              <Button className="w-full" variant="accent" onClick={() => actionMutation.mutate('complete')} isLoading={actionMutation.isPending}>
                Mark Complete
              </Button>
            )}

          {hasPermission('jobs:archive') && job.archivedAt && !job.deletedAt && (
            <Button className="w-full" onClick={() => actionMutation.mutate('unarchive')} isLoading={actionMutation.isPending}>
              Unarchive Job
            </Button>
          )}

          {hasPermission('jobs:create') && !job.deletedAt && job.status !== JobStatus.CANCELLED && !job.archivedAt && (
            <Button className="w-full" variant="secondary" onClick={() => actionMutation.mutate('cancel')} isLoading={actionMutation.isPending}>
              Cancel Job
            </Button>
          )}

          {hasPermission('jobs:archive') && !job.deletedAt && !job.archivedAt && (
            <Button className="w-full" variant="secondary" onClick={() => actionMutation.mutate('archive')} isLoading={actionMutation.isPending}>
              Archive
            </Button>
          )}

          {hasPermission('jobs:delete') && !job.deletedAt && (
            <Button className="w-full" variant="danger" onClick={() => actionMutation.mutate('delete')} isLoading={actionMutation.isPending}>
              Move to Recycle Bin
            </Button>
          )}

          {hasPermission('jobs:delete') && job.deletedAt && (
            <>
              <Button className="w-full" onClick={() => actionMutation.mutate('restore')} isLoading={actionMutation.isPending}>
                Restore
              </Button>
              <Button className="w-full" variant="danger" onClick={() => actionMutation.mutate('permanent')} isLoading={actionMutation.isPending}>
                Delete Permanently
              </Button>
            </>
          )}
        </Card>
      </div>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign Inspector"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => assignMutation.mutate()} disabled={!inspectorId} isLoading={assignMutation.isPending}>
              Assign
            </Button>
          </>
        }
      >
        <Select
          label="Inspector"
          placeholder="Select inspector"
          value={inspectorId}
          onChange={(e) => setInspectorId(e.target.value)}
          options={(inspectorsData?.inspectors ?? []).map((i) => ({
            value: i.id,
            label: i.displayName,
          }))}
        />
      </Modal>
    </div>
  );
}
