import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, FileText } from 'lucide-react';
import {
  REPORT_STATUS_LABELS,
  REPORT_TYPE_LABELS,
  ReportStatus,
} from '@sitescop/shared-types';
import type { ReportSummary } from '@sitescop/shared-types';
import { downloadReport, reportsApi } from '@/lib/api/reports';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import {
  Button,
  DataTable,
  Input,
  LoadingOverlay,
  PageHeader,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/design-system/components';

const STATUS_TABS = [
  { id: 'all', label: 'All', status: '' },
  ...Object.entries(REPORT_STATUS_LABELS).map(([status, label]) => ({ id: status, label, status })),
];

function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const tone =
    status === ReportStatus.READY
      ? 'text-success'
      : status === ReportStatus.FAILED
        ? 'text-danger'
        : 'text-warning';
  return <span className={`text-sm font-medium ${tone}`}>{REPORT_STATUS_LABELS[status]}</span>;
}

export function ReportsListPage() {
  const queryClient = useQueryClient();
  const canGenerate = useAuthStore((s) => s.hasPermission('reports:generate'));
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(search);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', status, search],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (search) params.search = search;
      return reportsApi.list(params);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (inspectionId: string) => reportsApi.generate(inspectionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const columns = useMemo(
    () => [
      {
        key: 'inspection',
        header: 'Inspection',
        render: (row: ReportSummary) => (
          <Link to={`/inspections/${row.inspectionId}`} className="font-medium text-primary hover:underline">
            {row.inspectionNumber}
          </Link>
        ),
      },
      {
        key: 'type',
        header: 'Report',
        render: (row: ReportSummary) => REPORT_TYPE_LABELS[row.reportType],
      },
      {
        key: 'job',
        header: 'Job',
        hideOnMobile: true,
        render: (row: ReportSummary) => row.jobNumber,
      },
      {
        key: 'property',
        header: 'Property',
        hideOnMobile: true,
        render: (row: ReportSummary) => row.propertyAddress ?? '—',
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: ReportSummary) => <ReportStatusBadge status={row.status} />,
      },
      {
        key: 'generated',
        header: 'Generated',
        hideOnMobile: true,
        render: (row: ReportSummary) =>
          row.generatedAt ? new Date(row.generatedAt).toLocaleDateString('en-AU') : '—',
      },
      {
        key: 'actions',
        header: '',
        render: (row: ReportSummary) => (
          <div className="flex flex-wrap gap-2">
            {row.status === ReportStatus.READY && (
              <Button
                variant="secondary"
                size="sm"
                isLoading={downloadingId === row.id}
                onClick={async () => {
                  setDownloadingId(row.id);
                  try {
                    await downloadReport(row.id, row.fileName);
                  } finally {
                    setDownloadingId(null);
                  }
                }}
              >
                <Download className="mr-1 h-4 w-4" />
                Download
              </Button>
            )}
            {canGenerate && row.status === ReportStatus.FAILED && (
              <Button
                variant="secondary"
                size="sm"
                isLoading={regenerateMutation.isPending}
                onClick={() => regenerateMutation.mutate(row.inspectionId)}
              >
                Retry
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canGenerate, downloadingId, regenerateMutation.isPending],
  );

  if (isLoading) return <LoadingOverlay message="Loading reports..." fullScreen={false} />;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generated inspection PDFs — building, pest, and combined jobs"
        breadcrumbs={[{ label: 'Reports' }]}
        actions={
          <Button variant="secondary" asChild>
            <Link to="/inspections?status=COMPLETED">
              <FileText className="mr-2 h-4 w-4" />
              Completed Inspections
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          value={status || 'all'}
          onValueChange={(value) => {
            const next = new URLSearchParams(searchParams);
            if (value === 'all') next.delete('status');
            else next.set('status', value);
            setSearchParams(next);
          }}
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
          className="flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const next = new URLSearchParams(searchParams);
            if (searchInput.trim()) next.set('search', searchInput.trim());
            else next.delete('search');
            setSearchParams(next);
          }}
        >
          <Input
            placeholder="Search inspection, job..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-md flex-1"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      <DataTable
        columns={columns}
        data={data?.reports ?? []}
        keyExtractor={(row) => row.id}
        emptyMessage="No reports yet. Complete an inspection and generate PDFs from the inspection workspace."
      />
    </div>
  );
}
