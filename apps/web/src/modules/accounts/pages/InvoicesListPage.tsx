import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import {
  INVOICE_STATUS_LABELS,
  InvoiceStatus,
  formatAudCents,
} from '@sitescop/shared-types';
import type { InvoiceSummary } from '@sitescop/shared-types';
import { downloadInvoice, invoicesApi } from '@/lib/api/invoices';
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
  ...Object.entries(INVOICE_STATUS_LABELS).map(([status, label]) => ({ id: status, label, status })),
];

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const tone =
    status === InvoiceStatus.PAID
      ? 'text-success'
      : status === InvoiceStatus.OVERDUE || status === InvoiceStatus.VOID
        ? 'text-danger'
        : status === InvoiceStatus.SENT
          ? 'text-primary'
          : 'text-text-light';
  return <span className={`text-sm font-medium ${tone}`}>{INVOICE_STATUS_LABELS[status]}</span>;
}

export function InvoicesListPage() {
  const canManage = useAuthStore((s) => s.hasPermission('billing:manage'));
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(search);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', status, search],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (search) params.search = search;
      return invoicesApi.list(params);
    },
  });

  const columns = useMemo(
    () => [
      {
        key: 'number',
        header: 'Invoice',
        render: (row: InvoiceSummary) => (
          <Link to={`/accounts/${row.id}`} className="font-medium text-primary hover:underline">
            {row.invoiceNumber}
          </Link>
        ),
      },
      {
        key: 'client',
        header: 'Client',
        render: (row: InvoiceSummary) => row.clientName,
      },
      {
        key: 'job',
        header: 'Job',
        hideOnMobile: true,
        render: (row: InvoiceSummary) =>
          row.jobId ? (
            <Link to={`/jobs/${row.jobId}`} className="text-primary hover:underline">
              {row.jobNumber}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        key: 'amount',
        header: 'Total',
        render: (row: InvoiceSummary) => formatAudCents(row.totalCents),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: InvoiceSummary) => <InvoiceStatusBadge status={row.status} />,
      },
      {
        key: 'issueDate',
        header: 'Issued',
        hideOnMobile: true,
        render: (row: InvoiceSummary) => new Date(row.issueDate).toLocaleDateString('en-AU'),
      },
      {
        key: 'actions',
        header: '',
        render: (row: InvoiceSummary) => (
          <Button
            variant="ghost"
            size="sm"
            isLoading={downloadingId === row.id}
            onClick={async () => {
              setDownloadingId(row.id);
              try {
                await downloadInvoice(row.id, `${row.invoiceNumber}.pdf`);
              } finally {
                setDownloadingId(null);
              }
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [downloadingId],
  );

  if (isLoading) return <LoadingOverlay message="Loading invoices..." fullScreen={false} />;

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Invoices and payment tracking"
        breadcrumbs={[{ label: 'Accounts' }]}
      />

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const next = new URLSearchParams(searchParams);
            if (searchInput.trim()) next.set('search', searchInput.trim());
            else next.delete('search');
            setSearchParams(next);
          }}
        >
          <Input
            placeholder="Search invoices..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            aria-label="Search invoices"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      <DataTable
        columns={columns}
        data={data?.invoices ?? []}
        keyExtractor={(row) => row.id}
        emptyMessage={
          canManage
            ? 'No invoices yet. Invoices are created automatically when clients sign agreements.'
            : 'No invoices found.'
        }
      />
    </div>
  );
}
