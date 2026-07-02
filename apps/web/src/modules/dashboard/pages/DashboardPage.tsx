import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity } from 'lucide-react';
import { USER_ROLE_LABELS, type RoleDashboardData } from '@sitescop/shared-types';
import { dashboardApi } from '@/lib/api/auth';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import { PageHeader } from '@/design-system/components/PageHeader';
import { StatTile } from '@/design-system/components/StatTile';
import { Card, CardHeader, CardTitle } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { LoadingOverlay } from '@/design-system/components/LoadingOverlay';
import { Badge } from '@/design-system/components/Badge';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, error } = useQuery<RoleDashboardData>({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
  });

  if (isLoading) {
    return <LoadingOverlay message="Loading dashboard..." fullScreen={false} />;
  }

  if (error || !data || !user) {
    return (
      <Card>
        <p className="text-danger">Unable to load dashboard data.</p>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.firstName}`}
        description={`${USER_ROLE_LABELS[user.role]} dashboard — ${user.company?.name ?? 'SiteScop Platform'}`}
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat) => (
          <StatTile
            key={stat.id}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <ul className="space-y-4">
            {data.activities.map((activity) => (
              <li
                key={activity.id}
                className="flex items-start gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <Badge
                  variant={
                    activity.type === 'success'
                      ? 'success'
                      : activity.type === 'warning'
                        ? 'warning'
                        : 'default'
                  }
                >
                  {activity.type}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm text-text">{activity.message}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {new Date(activity.timestamp).toLocaleString('en-AU')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {data.quickActions.map((action) => (
              <Button
                key={action.id}
                variant="secondary"
                className="w-full justify-between"
                asChild
              >
                <Link to={action.href}>
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
