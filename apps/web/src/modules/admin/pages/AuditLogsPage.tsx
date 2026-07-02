import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { DataTable, LoadingOverlay, PageHeader } from '@/design-system/components';

export function AuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => adminApi.auditLogs({ pageSize: '50' }),
  });

  if (isLoading) return <LoadingOverlay message="Loading audit logs..." fullScreen={false} />;

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Track administrative and system actions"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Audit Logs' },
        ]}
      />

      <DataTable
        columns={[
          {
            key: 'time',
            header: 'Time',
            render: (row) => new Date(row.createdAt).toLocaleString('en-AU'),
          },
          { key: 'action', header: 'Action', render: (row) => row.action },
          { key: 'entity', header: 'Entity', hideOnMobile: true, render: (row) => `${row.entityType}${row.entityId ? ` #${row.entityId.slice(0, 8)}` : ''}` },
          { key: 'actor', header: 'Actor', hideOnMobile: true, render: (row) => row.actorName ?? 'System' },
          { key: 'company', header: 'Company', hideOnMobile: true, render: (row) => row.companyName ?? '—' },
        ]}
        data={data?.logs ?? []}
        keyExtractor={(row) => row.id}
        emptyMessage="No audit logs yet"
      />
    </div>
  );
}
