import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { JOB_TYPE_LABELS, JobType } from '@sitescop/shared-types';
import { agreementsApi } from '@/lib/api/agreements';
import { jobsApi } from '@/lib/api/jobs';
import { useFormErrors } from '@/lib/hooks/useFormErrors';
import { Button, Card, Input, PageHeader, Select, Textarea } from '@/design-system/components';

export function AgreementFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const jobIdParam = searchParams.get('jobId');
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
  const [linkedJobId, setLinkedJobId] = useState(jobIdParam ?? '');

  const { data: agreementData } = useQuery({
    queryKey: ['agreement', id],
    queryFn: () => agreementsApi.get(id!),
    enabled: isEdit,
  });

  const { data: jobData } = useQuery({
    queryKey: ['job', linkedJobId],
    queryFn: () => jobsApi.get(linkedJobId),
    enabled: Boolean(linkedJobId) && !isEdit,
  });

  useEffect(() => {
    if (!agreementData?.agreement) return;
    const a = agreementData.agreement;
    setType(a.type);
    setClientName(a.clientName);
    setClientEmail(a.clientEmail);
    setClientPhone(a.clientPhone ?? '');
    setPropertyAddress(a.propertyAddress);
    setPrice(String(a.priceCents / 100));
    setNotes(a.notes ?? '');
    setLinkedJobId(a.jobId ?? '');
  }, [agreementData]);

  useEffect(() => {
    if (!jobData?.job || isEdit) return;
    const job = jobData.job;
    setType(job.type);
    setClientName(job.clientContact?.displayName ?? '');
    setClientEmail(job.clientContact?.email ?? '');
    setClientPhone(job.clientContact?.phone ?? '');
    setPropertyAddress(job.property?.formattedAddress ?? '');
    setPrice(job.priceCents != null ? String(job.priceCents / 100) : '');
    setLinkedJobId(job.id);
  }, [jobData, isEdit]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        jobId: linkedJobId || undefined,
        type,
        clientName,
        clientEmail,
        clientPhone: clientPhone || undefined,
        propertyAddress,
        priceCents: Math.round(Number.parseFloat(price || '0') * 100),
        notes: notes || undefined,
      };

      if (isEdit) return agreementsApi.update(id!, payload);
      return agreementsApi.create(payload);
    },
    onSuccess: (result) => navigate(`/agreements/${result.agreement.id}`),
    onError: (error) => setFormError(handleError(error)),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    clearErrors();
    setFormError('');
    mutation.mutate();
  };

  const typeOptions = Object.entries(JOB_TYPE_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Agreement' : 'Send Agreement'}
        description="Prepare a client inspection agreement for signing"
        breadcrumbs={[
          { label: 'Agreements', href: '/agreements' },
          { label: isEdit ? 'Edit' : 'Send' },
        ]}
      />

      <Card className="max-w-2xl p-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          {formError && <p className="text-sm text-danger">{formError}</p>}

          {!isEdit && (
            <Input
              label="Link to Job ID (optional)"
              value={linkedJobId}
              onChange={(e) => setLinkedJobId(e.target.value)}
              placeholder="Paste job ID or use ?jobId= from jobs page"
            />
          )}

          <Select
            label="Inspection Type"
            value={type}
            onChange={(e) => setType(e.target.value as JobType)}
            options={typeOptions}
          />

          <Input label="Client Name" value={clientName} onChange={(e) => setClientName(e.target.value)} error={fieldError('clientName')} required />
          <Input label="Client Email" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} error={fieldError('clientEmail')} required />
          <Input label="Client Phone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
          <Input label="Property Address" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} error={fieldError('propertyAddress')} required />
          <Input label="Price ex GST (AUD)" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} error={fieldError('priceCents')} required />
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="flex gap-3">
            <Button type="submit" isLoading={mutation.isPending}>
              {isEdit ? 'Save Draft' : 'Create Draft'}
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
