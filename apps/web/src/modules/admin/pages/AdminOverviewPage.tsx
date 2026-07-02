import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '@/lib/api/admin';
import { Button, Card, LoadingOverlay, PageHeader, StatTile } from '@/design-system/components';

export function AdminOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: adminApi.overview,
  });

  if (isLoading) return <LoadingOverlay message="Loading admin..." fullScreen={false} />;

  return (
    <div>
      <PageHeader
        title="Admin"
        description="User management, audit logs, and platform administration"
        breadcrumbs={[{ label: 'Admin' }]}
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Users" value={data?.stats.users ?? 0} />
        <StatTile label="Jobs" value={data?.stats.jobs ?? 0} />
        <StatTile label="Contacts" value={data?.stats.contacts ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="space-y-2 p-6">
          <h3 className="font-semibold text-text">Quick Links</h3>
          <Button variant="secondary" className="w-full justify-start" asChild>
            <Link to="/admin/users">Manage Users</Link>
          </Button>
          <Button variant="secondary" className="w-full justify-start" asChild>
            <Link to="/admin/jobs">All Jobs</Link>
          </Button>
          <Button variant="secondary" className="w-full justify-start" asChild>
            <Link to="/admin/audit">Audit Logs</Link>
          </Button>
          <Button variant="secondary" className="w-full justify-start" asChild>
            <Link to="/admin/companies">Companies</Link>
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-text">Recent Activity</h3>
          <ul className="space-y-3">
            {(data?.recentActivity ?? []).map((item) => (
              <li key={item.id} className="border-b border-border pb-3 last:border-0">
                <p className="text-sm text-text">{item.action}</p>
                <p className="text-xs text-text-light">
                  {item.actorName} · {new Date(item.createdAt).toLocaleString('en-AU')}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
