import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { jobsApi } from '@/lib/api/jobs';
import { inspectionsApi } from '@/lib/api/inspections';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import { JobWorkflowPanel } from '@/modules/jobs/components/JobWorkflowPanel';
import { JobOverviewHeader } from '@/modules/jobs/components/JobOverviewHeader';
import { JobWorkflowStatusBadge } from '@/modules/jobs/components/JobWorkflowStatusBadge';
import {
  Badge,
  Button,
  Card,
  LoadingOverlay,
  Modal,
  PageHeader,
  Select,
} from '@/design-system/components';
import { JobStatus } from '@sitescop/shared-types';

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const showCreatedBanner = Boolean((location.state as { created?: boolean } | null)?.created);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
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

  const { data: inspectionData } = useQuery({
    queryKey: ['inspection-by-job', id],
    queryFn: () => inspectionsApi.getByJob(id!),
    enabled: Boolean(id) && hasPermission('inspections:view'),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['job', id] });
    void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    void queryClient.invalidateQueries({ queryKey: ['inspection-by-job', id] });
  };

  const actionMutation = useMutation({
    mutationFn: async (action: string) => {
      switch (action) {
        case 'accept':
          return jobsApi.accept(id!);
        case 'decline':
          return jobsApi.decline(id!);
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
      else if (action === 'archive') invalidate();
      else if (action === 'unarchive') navigate('/jobs');
      else invalidate();
    },
  });

  const startInspectionMutation = useMutation({
    mutationFn: () => inspectionsApi.createFromJob(id!),
    onSuccess: (result) => {
      invalidate();
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
  const billing = job.billing;
  const isAssignedInspector = job.assignedInspector?.id === user?.id;
  const openInspection = inspectionData?.inspection ?? null;

  return (
    <div>
      <PageHeader
        title={job.title}
        description={job.property?.formattedAddress ?? job.jobNumber}
        breadcrumbs={[
          { label: 'Jobs', href: '/jobs' },
          { label: job.jobNumber },
        ]}
        actions={
          hasPermission('jobs:create') && !job.deletedAt ? (
            <Button variant="secondary" asChild>
              <Link to={`/jobs/${job.id}/edit`}>Edit Job</Link>
            </Button>
          ) : undefined
        }
      />

      {!job.deletedAt && (
        <JobOverviewHeader
          job={job}
          billing={billing}
          inspection={openInspection}
          isAssignedInspector={isAssignedInspector}
          canManageInspection={
            hasPermission('inspections:edit') &&
            (isAssignedInspector || hasPermission('jobs:assign'))
          }
          canAssign={hasPermission('jobs:assign')}
          onAcceptJob={() => actionMutation.mutate('accept')}
          onDeclineJob={() => actionMutation.mutate('decline')}
          onAssignClick={() => setAssignOpen(true)}
          onStartInspection={() => startInspectionMutation.mutate()}
          isAccepting={actionMutation.isPending}
          isStartingInspection={startInspectionMutation.isPending}
        />
      )}

      {job.archivedAt && !job.deletedAt && (
        <div className="mb-6 rounded-sm border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text">
          This job is archived. You can still open and edit the inspection report below.
          {hasPermission('jobs:archive') && (
            <>
              {' '}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => actionMutation.mutate('unarchive')}
              >
                Unarchive job
              </button>
            </>
          )}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <JobWorkflowStatusBadge
          jobStatus={job.status}
          inspectionStatus={job.inspectionStatus ?? openInspection?.status}
        />
        {job.deletedAt && <Badge variant="danger">In Recycle Bin</Badge>}
        {job.archivedAt && <Badge variant="default">Archived</Badge>}
      </div>

      {showCreatedBanner && (
        <div className="mb-6 rounded-sm border border-success/40 bg-success/10 px-4 py-3 text-sm text-text">
          {(location.state as { manual?: boolean } | null)?.manual
            ? 'Paper contract job created. Click Start Inspection below to draft the report.'
            : 'Job created. Use step 1 below to send the agreement to your client.'}
        </div>
      )}

      {!job.deletedAt && billing && (
        <div className="mb-6">
          <JobWorkflowPanel
            job={job}
            billing={billing}
            inspection={openInspection}
            canSendAgreement={hasPermission('agreements:send')}
            canManageBilling={
              hasPermission('billing:manage') || hasPermission('invoices:mark_paid')
            }
            canAssign={hasPermission('jobs:assign')}
            canManageInspection={
              hasPermission('inspections:edit') &&
              (isAssignedInspector || hasPermission('jobs:assign'))
            }
            canComplete={hasPermission('jobs:complete')}
            isAssignedInspector={isAssignedInspector}
            onRefresh={invalidate}
            onAssignClick={() => setAssignOpen(true)}
            onStartInspection={() => startInspectionMutation.mutate()}
            onCompleteJob={() => actionMutation.mutate('complete')}
            onAcceptJob={() => actionMutation.mutate('accept')}
            onDeclineJob={() => actionMutation.mutate('decline')}
            isStartingInspection={startInspectionMutation.isPending}
            isCompleting={actionMutation.isPending}
            isAccepting={actionMutation.isPending}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="space-y-4 p-6 lg:col-span-2">
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
              <p className="mt-1 font-medium text-text">{job.clientContact?.displayName ?? '—'}</p>
              {job.clientContact?.phone && (
                <a
                  href={`tel:${job.clientContact.phone.replace(/\s+/g, '')}`}
                  className="mt-1 block text-base font-medium text-primary hover:underline"
                >
                  {job.clientContact.phone}
                </a>
              )}
              {job.clientContact?.email && (
                <a
                  href={`mailto:${job.clientContact.email}`}
                  className="block text-sm text-text-light hover:text-primary hover:underline"
                >
                  {job.clientContact.email}
                </a>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Agent</h3>
              <p className="mt-1 text-text">{job.agentContact?.displayName ?? '—'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Price (ex GST)</h3>
              <p className="mt-1 text-text">
                {job.priceCents != null ? `$${(job.priceCents / 100).toFixed(2)}` : '—'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Inspector</h3>
              <p className="mt-1 text-text">{job.assignedInspector?.displayName ?? 'Unassigned'}</p>
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
          <h3 className="font-semibold text-text">Other actions</h3>

          {openInspection && hasPermission('inspections:view') && (
            <Button className="w-full" variant="accent" asChild>
              <Link to={`/inspections/${openInspection.id}`}>
                {hasPermission('inspections:edit') ? 'Edit Inspection Report' : 'View Inspection Report'}
              </Link>
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

          {hasPermission('jobs:archive') && !job.deletedAt && !job.archivedAt && job.status === JobStatus.COMPLETED && (
            <Button className="w-full" variant="secondary" onClick={() => actionMutation.mutate('archive')} isLoading={actionMutation.isPending}>
              Archive Job
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
