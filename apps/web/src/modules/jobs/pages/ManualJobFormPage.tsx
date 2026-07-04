import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Tablet } from 'lucide-react';
import { JOB_TYPE_LABELS, JobType, UserRole } from '@sitescop/shared-types';
import type { CreateAndSendAgreementResponse } from '@sitescop/shared-types';
import { agreementsApi } from '@/lib/api/agreements';
import { jobsApi } from '@/lib/api/jobs';
import { settingsApi } from '@/lib/api/settings';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import { useFormErrors } from '@/lib/hooks/useFormErrors';
import { Button, Card, Input, Modal, PageHeader, Select, Textarea } from '@/design-system/components';

type StartMode = 'start_now' | 'sign_agreement';

function defaultPriceForType(
  type: JobType,
  preferences: {
    defaultBuildingPrice: number | null;
    defaultPestPrice: number | null;
    defaultCombinedPrice: number | null;
  },
): string {
  let cents: number | null = null;
  switch (type) {
    case JobType.BUILDING:
    case JobType.PRE_PURCHASE:
    case JobType.PRE_SALE:
      cents = preferences.defaultBuildingPrice;
      break;
    case JobType.PEST:
      cents = preferences.defaultPestPrice;
      break;
    case JobType.COMBINED:
      cents = preferences.defaultCombinedPrice;
      break;
    default:
      cents = preferences.defaultBuildingPrice;
  }
  return cents != null ? String(cents / 100) : '';
}

export function ManualJobFormPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isInspector = user?.role === UserRole.INSPECTOR;
  const { clearErrors, handleError, fieldError } = useFormErrors();
  const [formError, setFormError] = useState('');
  const [mode, setMode] = useState<StartMode>(isInspector ? 'sign_agreement' : 'start_now');
  const [signResult, setSignResult] = useState<CreateAndSendAgreementResponse | null>(null);

  const [type, setType] = useState<JobType>(JobType.BUILDING);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [priceTouched, setPriceTouched] = useState(false);
  const [inspectorId, setInspectorId] = useState('');

  const { data: settingsData } = useQuery({
    queryKey: ['settings-company'],
    queryFn: () => settingsApi.get(),
  });

  const { data: inspectorsData } = useQuery({
    queryKey: ['inspectors'],
    queryFn: () => jobsApi.listInspectors(),
    enabled: !isInspector && hasPermission('jobs:assign'),
  });

  useEffect(() => {
    if (!settingsData?.preferences || priceTouched) return;
    setPrice(defaultPriceForType(type, settingsData.preferences));
  }, [settingsData, type, priceTouched]);

  const startNowMutation = useMutation({
    mutationFn: () =>
      jobsApi.createManual({
        type,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        propertyAddress: propertyAddress.trim(),
        priceCents: price ? Math.round(Number.parseFloat(price) * 100) : undefined,
        notes: notes.trim() || undefined,
        inspectorId: isInspector ? undefined : inspectorId || undefined,
      }),
    onSuccess: (result) => {
      navigate(`/jobs/${result.job.id}`, {
        state: { created: true, manual: true },
      });
    },
    onError: (e) => setFormError(handleError(e)),
  });

  const sendAgreementMutation = useMutation({
    mutationFn: () =>
      agreementsApi.sendNew({
        type,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || undefined,
        clientPhone: clientPhone.trim() || undefined,
        propertyAddress: propertyAddress.trim() || undefined,
        priceCents: Math.round(Number.parseFloat(price || '0') * 100),
        notes: notes.trim() || undefined,
      }),
    onSuccess: (result) => {
      setSignResult(result);
    },
    onError: (e) => setFormError(handleError(e)),
  });

  const isPending = startNowMutation.isPending || sendAgreementMutation.isPending;
  const signingUrl = signResult?.signingUrl ?? signResult?.devSigningUrl ?? null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearErrors();
    setFormError('');

    if (mode === 'sign_agreement') {
      if (!clientPhone.trim() && !clientEmail.trim()) {
        setFormError('Enter the client mobile or email.');
        return;
      }
      if (!price || Number.parseFloat(price) <= 0) {
        setFormError('Enter a valid price before sending the agreement.');
        return;
      }
      sendAgreementMutation.mutate();
      return;
    }

    startNowMutation.mutate();
  }

  function openSigningOnTablet() {
    if (!signingUrl) return;
    window.location.assign(signingUrl);
  }

  return (
    <div>
      <PageHeader
        title="Start Job"
        description={
          isInspector
            ? 'Enter client details, open the agreement on your tablet for the client to sign, then record payment and start the inspection.'
            : 'Enter client details, then start the inspection or open the agreement for the client to sign.'
        }
        breadcrumbs={[
          { label: 'Jobs', href: '/jobs' },
          { label: 'Start Job' },
        ]}
      />

      <Card className="max-w-2xl p-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {formError && (
            <p className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-text">How are you starting this job?</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                size="sm"
                variant={mode === 'sign_agreement' ? 'primary' : 'secondary'}
                className="flex-1 justify-center"
                onClick={() => setMode('sign_agreement')}
              >
                Client signs on tablet
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'start_now' ? 'primary' : 'secondary'}
                className="flex-1 justify-center"
                onClick={() => setMode('start_now')}
              >
                Paper contract — start now
              </Button>
            </div>
            <p className="mt-2 text-xs text-text-light">
              {mode === 'start_now'
                ? 'Client already signed on paper — create the job and draft the inspection report immediately.'
                : 'Open the agreement on your tablet or phone. After the client signs, the job appears in your Jobs list — record payment on-site, then start the inspection.'}
            </p>
          </div>

          <Select
            label="Inspection type"
            value={type}
            onChange={(e) => setType(e.target.value as JobType)}
            options={Object.entries(JOB_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            required
          />

          <Input
            label="Client name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            error={fieldError('clientName')}
            required
          />

          <Input
            label="Client mobile"
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            error={fieldError('clientPhone')}
            required={mode === 'start_now' || mode === 'sign_agreement'}
            placeholder="0400 000 000"
          />

          <Input
            label={mode === 'sign_agreement' ? 'Client email (optional on-site)' : 'Client email (optional)'}
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            error={fieldError('clientEmail')}
            placeholder={
              mode === 'sign_agreement'
                ? 'Optional — agreement opens on your tablet; email copy sent if provided'
                : 'Optional for paper contracts'
            }
          />

          <Input
            label="Property address"
            value={propertyAddress}
            onChange={(e) => setPropertyAddress(e.target.value)}
            error={fieldError('propertyAddress')}
            required={mode === 'start_now'}
            placeholder={mode === 'sign_agreement' ? 'Optional — client can enter when signing' : undefined}
          />

          <Input
            label={`Price ex GST${mode === 'start_now' ? ' (optional)' : ''}`}
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => {
              setPriceTouched(true);
              setPrice(e.target.value);
            }}
            required={mode === 'sign_agreement'}
          />

          {!isInspector && hasPermission('jobs:assign') && mode === 'start_now' && (
            <Select
              label="Inspector"
              placeholder="Select inspector"
              value={inspectorId}
              onChange={(e) => setInspectorId(e.target.value)}
              options={(inspectorsData?.inspectors ?? []).map((i) => ({
                value: i.id,
                label: i.displayName,
              }))}
              required
            />
          )}

          <Textarea
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" isLoading={isPending}>
              {mode === 'start_now' ? 'Create job & start inspection' : 'Prepare agreement for signing'}
            </Button>
            <Button type="button" variant="secondary" asChild>
              <Link to="/jobs">Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>

      <Modal
        open={Boolean(signResult)}
        onClose={() => setSignResult(null)}
        title="Agreement ready for signing"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSignResult(null)}>
              Close
            </Button>
            {signResult?.agreement?.id && (
              <Button asChild>
                <Link to={`/agreements/${signResult.agreement.id}`}>View agreement</Link>
              </Button>
            )}
          </>
        }
      >
        {signResult && (
          <div className="space-y-4 text-sm text-text">
            <p>
              Agreement <strong>{signResult.agreement.agreementNumber}</strong> is ready.
              {signResult.emailSent && signResult.agreement.clientEmail && (
                <>
                  {' '}
                  A copy was emailed to <strong>{signResult.agreement.clientEmail}</strong>.
                </>
              )}
            </p>
            <p>
              Hand your tablet to the client and open the signing page below. When they finish,
              the job is added to your Jobs list automatically. Record payment on-site, then tap{' '}
              <strong>Start Inspection</strong>.
            </p>
            {signingUrl && (
              <div className="space-y-2">
                <Button className="w-full" variant="accent" onClick={openSigningOnTablet}>
                  <Tablet className="h-4 w-4" />
                  Open on this tablet for client to sign
                </Button>
                <Button className="w-full" variant="secondary" asChild>
                  <a href={signingUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open in new tab
                  </a>
                </Button>
                <p className="break-all text-xs text-text-muted">{signingUrl}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
