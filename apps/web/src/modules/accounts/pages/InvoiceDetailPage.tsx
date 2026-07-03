import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Download, Send } from 'lucide-react';
import {
  INVOICE_STATUS_LABELS,
  InvoiceStatus,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  formatAudCents,
} from '@sitescop/shared-types';
import { downloadInvoice, invoicesApi } from '@/lib/api/invoices';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import {
  Badge,
  Button,
  Card,
  LoadingOverlay,
  Modal,
  PageHeader,
  Select,
} from '@/design-system/components';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const canManage = useAuthStore((s) => s.hasPermission('billing:manage'));
  const [payOpen, setPayOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [paymentReference, setPaymentReference] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.get(id!),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    void queryClient.invalidateQueries({ queryKey: ['invoices'] });
    void queryClient.invalidateQueries({ queryKey: ['job'] });
  };

  const sendMutation = useMutation({
    mutationFn: () => invoicesApi.send(id!),
    onSuccess: invalidate,
  });

  const payMutation = useMutation({
    mutationFn: () =>
      invoicesApi.markPaid(id!, {
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
      }),
    onSuccess: () => {
      setPayOpen(false);
      invalidate();
    },
  });

  const voidMutation = useMutation({
    mutationFn: () => invoicesApi.void(id!),
    onSuccess: invalidate,
  });

  if (isLoading) return <LoadingOverlay message="Loading invoice..." fullScreen={false} />;
  if (error || !data) {
    return (
      <Card className="p-6">
        <p className="text-danger">Invoice not found.</p>
        <Button className="mt-4" variant="secondary" asChild>
          <Link to="/accounts">Back to Accounts</Link>
        </Button>
      </Card>
    );
  }

  const invoice = data.invoice;
  const canSend = canManage && [InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.OVERDUE].includes(invoice.status);
  const canMarkPaid = canManage && invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.VOID;
  const canVoid = canManage && invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.VOID;

  return (
    <div>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`${invoice.clientName} — ${formatAudCents(invoice.totalCents)}`}
        breadcrumbs={[
          { label: 'Accounts', href: '/accounts' },
          { label: invoice.invoiceNumber },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => void downloadInvoice(invoice.id, `${invoice.invoiceNumber}.pdf`)}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            {canSend && (
              <Button onClick={() => sendMutation.mutate()} isLoading={sendMutation.isPending}>
                <Send className="h-4 w-4" />
                {invoice.status === InvoiceStatus.DRAFT ? 'Send to Client' : 'Resend Invoice'}
              </Button>
            )}
            {canMarkPaid && (
              <Button variant="accent" onClick={() => setPayOpen(true)}>
                Mark as Paid
              </Button>
            )}
            {canVoid && (
              <Button variant="danger" onClick={() => voidMutation.mutate()} isLoading={voidMutation.isPending}>
                Void
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6">
        <Badge variant={invoice.status === InvoiceStatus.PAID ? 'success' : 'default'}>
          {INVOICE_STATUS_LABELS[invoice.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="space-y-4 p-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-text-light">Client</h3>
              <p className="text-text">{invoice.clientName}</p>
              <p className="text-sm text-text-light">{invoice.clientEmail}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Description</h3>
              <p className="text-text">{invoice.description}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Property</h3>
              <p className="text-text">{invoice.propertyAddress ?? '—'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Job</h3>
              {invoice.jobId ? (
                <Link to={`/jobs/${invoice.jobId}`} className="text-primary hover:underline">
                  {invoice.jobNumber}
                </Link>
              ) : (
                <p className="text-text">—</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Subtotal (ex GST)</h3>
              <p className="text-text">{formatAudCents(invoice.subtotalCents)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">GST</h3>
              <p className="text-text">{formatAudCents(invoice.gstCents)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Total (inc GST)</h3>
              <p className="text-lg font-semibold text-text">{formatAudCents(invoice.totalCents)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Issue date</h3>
              <p className="text-text">{new Date(invoice.issueDate).toLocaleDateString('en-AU')}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Due date</h3>
              <p className="text-text">
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-AU') : '—'}
              </p>
            </div>
          </div>
          {invoice.notes && (
            <div>
              <h3 className="text-sm font-medium text-text-light">Notes</h3>
              <p className="whitespace-pre-wrap text-text">{invoice.notes}</p>
            </div>
          )}
        </Card>

        <Card className="space-y-3 p-6">
          <h3 className="font-semibold text-text">Payment</h3>
          {invoice.paidAt ? (
            <>
              <p className="text-sm text-text">
                Paid on {new Date(invoice.paidAt).toLocaleDateString('en-AU')}
              </p>
              {invoice.paymentMethod && (
                <p className="text-sm text-text-light">
                  Method: {PAYMENT_METHOD_LABELS[invoice.paymentMethod]}
                </p>
              )}
              {invoice.paymentReference && (
                <p className="text-sm text-text-light">Reference: {invoice.paymentReference}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-text-light">Payment not yet received.</p>
          )}
          {invoice.agreementId && (
            <Button variant="secondary" className="w-full" asChild>
              <Link to={`/agreements/${invoice.agreementId}`}>View Agreement</Link>
            </Button>
          )}
        </Card>
      </div>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record Payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => payMutation.mutate()} isLoading={payMutation.isPending}>
              Confirm Payment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Payment method"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-text">Payment reference</span>
            <input
              className="form-input w-full"
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              placeholder="e.g. bank transfer reference"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
