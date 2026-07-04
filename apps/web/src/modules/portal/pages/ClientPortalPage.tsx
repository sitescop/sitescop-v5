import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Download, ExternalLink, Eye, FileSignature, FileText } from 'lucide-react';
import {
  AGREEMENT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  InvoiceStatus,
  formatAudCents,
} from '@sitescop/shared-types';
import type { AgreementSummary, ClientPortalReportSummary, InvoiceSummary } from '@sitescop/shared-types';
import { downloadPortalAgreement, downloadPortalInvoice, downloadPortalReport, portalApi, viewPortalAgreement, viewPortalInvoice, viewPortalReport } from '@/lib/api/portal';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import {
  Button,
  Card,
  DataTable,
  LoadingOverlay,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/design-system/components';

function PaymentBanner({
  message,
  tone,
}: {
  message: string;
  tone: 'success' | 'error' | 'info';
}) {
  const styles =
    tone === 'success'
      ? 'border-success/20 bg-success/5 text-success'
      : tone === 'error'
        ? 'border-danger/20 bg-danger/5 text-danger'
        : 'border-primary/20 bg-primary/5 text-primary';
  return (
    <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${styles}`} role="status">
      {message}
    </div>
  );
}

export function ClientPortalPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [downloadingAgreementId, setDownloadingAgreementId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(
    null,
  );

  const tab = searchParams.get('tab') ?? 'invoices';
  const payment = searchParams.get('payment');
  const sessionId = searchParams.get('session_id');

  const { data, isLoading } = useQuery({
    queryKey: ['portal'],
    queryFn: () => portalApi.get(),
  });

  useEffect(() => {
    if (payment === 'cancelled') {
      setPaymentNotice({ message: 'Payment was cancelled. You can try again when ready.', tone: 'info' });
      setSearchParams({ tab }, { replace: true });
      return;
    }
    if (payment !== 'success' || !sessionId) return;

    let cancelled = false;
    void (async () => {
      try {
        const result = await portalApi.confirmPayment({ sessionId });
        if (cancelled) return;
        setPaymentNotice({
          message: result.alreadyPaid
            ? 'This invoice was already marked as paid.'
            : 'Payment successful. Thank you — your invoice is now paid.',
          tone: 'success',
        });
        await queryClient.invalidateQueries({ queryKey: ['portal'] });
      } catch (error) {
        if (cancelled) return;
        setPaymentNotice({
          message: error instanceof Error ? error.message : 'Unable to confirm payment.',
          tone: 'error',
        });
      } finally {
        if (!cancelled) {
          setSearchParams({ tab }, { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [payment, sessionId, queryClient, setSearchParams, tab]);

  const unpaidInvoices = useMemo(
    () =>
      data?.invoices.filter(
        (invoice) => invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.OVERDUE,
      ) ?? [],
    [data?.invoices],
  );

  async function handlePay(invoice: InvoiceSummary) {
    if (!data?.stripeEnabled) return;
    setPayingId(invoice.id);
    try {
      const { url } = await portalApi.checkout(invoice.id);
      window.location.href = url;
    } catch (error) {
      setPaymentNotice({
        message: error instanceof Error ? error.message : 'Unable to start checkout.',
        tone: 'error',
      });
      setPayingId(null);
    }
  }

  async function handleViewInvoice(invoice: InvoiceSummary) {
    setViewingId(invoice.id);
    try {
      await viewPortalInvoice(invoice.id, `${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      setPaymentNotice({
        message: error instanceof Error ? error.message : 'Unable to open invoice.',
        tone: 'error',
      });
    } finally {
      setViewingId(null);
    }
  }

  async function handleViewAgreement(agreement: AgreementSummary) {
    setViewingId(agreement.id);
    try {
      await viewPortalAgreement(agreement.id, `${agreement.agreementNumber}.pdf`);
    } catch (error) {
      setPaymentNotice({
        message: error instanceof Error ? error.message : 'Unable to open agreement.',
        tone: 'error',
      });
    } finally {
      setViewingId(null);
    }
  }

  async function handleViewReport(report: ClientPortalReportSummary) {
    setViewingId(report.id);
    try {
      await viewPortalReport(report.id, report.fileName);
    } catch (error) {
      setPaymentNotice({
        message: error instanceof Error ? error.message : 'Unable to open report.',
        tone: 'error',
      });
    } finally {
      setViewingId(null);
    }
  }

  async function handleDownloadAgreement(agreement: AgreementSummary) {
    setDownloadingAgreementId(agreement.id);
    try {
      await downloadPortalAgreement(agreement.id, `${agreement.agreementNumber}.pdf`);
    } catch (error) {
      setPaymentNotice({
        message: error instanceof Error ? error.message : 'Agreement download failed.',
        tone: 'error',
      });
    } finally {
      setDownloadingAgreementId(null);
    }
  }

  async function handleDownloadInvoice(invoice: InvoiceSummary) {
    setDownloadingInvoiceId(invoice.id);
    try {
      await downloadPortalInvoice(invoice.id, `${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      setPaymentNotice({
        message: error instanceof Error ? error.message : 'Invoice download failed.',
        tone: 'error',
      });
    } finally {
      setDownloadingInvoiceId(null);
    }
  }

  function openTab(nextTab: string) {
    setSearchParams({ tab: nextTab });
  }

  function stopRowClick(event: MouseEvent) {
    event.stopPropagation();
  }

  async function handleDownload(report: ClientPortalReportSummary) {
    setDownloadingId(report.id);
    try {
      await downloadPortalReport(report.id, report.fileName);
    } catch (error) {
      setPaymentNotice({
        message: error instanceof Error ? error.message : 'Download failed.',
        tone: 'error',
      });
    } finally {
      setDownloadingId(null);
    }
  }

  const agreementColumns = useMemo(
    () => [
      {
        key: 'number',
        header: 'Agreement',
        render: (row: AgreementSummary) => (
          <span className="font-medium text-text">{row.agreementNumber}</span>
        ),
      },
      {
        key: 'property',
        header: 'Property',
        hideOnMobile: true,
        render: (row: AgreementSummary) => row.propertyAddress,
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: AgreementSummary) => AGREEMENT_STATUS_LABELS[row.status],
      },
      {
        key: 'total',
        header: 'Total',
        render: (row: AgreementSummary) => formatAudCents(row.totalCents),
      },
      {
        key: 'actions',
        header: '',
        render: (row: AgreementSummary) => (
          <div className="flex flex-wrap items-center gap-2" onClick={stopRowClick}>
            <Button
              size="sm"
              variant="primary"
              isLoading={viewingId === row.id}
              onClick={() => void handleViewAgreement(row)}
            >
              <Eye className="mr-1.5 h-4 w-4" />
              View
            </Button>
            <Button
              size="sm"
              variant="secondary"
              isLoading={downloadingAgreementId === row.id}
              onClick={() => void handleDownloadAgreement(row)}
            >
              <Download className="mr-1.5 h-4 w-4" />
              PDF
            </Button>
          </div>
        ),
      },
    ],
    [viewingId, downloadingAgreementId],
  );

  const invoiceColumns = useMemo(
    () => [
      {
        key: 'number',
        header: 'Invoice',
        render: (row: InvoiceSummary) => (
          <span className="font-medium text-text">{row.invoiceNumber}</span>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        hideOnMobile: true,
        render: (row: InvoiceSummary) => row.description,
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: InvoiceSummary) => INVOICE_STATUS_LABELS[row.status],
      },
      {
        key: 'total',
        header: 'Amount',
        render: (row: InvoiceSummary) => formatAudCents(row.totalCents),
      },
      {
        key: 'actions',
        header: '',
        render: (row: InvoiceSummary) => (
          <div className="flex flex-wrap items-center gap-2" onClick={stopRowClick}>
            <Button
              size="sm"
              variant="primary"
              isLoading={viewingId === row.id}
              onClick={() => void handleViewInvoice(row)}
            >
              <Eye className="mr-1.5 h-4 w-4" />
              View
            </Button>
            <Button
              size="sm"
              variant="ghost"
              isLoading={downloadingInvoiceId === row.id}
              onClick={() => void handleDownloadInvoice(row)}
            >
              <Download className="mr-1.5 h-4 w-4" />
              PDF
            </Button>
            {data?.stripeEnabled &&
              (row.status === InvoiceStatus.SENT || row.status === InvoiceStatus.OVERDUE) && (
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={payingId === row.id}
                  onClick={() => void handlePay(row)}
                >
                  <CreditCard className="mr-1.5 h-4 w-4" />
                  Pay
                </Button>
              )}
          </div>
        ),
      },
    ],
    [data?.stripeEnabled, payingId, downloadingInvoiceId, viewingId],
  );

  const reportColumns = useMemo(
    () => [
      {
        key: 'job',
        header: 'Job',
        render: (row: ClientPortalReportSummary) => row.jobNumber,
      },
      {
        key: 'property',
        header: 'Property',
        hideOnMobile: true,
        render: (row: ClientPortalReportSummary) => row.propertyAddress ?? '—',
      },
      {
        key: 'type',
        header: 'Report',
        render: (row: ClientPortalReportSummary) => row.reportType.replace(/_/g, ' '),
      },
      {
        key: 'actions',
        header: '',
        render: (row: ClientPortalReportSummary) => (
          <div className="flex flex-wrap items-center gap-2" onClick={stopRowClick}>
            <Button
              size="sm"
              variant="primary"
              isLoading={viewingId === row.id}
              onClick={() => void handleViewReport(row)}
            >
              <Eye className="mr-1.5 h-4 w-4" />
              View
            </Button>
            <Button
              size="sm"
              variant="secondary"
              isLoading={downloadingId === row.id}
              onClick={() => void handleDownload(row)}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Download
            </Button>
          </div>
        ),
      },
    ],
    [downloadingId, viewingId],
  );

  if (isLoading) {
    return <LoadingOverlay message="Loading your portal..." />;
  }

  const greeting = user?.firstName ? `Welcome, ${user.firstName}` : 'Welcome';

  return (
    <div>
      <PageHeader
        title="My Portal"
        description={`${greeting} — view agreements, pay invoices, and download inspection reports.`}
      />

      {paymentNotice && <PaymentBanner message={paymentNotice.message} tone={paymentNotice.tone} />}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => openTab('agreements')}
          className="rounded-xl border border-border bg-surface p-4 text-left shadow-card transition hover:border-primary/40 hover:bg-background"
        >
          <div className="flex items-center gap-3">
            <FileSignature className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-text">{data?.agreements.length ?? 0}</p>
              <p className="text-sm text-text-light">Agreements — click to view</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => openTab('invoices')}
          className="rounded-xl border border-border bg-surface p-4 text-left shadow-card transition hover:border-primary/40 hover:bg-background"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold text-text">{unpaidInvoices.length}</p>
              <p className="text-sm text-text-light">Outstanding invoices — click to view</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => openTab('reports')}
          className="rounded-xl border border-border bg-surface p-4 text-left shadow-card transition hover:border-primary/40 hover:bg-background"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-success" />
            <div>
              <p className="text-2xl font-bold text-text">{data?.reports.length ?? 0}</p>
              <p className="text-sm text-text-light">Reports ready — click to view</p>
            </div>
          </div>
        </button>
      </div>

      {!data?.stripeEnabled && unpaidInvoices.length > 0 && (
        <PaymentBanner
          message="Online card payment is not configured. Please pay outstanding invoices by bank transfer using the details on your invoice email."
          tone="info"
        />
      )}

      <Tabs
        value={tab}
        onValueChange={(value) => setSearchParams({ tab: value })}
      >
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <DataTable
            columns={invoiceColumns}
            data={data?.invoices ?? []}
            keyExtractor={(row) => row.id}
            emptyMessage="No invoices yet."
            onRowClick={(row) => void handleViewInvoice(row)}
          />
        </TabsContent>

        <TabsContent value="agreements" className="mt-4">
          <DataTable
            columns={agreementColumns}
            data={data?.agreements ?? []}
            keyExtractor={(row) => row.id}
            emptyMessage="No agreements yet."
            onRowClick={(row) => void handleViewAgreement(row)}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          {data?.reports.length ? (
            <DataTable
              columns={reportColumns}
              data={data.reports}
              keyExtractor={(row) => row.id}
              emptyMessage="No reports yet."
              onRowClick={(row) => void handleViewReport(row)}
            />
          ) : (
            <Card className="p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-text-muted" />
              <p className="mt-3 text-text-light">
                Reports appear here once your inspection is complete and the report has been generated.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {data?.agreements.some((a) => a.status === 'SENT') && (
        <p className="mt-6 text-sm text-text-muted">
          Need to sign an agreement? Check your email for a secure signing link, or contact the office for assistance.
          <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
        </p>
      )}
    </div>
  );
}
