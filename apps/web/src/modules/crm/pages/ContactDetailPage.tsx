import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { CONTACT_TYPE_LABELS } from '@sitescop/shared-types';
import { crmApi } from '@/lib/api/crm';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import {
  Badge,
  Button,
  Card,
  DataTable,
  JobStatusBadge,
  LoadingOverlay,
  PageHeader,
} from '@/design-system/components';
import { JobStatus } from '@sitescop/shared-types';

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const canManage = useAuthStore((s) => s.hasPermission('crm:manage'));

  const { data, isLoading, error } = useQuery({
    queryKey: ['crm-contact', id],
    queryFn: () => crmApi.get(id!),
    enabled: Boolean(id),
  });

  if (isLoading) return <LoadingOverlay message="Loading contact..." fullScreen={false} />;
  if (error || !data) {
    return (
      <Card className="p-6">
        <p className="text-danger">Contact not found.</p>
        <Button className="mt-4" variant="secondary" asChild>
          <Link to="/crm">Back to CRM</Link>
        </Button>
      </Card>
    );
  }

  const contact = data.contact;

  return (
    <div>
      <PageHeader
        title={contact.displayName}
        description={CONTACT_TYPE_LABELS[contact.type]}
        breadcrumbs={[
          { label: 'CRM', href: '/crm' },
          { label: contact.displayName },
        ]}
        actions={
          canManage ? (
            <Button variant="secondary" asChild>
              <Link to={`/crm/${contact.id}/edit`}>Edit Contact</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 flex gap-2">
        <Badge variant="primary">{CONTACT_TYPE_LABELS[contact.type]}</Badge>
        <Badge variant={contact.status === 'ACTIVE' ? 'success' : 'default'}>{contact.status}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="space-y-4 p-6 lg:col-span-1">
          <div>
            <h3 className="text-sm font-medium text-text-light">Email</h3>
            <p className="text-text">{contact.email ?? '—'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-light">Phone</h3>
            <p className="text-text">{contact.phone ?? '—'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-light">Company</h3>
            <p className="text-text">{contact.companyName ?? '—'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-light">ABN</h3>
            <p className="text-text">{contact.abn ?? '—'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-light">Address</h3>
            <p className="text-text">{contact.address ?? '—'}</p>
          </div>
          {contact.notes && (
            <div>
              <h3 className="text-sm font-medium text-text-light">Notes</h3>
              <p className="whitespace-pre-wrap text-text">{contact.notes}</p>
            </div>
          )}
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-text">Job History</h3>
          <DataTable
            columns={[
              {
                key: 'jobNumber',
                header: 'Job #',
                render: (row) => (
                  <Link className="font-medium text-primary hover:underline" to={`/jobs/${row.id}`}>
                    {row.jobNumber}
                  </Link>
                ),
              },
              { key: 'title', header: 'Title', render: (row) => row.title },
              {
                key: 'status',
                header: 'Status',
                render: (row) => <JobStatusBadge status={row.status as JobStatus} />,
              },
              {
                key: 'date',
                header: 'Created',
                hideOnMobile: true,
                render: (row) => new Date(row.createdAt).toLocaleDateString('en-AU'),
              },
            ]}
            data={contact.jobs}
            keyExtractor={(row) => row.id}
            emptyMessage="No jobs linked to this contact yet"
          />
        </Card>
      </div>
    </div>
  );
}
