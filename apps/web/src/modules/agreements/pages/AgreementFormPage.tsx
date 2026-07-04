import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { JOB_TYPE_LABELS, JobType } from '@sitescop/shared-types';
import { agreementsApi } from '@/lib/api/agreements';
import { settingsApi } from '@/lib/api/settings';
import { useFormErrors } from '@/lib/hooks/useFormErrors';
import { Button, Card, Input, PageHeader, Select, Textarea } from '@/design-system/components';

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

export function AgreementFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { clearErrors, handleError, fieldError } = useFormErrors();
  const [formError, setFormError] = useState('');

  const [type, setType] = useState<JobType>(JobType.BUILDING);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [priceTouched, setPriceTouched] = useState(false);

  const { data: agreementData } = useQuery({
    queryKey: ['agreement', id],
    queryFn: () => agreementsApi.get(id!),
    enabled: isEdit,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings-company'],
    queryFn: () => settingsApi.get(),
    enabled: !isEdit,
  });

  useEffect(() => {
    if (!agreementData?.agreement) return;
    const a = agreementData.agreement;
    setType(a.type);
    setClientName(a.clientName);
    setClientEmail(a.clientEmail);
    setClientPhone(a.clientPhone ?? '');
    setPropertyAddress(
      a.propertyAddress === 'To be confirmed by client at signing' ? '' : a.propertyAddress,
    );
    setPrice(String(a.priceCents / 100));
    setNotes(a.notes ?? '');
    setPriceTouched(true);
  }, [agreementData]);

  useEffect(() => {
    if (isEdit || priceTouched || !settingsData?.preferences) return;
    setPrice(defaultPriceForType(type, settingsData.preferences));
  }, [isEdit, priceTouched, settingsData, type]);

  const sendMutation = useMutation({
    mutationFn: () => {
      const email = clientEmail.trim().toLowerCase();
      const officeFrom = settingsData?.preferences?.emailFromAddress?.trim().toLowerCase();
      const officeCompany = settingsData?.company?.email?.trim().toLowerCase();
      if (email && (email === officeFrom || email === officeCompany)) {
        throw new Error(
          'Use the client\'s personal email (e.g. john@gmail.com), not your office address (info@sitescop.com.au). Emails are sent FROM your office TO the client.',
        );
      }

      return agreementsApi.sendNew({
        type,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim() || undefined,
        propertyAddress: propertyAddress.trim() || undefined,
        priceCents: Math.round(Number.parseFloat(price || '0') * 100),
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: (result) => {
      navigate(`/agreements/${result.agreement.id}`, {
        state: {
          justSent: true,
          emailSent: result.emailSent,
          contactCreated: result.contactCreated,
          signingUrl: result.devSigningUrl ?? result.signingUrl,
          emailError: result.emailError,
        },
      });
    },
    onError: (error) => setFormError(handleError(error)),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      agreementsApi.update(id!, {
        type,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim() || undefined,
        propertyAddress: propertyAddress.trim() || 'To be confirmed by client at signing',
        priceCents: Math.round(Number.parseFloat(price || '0') * 100),
        notes: notes.trim() || undefined,
      }),
    onSuccess: (result) => navigate(`/agreements/${result.agreement.id}`),
    onError: (error) => setFormError(handleError(error)),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    clearErrors();
    setFormError('');
    if (isEdit) updateMutation.mutate();
    else sendMutation.mutate();
  };

  const typeOptions = Object.entries(JOB_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  const isPending = sendMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Agreement' : 'Send Agreement'}
        description={
          isEdit
            ? 'Update draft agreement details'
            : 'Enter client details — we create the CRM contact, send the email, and list the agreement'
        }
        breadcrumbs={[
          { label: 'Agreements', href: '/agreements' },
          { label: isEdit ? 'Edit' : 'Send' },
        ]}
      />

      <Card className="max-w-2xl p-6">
        {!isEdit && (
          <div className="mb-6 rounded-sm border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-text">
            One step: fill in the client, click <strong>Send Agreement to Client</strong>. The client
            confirms the property address when they sign online.
          </div>
        )}

        <form className="space-y-4" onSubmit={onSubmit}>
          {formError && <p className="text-sm text-danger">{formError}</p>}

          <Select
            label="Inspection Type"
            value={type}
            onChange={(e) => setType(e.target.value as JobType)}
            options={typeOptions}
          />

          <Input
            label="Client Name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            error={fieldError('clientName')}
            required
          />
          <Input
            label="Client Email"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            error={fieldError('clientEmail')}
            required
            placeholder="client@gmail.com — not info@sitescop.com.au"
          />
          <p className="-mt-2 text-xs text-text-light">
            The signing link is emailed <strong>to this address</strong>. Your office address (
            {settingsData?.preferences?.emailFromAddress ?? 'info@sitescop.com.au'}) is only used as
            the sender when SMTP is configured.
          </p>
          <Input
            label="Client Mobile"
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            error={fieldError('clientPhone')}
            placeholder="04xx xxx xxx"
          />

          {!isEdit && (
            <Input
              label="Property Address (optional)"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              error={fieldError('propertyAddress')}
              placeholder="Leave blank — client enters this when signing"
            />
          )}

          {isEdit && (
            <Input
              label="Property Address"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              error={fieldError('propertyAddress')}
              required
            />
          )}

          <Input
            label="Price ex GST (AUD)"
            type="number"
            min="0.01"
            step="0.01"
            value={price}
            onChange={(e) => {
              setPriceTouched(true);
              setPrice(e.target.value);
            }}
            error={fieldError('priceCents')}
            required
          />

          <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="flex gap-3">
            <Button type="submit" isLoading={isPending}>
              {isEdit ? 'Save Draft' : 'Send Agreement to Client'}
            </Button>
            <Button variant="secondary" asChild>
              <Link to={isEdit ? `/agreements/${id}` : '/agreements'}>Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
