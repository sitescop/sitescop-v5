import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { CONTACT_TYPE_LABELS } from '@sitescop/shared-types';
import { crmApi } from '@/lib/api/crm';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import {
  Badge,
  Button,
  DataTable,
  Input,
  LoadingOverlay,
  PageHeader,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/design-system/components';
import type { ContactRecord } from '@sitescop/shared-types';

const TYPE_TABS = [
  { id: 'all', label: 'All', type: '' },
  ...Object.entries(CONTACT_TYPE_LABELS).map(([type, label]) => ({ id: type, label, type })),
];

export function ContactsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = useAuthStore((s) => s.hasPermission('crm:manage'));
  const type = searchParams.get('type') ?? '';
  const search = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(search);

  const { data, isLoading } = useQuery({
    queryKey: ['crm-contacts', type, search],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (type) params.type = type;
      if (search) params.search = search;
      return crmApi.list(params);
    },
  });

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (row: ContactRecord) => (
          <span className="font-medium">{row.displayName}</span>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (row: ContactRecord) => (
          <Badge variant="primary">{CONTACT_TYPE_LABELS[row.type]}</Badge>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        hideOnMobile: true,
        render: (row: ContactRecord) => row.email ?? '—',
      },
      {
        key: 'phone',
        header: 'Phone',
        hideOnMobile: true,
        render: (row: ContactRecord) => row.phone ?? '—',
      },
      {
        key: 'jobs',
        header: 'Jobs',
        render: (row: ContactRecord) => row.jobCount,
      },
    ],
    [],
  );

  if (isLoading) return <LoadingOverlay message="Loading contacts..." fullScreen={false} />;

  return (
    <div>
      <PageHeader
        title="CRM"
        description="Clients, agents, builders, and property managers"
        breadcrumbs={[{ label: 'CRM' }]}
        actions={
          canManage ? (
            <Button asChild>
              <Link to="/crm/new">
                <Plus className="h-4 w-4" />
                Add Contact
              </Link>
            </Button>
          ) : undefined
        }
        tabs={
          <Tabs
            value={type || 'all'}
            onValueChange={(v) => {
              const next = new URLSearchParams(searchParams);
              if (v === 'all') next.delete('type');
              else next.set('type', v);
              setSearchParams(next);
            }}
          >
            <TabsList className="flex-wrap">
              {TYPE_TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.type || 'all'}>
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
          placeholder="Search contacts..."
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
        data={data?.contacts ?? []}
        keyExtractor={(row) => row.id}
        emptyMessage="No contacts found"
        onRowClick={(row) => navigate(`/crm/${row.id}`)}
      />
    </div>
  );
}
