import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/lib/api/admin';
import { DataTable, JobStatusBadge, LoadingOverlay, PageHeader } from '@/design-system/components';
import { JobStatus } from '@sitescop/shared-types';

export function AdminJobsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => adminApi.listJobs(),
  });

  if (isLoading) return <LoadingOverlay message="Loading jobs..." fullScreen={false} />;

  return (
    <div>
      <PageHeader
        title="All Jobs"
        description="Company-wide job overview for administrators"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Jobs' },
        ]}
      />

      <DataTable
        columns={[
          { key: 'jobNumber', header: 'Job #', render: (row) => row.jobNumber },
          { key: 'title', header: 'Title', render: (row) => row.title },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <JobStatusBadge status={row.status as JobStatus} />,
          },
          {
            key: 'inspector',
            header: 'Inspector',
            hideOnMobile: true,
            render: (row) => row.assignedInspector?.displayName ?? 'Unassigned',
          },
        ]}
        data={data?.jobs ?? []}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => navigate(`/jobs/${row.id}`)}
        emptyMessage="No jobs found"
      />
    </div>
  );
}
