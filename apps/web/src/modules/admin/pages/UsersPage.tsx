import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { USER_ROLE_LABELS } from '@sitescop/shared-types';
import { adminApi } from '@/lib/api/admin';
import { Button, DataTable, LoadingOverlay, PageHeader, Badge } from '@/design-system/components';
import type { AdminUserRecord } from '@sitescop/shared-types';

export function UsersPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers(),
  });

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (row: AdminUserRecord) => `${row.firstName} ${row.lastName}`,
      },
      { key: 'email', header: 'Email', render: (row: AdminUserRecord) => row.email },
      {
        key: 'role',
        header: 'Role',
        render: (row: AdminUserRecord) => USER_ROLE_LABELS[row.role],
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: AdminUserRecord) => (
          <Badge variant={row.status === 'ACTIVE' ? 'success' : 'default'}>{row.status}</Badge>
        ),
      },
      {
        key: 'company',
        header: 'Company',
        hideOnMobile: true,
        render: (row: AdminUserRecord) => row.companyName ?? '—',
      },
    ],
    [],
  );

  if (isLoading) return <LoadingOverlay message="Loading users..." fullScreen={false} />;

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage team members and access roles"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users' },
        ]}
        actions={
          <Button asChild>
            <Link to="/admin/users/new">
              <Plus className="h-4 w-4" />
              Add User
            </Link>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.users ?? []}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => navigate(`/admin/users/${row.id}/edit`)}
        emptyMessage="No users found"
      />
    </div>
  );
}
