import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Copy, Download, Send } from 'lucide-react';
import { AgreementStatus } from '@sitescop/shared-types';
import { agreementsApi } from '@/lib/api/agreements';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import {
  AgreementStatusBadge,
  Button,
  Card,
  LoadingOverlay,
  Modal,
  PageHeader,
} from '@/design-system/components';

export function AgreementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const sentState = location.state as {
    justSent?: boolean;
    emailSent?: boolean;
    contactCreated?: boolean;
    signingUrl?: string;
    emailError?: string;
  } | null;
  const queryClient = useQueryClient();
  const canSend = useAuthStore((s) => s.hasPermission('agreements:send'));
  const canManage = useAuthStore((s) => s.hasPermission('agreements:manage'));
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['agreement', id],
    queryFn: () => agreementsApi.get(id!),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['agreement', id] });
    void queryClient.invalidateQueries({ queryKey: ['agreements'] });
  };

  const sendMutation = useMutation({
    mutationFn: () => agreementsApi.send(id!),
    onSuccess: (result) => {
      setSigningUrl(result.devSigningUrl ?? result.signingUrl);
      setEmailSent(result.emailSent);
      setShowUrlModal(true);
      invalidate();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => agreementsApi.cancel(id!),
    onSuccess: invalidate,
  });

  useEffect(() => {
    if (sentState?.justSent && sentState.signingUrl && sentState.emailSent === false) {
      setSigningUrl(sentState.signingUrl);
      setEmailSent(false);
      setShowUrlModal(true);
    }
  }, [sentState]);

  if (isLoading) return <LoadingOverlay message="Loading agreement..." fullScreen={false} />;
  if (error || !data) {
    return (
      <Card className="p-6">
        <p className="text-danger">Agreement not found.</p>
        <Button className="mt-4" variant="secondary" asChild>
          <Link to="/agreements">Back to Agreements</Link>
        </Button>
      </Card>
    );
  }

  const agreement = data.agreement;
  const isDraft = agreement.status === AgreementStatus.DRAFT;
  const canSendNow = [AgreementStatus.DRAFT, AgreementStatus.SENT, AgreementStatus.VIEWED].includes(
    agreement.status,
  );

  return (
    <div>
      <PageHeader
        title={agreement.agreementNumber}
        description={`${agreement.clientName} — ${agreement.propertyAddress}`}
        breadcrumbs={[
          { label: 'Agreements', href: '/agreements' },
          { label: agreement.agreementNumber },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canSend && isDraft && (
              <Button variant="secondary" asChild>
                <Link to={`/agreements/${agreement.id}/edit`}>Edit</Link>
              </Button>
            )}
            {canSend && canSendNow && (
              <Button onClick={() => sendMutation.mutate()} isLoading={sendMutation.isPending}>
                <Send className="h-4 w-4" />
                {agreement.status === AgreementStatus.DRAFT ? 'Send to Client' : 'Resend'}
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => void agreementsApi.downloadPdf(agreement.id, `${agreement.agreementNumber}.pdf`)}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            {canManage && agreement.status !== AgreementStatus.SIGNED && (
              <Button
                variant="danger"
                onClick={() => cancelMutation.mutate()}
                isLoading={cancelMutation.isPending}
              >
                Cancel
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <AgreementStatusBadge status={agreement.status} />
      </div>

      {sentState?.justSent && (
        <div
          className={`mb-6 rounded-sm border px-4 py-3 text-sm text-text ${
            sentState.emailSent
              ? 'border-success/40 bg-success/10'
              : 'border-warning/40 bg-warning/10'
          }`}
        >
          <p className="font-medium">
            {sentState.emailSent ? 'Agreement emailed successfully' : 'Agreement created — email not sent yet'}
          </p>
          <p className="mt-1">
            Client saved in CRM{sentState.contactCreated ? ' (new contact)' : ''}.
          </p>
          <p className="mt-1">
            <strong>To (client):</strong> {agreement.clientEmail}
          </p>
          {!sentState.emailSent && (
            <p className="mt-2">
              {sentState.emailError ??
                'Email could not be sent. Check Settings → email / .env SMTP settings, then restart the API.'}
            </p>
          )}
        </div>
      )}

      {agreement.status === AgreementStatus.SIGNED && !agreement.jobId && (
        <div className="mb-6 rounded-sm border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-text">
          Client signed. When payment is received, go to{' '}
          <Link className="font-medium text-primary hover:underline" to="/accounts">
            Accounts
          </Link>{' '}
          and click <strong>Mark as Paid</strong> — a job will be created and assigned.
        </div>
      )}

      {agreement.status === AgreementStatus.SIGNED && agreement.jobId && (
        <div className="mb-6 rounded-sm border border-success/40 bg-success/10 px-4 py-3 text-sm text-text">
          Client signed and job{' '}
          <Link className="font-medium text-primary hover:underline" to={`/jobs/${agreement.jobId}`}>
            {agreement.jobNumber}
          </Link>{' '}
          is in your Jobs list. Record on-site payment on the job page, then start the inspection.
        </div>
      )}

      {agreement.jobId && agreement.status !== AgreementStatus.SIGNED && (
        <div className="mb-6 rounded-sm border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-text">
          Job{' '}
          <Link className="font-medium text-primary hover:underline" to={`/jobs/${agreement.jobId}`}>
            {agreement.jobNumber}
          </Link>{' '}
          is ready — open it to assign an inspector.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="space-y-4 p-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-text-light">Client</h3>
              <p className="text-text">{agreement.clientName}</p>
              <p className="text-sm text-text-light">{agreement.clientEmail}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Property</h3>
              <p className="text-text">{agreement.propertyAddress}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Pricing</h3>
              <p className="text-text">
                ${(agreement.priceCents / 100).toFixed(2)} + GST ${(agreement.gstCents / 100).toFixed(2)} ={' '}
                <strong>${(agreement.totalCents / 100).toFixed(2)}</strong>
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Linked Job</h3>
              <p className="text-text">
                {agreement.jobId ? (
                  <Link className="text-primary hover:underline" to={`/jobs/${agreement.jobId}`}>
                    {agreement.jobNumber}
                  </Link>
                ) : (
                  '—'
                )}
              </p>
            </div>
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="font-semibold text-text">Legal Documents</h3>
            {agreement.legalSections.sections.map((section) => (
              <div key={section.id}>
                <h4 className="text-sm font-medium text-primary">{section.title}</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text">{section.content}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <h3 className="font-semibold text-text">Timeline</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-text-light">Created</dt>
              <dd>{new Date(agreement.createdAt).toLocaleString('en-AU')}</dd>
            </div>
            <div>
              <dt className="text-text-light">Sent</dt>
              <dd>{agreement.sentAt ? new Date(agreement.sentAt).toLocaleString('en-AU') : '—'}</dd>
            </div>
            <div>
              <dt className="text-text-light">Viewed</dt>
              <dd>{agreement.viewedAt ? new Date(agreement.viewedAt).toLocaleString('en-AU') : '—'}</dd>
            </div>
            <div>
              <dt className="text-text-light">Signed</dt>
              <dd>{agreement.signedAt ? new Date(agreement.signedAt).toLocaleString('en-AU') : '—'}</dd>
            </div>
            {agreement.signatureName && (
              <div>
                <dt className="text-text-light">Signed by</dt>
                <dd>{agreement.signatureName}</dd>
              </div>
            )}
          </dl>
          <p className="text-xs text-text-light">Created by {agreement.createdByName}</p>
        </Card>
      </div>

      <Modal
        open={showUrlModal}
        onClose={() => setShowUrlModal(false)}
        title={emailSent ? 'Agreement Sent' : 'Copy Signing Link for Client'}
        footer={<Button onClick={() => setShowUrlModal(false)}>Done</Button>}
      >
        <p className="mb-3 text-sm text-text-light">
          {emailSent ? (
            <>
              The agreement was emailed to <strong>{agreement.clientEmail}</strong>. You can also
              share the link below if needed.
            </>
          ) : (
            <>
              Email could not be delivered to <strong>{agreement.clientEmail}</strong>. Copy the link
              below and send it to the client manually.
            </>
          )}
        </p>
        {signingUrl && (
          <div className="flex gap-2">
            <code className="flex-1 break-all rounded bg-background p-3 text-xs">{signingUrl}</code>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void navigator.clipboard.writeText(signingUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
