import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { JOB_TYPE_LABELS } from '@sitescop/shared-types';
import { agreementsApi } from '@/lib/api/agreements';
import { Button, Card, Input, LoadingOverlay, SignaturePad, type SignaturePadHandle } from '@/design-system/components';

export function AgreementSignPage() {
  const { token } = useParams<{ token: string }>();
  const signatureRef = useRef<SignaturePadHandle>(null);
  const [signatureName, setSignatureName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [agreementNumber, setAgreementNumber] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['public-agreement', token],
    queryFn: () => agreementsApi.getPublic(token!),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (token) void agreementsApi.markViewed(token);
  }, [token]);

  useEffect(() => {
    if (!data?.agreement) return;
    const agreement = data.agreement;
    setSignatureName(agreement.clientName);
    if (agreement.propertyPending) {
      setPropertyAddress('');
    } else {
      setPropertyAddress(agreement.propertyAddress);
    }
  }, [data]);

  const agreement = data?.agreement;
  const propertyPending = agreement?.propertyPending ?? false;

  const signMutation = useMutation({
    mutationFn: () =>
      agreementsApi.sign(token!, {
        signatureName,
        signatureData: signatureRef.current?.toDataUrl() ?? '',
        declarationsAccepted: true,
        propertyAddress: propertyPending ? propertyAddress.trim() : undefined,
        clientPhone: clientPhone.trim() || undefined,
      }),
    onSuccess: (result) => {
      setAgreementNumber(result.agreementNumber);
      setSubmitted(true);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Signing failed'),
  });

  const declineMutation = useMutation({
    mutationFn: () => agreementsApi.decline(token!, { reason: 'Declined by client' }),
    onSuccess: () => setError('Agreement declined.'),
  });

  if (isLoading) return <LoadingOverlay message="Loading agreement..." />;
  if (loadError || !agreement) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md p-8 text-center">
          <p className="text-danger">This agreement link is invalid or has expired.</p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-lg p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-2xl text-success">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-text">Agreement Signed</h1>
          <p className="mt-2 text-text-light">
            Thank you. Agreement <strong>{agreementNumber}</strong> has been submitted successfully.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <header className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="text-sm text-text-light">{agreement.companyName}</p>
          <h1 className="mt-1 text-2xl font-bold text-text">Client Inspection Agreement</h1>
          <p className="mt-2 text-sm text-text-light">
            {agreement.agreementNumber} · {JOB_TYPE_LABELS[agreement.type]}
          </p>
        </header>

        <Card className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-text-light">Client</h3>
              <p>{agreement.clientName}</p>
              <p className="text-sm text-text-light">{agreement.clientEmailMasked}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Property</h3>
              <p>{agreement.propertyPending ? 'You will enter this below before signing' : agreement.propertyAddress}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-light">Total (inc. GST)</h3>
              <p className="text-lg font-semibold">${(agreement.totalCents / 100).toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-6 p-6">
          {agreement.legalSections.sections.map((section) => (
            <div key={section.id}>
              <h2 className="text-lg font-semibold text-primary">{section.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text">{section.content}</p>
            </div>
          ))}
        </Card>

        {agreement.canSign ? (
          <Card className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-text">Sign Agreement</h2>
            {error && <p className="text-sm text-danger">{error}</p>}
            {agreement.propertyPending && (
              <>
                <Input
                  label="Property address to be inspected"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  required
                  placeholder="Full street address, suburb, state, postcode"
                />
                <Input
                  label="Mobile phone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="04xx xxx xxx"
                />
              </>
            )}
            <Input
              label="Full Name (as signature)"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              required
            />
            <div>
              <label className="form-label">Draw Signature</label>
              <SignaturePad ref={signatureRef} />
            </div>
            <label className="flex items-start gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1"
              />
              I have read and accept all terms, scope, limitations, privacy policy, and client declaration above.
            </label>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  if (agreement.propertyPending && !propertyAddress.trim()) {
                    setError('Please enter the property address to be inspected.');
                    return;
                  }
                  if (!signatureName || signatureRef.current?.isEmpty()) {
                    setError('Please enter your name and draw your signature.');
                    return;
                  }
                  if (!accepted) {
                    setError('Please accept the declaration.');
                    return;
                  }
                  setError('');
                  signMutation.mutate();
                }}
                isLoading={signMutation.isPending}
              >
                Submit Signed Agreement
              </Button>
              <Button variant="secondary" onClick={() => declineMutation.mutate()} isLoading={declineMutation.isPending}>
                Decline
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center text-text-light">
            This agreement is no longer available for signing (status: {agreement.status}).
          </Card>
        )}
      </div>
    </div>
  );
}
