import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AgreementStatus,
  INVOICE_STATUS_LABELS,
  InvoiceStatus,
  JOB_STATUS_LABELS,
  JobStatus,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
} from '@sitescop/shared-types';
import type { JobBillingStatus, JobDetail } from '@sitescop/shared-types';
import type { InspectionDetail } from '@sitescop/shared-types';
import { jobsApi } from '@/lib/api/jobs';
import { invoicesApi } from '@/lib/api/invoices';
import { Button, Modal, Select } from '@/design-system/components';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface JobWorkflowPanelProps {
  job: JobDetail;
  billing: JobBillingStatus;
  inspection: InspectionDetail | null | undefined;
  canSendAgreement: boolean;
  canManageBilling: boolean;
  canAssign: boolean;
  canManageInspection: boolean;
  canComplete: boolean;
  isAssignedInspector: boolean;
  onRefresh: () => void;
  onAssignClick: () => void;
  onStartInspection: () => void;
  onCompleteJob: () => void;
  onAcceptJob: () => void;
  onDeclineJob: () => void;
  isStartingInspection: boolean;
  isCompleting: boolean;
  isAccepting: boolean;
}

type StepState = 'done' | 'current' | 'upcoming';

function stepState(done: boolean, isCurrent: boolean): StepState {
  if (done) return 'done';
  if (isCurrent) return 'current';
  return 'upcoming';
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') return <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />;
  if (state === 'current') return <Circle className="h-5 w-5 shrink-0 fill-primary text-primary" />;
  return <Circle className="h-5 w-5 shrink-0 text-border" />;
}

export function JobWorkflowPanel({
  job,
  billing,
  inspection,
  canSendAgreement,
  canManageBilling,
  canAssign,
  canManageInspection,
  canComplete,
  isAssignedInspector,
  onRefresh,
  onAssignClick,
  onStartInspection,
  onCompleteJob,
  onAcceptJob,
  onDeclineJob,
  isStartingInspection,
  isCompleting,
  isAccepting,
}: JobWorkflowPanelProps) {
  const [payOpen, setPayOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [paymentReference, setPaymentReference] = useState('');
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const agreement = billing.activeAgreement;
  const invoice = billing.activeInvoice;
  const invoiceId = billing.pendingInvoiceId ?? billing.paidInvoiceId;

  const agreementDone = billing.agreementSigned;
  const paymentDone = billing.invoicePaid;
  const assignDone = Boolean(job.assignedInspector);
  const inspectDone = job.status === JobStatus.COMPLETED;
  const inspectionStarted = Boolean(inspection) || job.status === JobStatus.IN_PROGRESS;

  const sendAgreementMutation = useMutation({
    mutationFn: () => jobsApi.sendAgreement(job.id),
    onSuccess: (result) => {
      setMessage(
        result.emailSent
          ? `Agreement emailed to ${job.clientContact?.email ?? 'client'}.`
          : 'Agreement prepared — email could not be sent. Check SMTP settings.',
      );
      if (result.signingUrl) setSigningUrl(result.signingUrl);
      onRefresh();
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: () => invoicesApi.send(invoiceId!),
    onSuccess: () => {
      setMessage('Invoice emailed to client.');
      onRefresh();
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: () =>
      invoicesApi.markPaid(invoiceId!, {
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
      }),
    onSuccess: () => {
      setPayOpen(false);
      setMessage('Payment recorded. You can now assign an inspector.');
      onRefresh();
    },
  });

  const steps = [
    {
      id: 'agreement',
      title: 'Client agreement',
      description: agreementDone
        ? `Signed — ${billing.signedAgreementNumber}`
        : agreement?.status === AgreementStatus.SENT || agreement?.status === AgreementStatus.VIEWED
          ? `Awaiting signature — ${agreement.agreementNumber}`
          : 'Email the inspection agreement for the client to sign online.',
      state: stepState(agreementDone, !agreementDone),
    },
    {
      id: 'payment',
      title: 'Payment',
      description: paymentDone
        ? `Received — ${billing.paidInvoiceNumber}`
        : agreementDone
          ? invoice
            ? `${INVOICE_STATUS_LABELS[invoice.status]} — ${invoice.invoiceNumber}`
            : 'Invoice will be created when the agreement is signed.'
          : 'Complete after the agreement is signed.',
      state: stepState(paymentDone, agreementDone && !paymentDone),
    },
    {
      id: 'assign',
      title: 'Assign inspector',
      description: assignDone
        ? job.assignedInspector?.displayName ?? 'Assigned'
        : billing.readyForInspection
          ? 'Choose who will perform the inspection.'
          : 'Available after agreement signed and payment received.',
      state: stepState(assignDone, billing.readyForInspection && !assignDone),
    },
    {
      id: 'inspect',
      title: 'Inspection',
      description: inspectDone
        ? 'Inspection complete'
        : inspectionStarted
          ? 'Continue the on-site inspection form.'
          : job.status === JobStatus.ASSIGNED
            ? 'Inspector must accept the job first.'
            : 'Start the inspection when the inspector is ready.',
      state: stepState(
        inspectDone,
        assignDone && !inspectionStarted && !inspectDone,
      ),
    },
    {
      id: 'complete',
      title: 'Job complete',
      description: inspectDone ? JOB_STATUS_LABELS[job.status] : 'Mark complete when the report is finished.',
      state: stepState(inspectDone, inspectionStarted && !inspectDone),
    },
  ];

  return (
    <div className="rounded-sm border border-border bg-surface p-5">
      <h3 className="mb-1 text-lg font-semibold text-text">Job workflow</h3>
      <p className="mb-5 text-sm text-text-light">
        Follow these steps in order — each step unlocks the next.
      </p>

      {message && (
        <div className="mb-4 rounded-sm border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-text">
          {message}
          {signingUrl && (
            <p className="mt-1 break-all text-xs text-text-muted">
              Dev signing link: {signingUrl}
            </p>
          )}
        </div>
      )}

      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StepIcon state={step.state} />
              {index < steps.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <p className={`font-medium ${step.state === 'current' ? 'text-primary' : 'text-text'}`}>
                {index + 1}. {step.title}
              </p>
              <p className="mt-0.5 text-sm text-text-muted">{step.description}</p>

              {step.id === 'agreement' && step.state !== 'upcoming' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {canSendAgreement && !agreementDone && (
                    <Button
                      size="sm"
                      onClick={() => sendAgreementMutation.mutate()}
                      isLoading={sendAgreementMutation.isPending}
                    >
                      {agreement ? 'Resend Agreement' : 'Send Agreement to Client'}
                    </Button>
                  )}
                  {agreement && (
                    <Button size="sm" variant="secondary" asChild>
                      <Link to={`/agreements/${agreement.id}`}>View Agreement</Link>
                    </Button>
                  )}
                </div>
              )}

              {step.id === 'payment' && agreementDone && !paymentDone && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {canManageBilling && invoiceId && invoice?.status !== InvoiceStatus.PAID && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => sendInvoiceMutation.mutate()}
                        isLoading={sendInvoiceMutation.isPending}
                      >
                        Email Invoice
                      </Button>
                      <Button size="sm" variant="accent" onClick={() => setPayOpen(true)}>
                        Mark as Paid
                      </Button>
                    </>
                  )}
                  {invoiceId && (
                    <Button size="sm" variant="secondary" asChild>
                      <Link to={`/accounts/${invoiceId}`}>View Invoice</Link>
                    </Button>
                  )}
                </div>
              )}

              {step.id === 'assign' && billing.readyForInspection && !assignDone && canAssign && (
                <div className="mt-2">
                  <Button size="sm" onClick={onAssignClick}>
                    Assign Inspector
                  </Button>
                </div>
              )}

              {step.id === 'inspect' && isAssignedInspector && job.status === JobStatus.ASSIGNED && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" onClick={onAcceptJob} isLoading={isAccepting}>
                    Accept Job
                  </Button>
                  <Button size="sm" variant="secondary" onClick={onDeclineJob}>
                    Decline
                  </Button>
                </div>
              )}

              {step.id === 'inspect' &&
                canManageInspection &&
                billing.readyForInspection &&
                [JobStatus.ACCEPTED, JobStatus.IN_PROGRESS].includes(job.status) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {inspection ? (
                      <Button size="sm" variant="accent" asChild>
                        <Link to={`/inspections/${inspection.id}`}>
                          {inspection.status === 'COMPLETED' ? 'Open Report' : 'Continue Inspection'}
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" onClick={onStartInspection} isLoading={isStartingInspection}>
                        Start Inspection
                      </Button>
                    )}
                  </div>
                )}

              {step.id === 'complete' &&
                canComplete &&
                isAssignedInspector &&
                [JobStatus.ACCEPTED, JobStatus.IN_PROGRESS].includes(job.status) && (
                  <div className="mt-2">
                    <Button size="sm" variant="accent" onClick={onCompleteJob} isLoading={isCompleting}>
                      Mark Job Complete
                    </Button>
                  </div>
                )}
            </div>
          </li>
        ))}
      </ol>

      {(sendAgreementMutation.isPending || sendInvoiceMutation.isPending || markPaidMutation.isPending) && (
        <p className="mt-3 flex items-center gap-2 text-sm text-text-light">
          <Loader2 className="h-4 w-4 animate-spin" />
          Working…
        </p>
      )}

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record Payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => markPaidMutation.mutate()} isLoading={markPaidMutation.isPending}>
              Confirm Payment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Payment method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-text">Reference (optional)</span>
            <input
              className="form-input w-full"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Bank transfer reference"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
