import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import { UserRole } from '@sitescop/shared-types';
import {
  Button,
  Card,
  DataTable,
  Input,
  LoadingOverlay,
  Modal,
  PageHeader,
} from '@/design-system/components';

export function CompaniesPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: adminApi.listCompanies,
    enabled: isSuperAdmin,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createCompany({ name, slug, email: email || undefined }),
    onSuccess: () => {
      setOpen(false);
      setName('');
      setSlug('');
      setEmail('');
      void queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
    },
  });

  if (!isSuperAdmin) {
    return (
      <Card className="p-6">
        <p className="text-text-light">Company management is available to Super Admin only.</p>
      </Card>
    );
  }

  if (isLoading) return <LoadingOverlay message="Loading companies..." fullScreen={false} />;

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Manage tenant companies on the platform"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Companies' },
        ]}
        actions={<Button onClick={() => setOpen(true)}>Add Company</Button>}
      />

      <DataTable
        columns={[
          { key: 'name', header: 'Name', render: (row) => row.name },
          { key: 'slug', header: 'Slug', render: (row) => row.slug },
          { key: 'users', header: 'Users', render: (row) => row.userCount },
          { key: 'jobs', header: 'Jobs', render: (row) => row.jobCount },
        ]}
        data={data?.companies ?? []}
        keyExtractor={(row) => row.id}
        emptyMessage="No companies yet"
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create Company"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} isLoading={createMutation.isPending}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Company Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-company" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
