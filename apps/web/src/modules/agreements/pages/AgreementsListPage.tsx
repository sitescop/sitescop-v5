import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { AGREEMENT_STATUS_LABELS } from '@sitescop/shared-types';
import { agreementsApi } from '@/lib/api/agreements';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import {
  AgreementStatusBadge,
  Button,
  DataTable,
  Input,
  LoadingOverlay,
  PageHeader,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/design-system/components';
import type { AgreementSummary } from '@sitescop/shared-types';

const STATUS_TABS = [
  { id: 'all', label: 'All', status: '' },
  ...Object.entries(AGREEMENT_STATUS_LABELS).map(([status, label]) => ({ id: status, label, status })),
];

export function AgreementsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canSend = useAuthStore((s) => s.hasPermission('agreements:send'));
  const canManage = useAuthStore((s) => s.hasPermission('agreements:manage'));
  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(search);

  const { data, isLoading } = useQuery({
    queryKey: ['agreements', status, search],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (search) params.search = search;
      return agreementsApi.list(params);
    },
  });

  const columns = useMemo(
    () => [
      {
        key: 'number',
        header: 'Agreement #',
        render: (row: AgreementSummary) => (
          <span className="font-medium text-primary">{row.agreementNumber}</span>
        ),
      },
      {
        key: 'client',
        header: 'Client',
        render: (row: AgreementSummary) => row.clientName,
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: AgreementSummary) => <AgreementStatusBadge status={row.status} />,
      },
      {
        key: 'property',
        header: 'Property',
        hideOnMobile: true,
        render: (row: AgreementSummary) => row.propertyAddress,
      },
      {
        key: 'job',
        header: 'Job',
        hideOnMobile: true,
        render: (row: AgreementSummary) => row.jobNumber ?? '—',
      },
      {
        key: 'total',
        header: 'Total',
        render: (row: AgreementSummary) => `$${(row.totalCents / 100).toFixed(2)}`,
      },
    ],
    [],
  );

  if (isLoading) return <LoadingOverlay message="Loading agreements..." fullScreen={false} />;

  return (
    <div>
      <PageHeader
        title="Agreements"
        description="Send and track client agreements — start here for new enquiries"
        breadcrumbs={[{ label: 'Agreements' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <Button variant="secondary" asChild>
                <Link to="/agreements/templates">Templates</Link>
              </Button>
            )}
            {canSend && (
              <Button asChild>
                <Link to="/agreements/send">
                  <Plus className="h-4 w-4" />
                  Send Agreement
                </Link>
              </Button>
            )}
          </div>
        }
        tabs={
          <Tabs
            value={status || 'all'}
            onValueChange={(v) => {
              const next = new URLSearchParams(searchParams);
              if (v === 'all') next.delete('status');
              else next.set('status', v);
              setSearchParams(next);
            }}
          >
            <TabsList className="flex-wrap">
              {STATUS_TABS.slice(0, 6).map((tab) => (
                <TabsTrigger key={tab.id} value={tab.status || 'all'}>
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
          placeholder="Search agreements..."
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
        data={data?.agreements ?? []}
        keyExtractor={(row) => row.id}
        emptyMessage="No agreements found"
        onRowClick={(row) => navigate(`/agreements/${row.id}`)}
      />
    </div>
  );
}
