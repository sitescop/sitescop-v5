import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { INSPECTION_STATUS_LABELS, JOB_TYPE_LABELS, type InspectionSummary } from '@sitescop/shared-types';
import { inspectionsApi } from '@/lib/api/inspections';
import {
  Button,
  DataTable,
  Input,
  InspectionStatusBadge,
  LoadingOverlay,
  PageHeader,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/design-system/components';

const STATUS_TABS = [
  { id: 'all', label: 'All', status: '' },
  ...Object.entries(INSPECTION_STATUS_LABELS).map(([status, label]) => ({ id: status, label, status })),
];

export function InspectionsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(search);

  const { data, isLoading } = useQuery({
    queryKey: ['inspections', status, search],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (search) params.search = search;
      return inspectionsApi.list(params);
    },
  });

  const columns = useMemo(
    () => [
      {
        key: 'number',
        header: 'Inspection #',
        render: (row: InspectionSummary) => (
          <span className="font-medium text-primary">{row.inspectionNumber}</span>
        ),
      },
      {
        key: 'job',
        header: 'Job',
        render: (row: InspectionSummary) => row.jobNumber,
      },
      {
        key: 'client',
        header: 'Client',
        hideOnMobile: true,
        render: (row: InspectionSummary) => (
          <div>
            <p className="font-medium text-text">{row.clientName ?? '—'}</p>
            {row.clientPhone && (
              <p className="text-sm font-medium text-primary">{row.clientPhone}</p>
            )}
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (row: InspectionSummary) => (
          <span className="font-bold uppercase text-danger">{JOB_TYPE_LABELS[row.jobType]}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: InspectionSummary) => <InspectionStatusBadge status={row.status} />,
      },
      {
        key: 'progress',
        header: 'Progress',
        render: (row: InspectionSummary) => `${row.progressPercent}%`,
      },
      {
        key: 'inspector',
        header: 'Inspector',
        hideOnMobile: true,
        render: (row: InspectionSummary) => row.inspectorName ?? '—',
      },
    ],
    [],
  );

  if (isLoading) return <LoadingOverlay message="Loading inspections..." fullScreen={false} />;

  return (
    <div>
      <PageHeader
        title="Inspections"
        description="Conduct building inspections and capture field data"
        breadcrumbs={[{ label: 'Inspections' }]}
        actions={
          <Button variant="secondary" asChild>
            <Link to="/jobs">Open from Jobs</Link>
          </Button>
        }
      />

      <Tabs
        value={status || 'all'}
        onValueChange={(value) => {
          const next = new URLSearchParams(searchParams);
          if (value === 'all') next.delete('status');
          else next.set('status', value);
          setSearchParams(next);
        }}
        className="mb-4"
      >
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const next = new URLSearchParams(searchParams);
          if (searchInput) next.set('search', searchInput);
          else next.delete('search');
          setSearchParams(next);
        }}
      >
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search inspections..."
          className="max-w-md flex-1"
        />
        <Button type="submit" variant="secondary">
          <Search className="mr-1 h-4 w-4" />
          Search
        </Button>
      </form>

      <DataTable
        columns={columns}
        data={data?.inspections ?? []}
        keyExtractor={(row) => row.id}
        emptyMessage="No inspections found. Start one from an accepted job."
        onRowClick={(row) => navigate(`/inspections/${row.id}`)}
      />
    </div>
  );
}
