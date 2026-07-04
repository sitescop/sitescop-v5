import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { jobsApi } from '@/lib/api/jobs';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import {
  Button,
  DataTable,
  Input,
  LoadingOverlay,
  PageHeader,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/design-system/components';
import { JOB_TYPE_LABELS, type JobSummary } from '@sitescop/shared-types';
import { getJobWorkflowStatus } from '@/modules/jobs/lib/job-display-status';
import { JobWorkflowStatusBadge } from '@/modules/jobs/components/JobWorkflowStatusBadge';

function workflowHint(row: JobSummary): string {
  const { label } = getJobWorkflowStatus(row.status, row.inspectionStatus);
  return label;
}

const VIEWS = [
  { id: 'active', label: 'Active', view: '' },
  { id: 'archived', label: 'Archived', view: 'archived' },
  { id: 'recycle', label: 'Recycle Bin', view: 'recycle' },
];

export function JobsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useAuthStore((s) => s.hasPermission('jobs:create'));
  const canCreateManual = useAuthStore((s) => s.hasPermission('jobs:create_manual'));
  const view = searchParams.get('view') ?? '';
  const search = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(search);

  const queryKey = useMemo(() => ['jobs', view, search], [view, search]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params: Record<string, string> = {};
      if (view) params.view = view;
      if (search) params.search = search;
      return jobsApi.list(params);
    },
  });

  const columns = useMemo(
    () => [
      {
        key: 'jobNumber',
        header: 'Job #',
        render: (row: JobSummary) => (
          <span className="font-medium text-primary">{row.jobNumber}</span>
        ),
      },
      {
        key: 'title',
        header: 'Title',
        render: (row: JobSummary) => row.title,
      },
      {
        key: 'client',
        header: 'Client',
        render: (row: JobSummary) => (
          <div>
            <p className="font-medium text-text">{row.clientContact?.displayName ?? '—'}</p>
            {row.clientContact?.phone && (
              <p className="text-sm font-medium text-primary">{row.clientContact.phone}</p>
            )}
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (row: JobSummary) => (
          <span className="font-bold uppercase text-danger">{JOB_TYPE_LABELS[row.type]}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: JobSummary) => (
          <JobWorkflowStatusBadge jobStatus={row.status} inspectionStatus={row.inspectionStatus} />
        ),
      },
      {
        key: 'workflow',
        header: 'Action',
        hideOnMobile: true,
        render: (row: JobSummary) => (
          <span className="text-sm font-medium text-text">{workflowHint(row)}</span>
        ),
      },
      {
        key: 'inspector',
        header: 'Inspector',
        hideOnMobile: true,
        render: (row: JobSummary) => row.assignedInspector?.displayName ?? 'Unassigned',
      },
      {
        key: 'scheduled',
        header: 'Scheduled',
        hideOnMobile: true,
        render: (row: JobSummary) =>
          row.scheduledDate
            ? new Date(row.scheduledDate).toLocaleDateString('en-AU')
            : '—',
      },
    ],
    [],
  );

  if (isLoading) return <LoadingOverlay message="Loading jobs..." fullScreen={false} />;

  return (
    <div>
      <PageHeader
        title="Jobs"
        description="Manage inspection jobs, assignments, and lifecycle"
        breadcrumbs={[{ label: 'Jobs' }]}
        actions={
          canCreate || canCreateManual ? (
            <div className="flex flex-wrap gap-2">
              {canCreateManual && (
                <Button variant="accent" asChild>
                  <Link to="/jobs/manual">Start Job</Link>
                </Button>
              )}
              {canCreate && (
                <Button asChild>
                  <Link to="/jobs/new" state={{ fromActive: view === '' }}>
                    <Plus className="h-4 w-4" />
                    New Job
                  </Link>
                </Button>
              )}
            </div>
          ) : undefined
        }
        tabs={
          <Tabs
            value={view || 'active'}
            onValueChange={(v) => {
              const next = new URLSearchParams(searchParams);
              if (v === 'active') next.delete('view');
              else next.set('view', v);
              setSearchParams(next);
            }}
          >
            <TabsList>
              {VIEWS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.view || 'active'}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      <form
        className="mb-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const next = new URLSearchParams(searchParams);
          if (searchInput) next.set('search', searchInput);
          else next.delete('search');
          setSearchParams(next);
        }}
      >
        <Input
          placeholder="Search by job number or title..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </form>

      <DataTable
        columns={columns}
        data={data?.jobs ?? []}
        keyExtractor={(row) => row.id}
        emptyMessage="No jobs match your filters"
        onRowClick={(row) => navigate(`/jobs/${row.id}`)}
      />

      {data && data.total > data.pageSize && (
        <p className="mt-4 text-sm text-text-light">
          Showing {data.jobs.length} of {data.total} jobs
        </p>
      )}
    </div>
  );
}
