import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { JOB_TYPE_LABELS, JobType } from '@sitescop/shared-types';
import { jobsApi } from '@/lib/api/jobs';
import { crmApi } from '@/lib/api/crm';
import { useFormErrors } from '@/lib/hooks/useFormErrors';
import { Button, Card, Input, PageHeader, Select, Textarea } from '@/design-system/components';
import { ContactType } from '@sitescop/shared-types';

const TITLE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'Mr', label: 'Mr' },
  { value: 'Mrs', label: 'Mrs' },
  { value: 'Miss', label: 'Miss' },
  { value: 'Ms', label: 'Ms' },
  { value: 'Dr', label: 'Dr' },
  { value: 'Mx', label: 'Mx' },
];

function buildJobTitle(type: JobType, addressLine1: string, suburb: string): string {
  const label = JOB_TYPE_LABELS[type];
  const location = [addressLine1.trim(), suburb.trim()].filter(Boolean).join(', ');
  return location ? `${label} — ${location}` : label;
}

interface ContactPickerProps {
  label: string;
  title: string;
  contactId: string;
  onTitleChange: (value: string) => void;
  onContactChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
}

function ContactPicker({
  label,
  title,
  contactId,
  onTitleChange,
  onContactChange,
  options,
  error,
}: ContactPickerProps) {
  return (
    <div className="w-full">
      <label className="form-label">{label}</label>
      <div className="flex gap-2">
        <select
          className="form-input w-[5.5rem] shrink-0 px-2 text-sm"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          aria-label={`${label} title`}
        >
          {TITLE_OPTIONS.map((opt) => (
            <option key={opt.value || 'none'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="form-input min-w-0 flex-1"
          value={contactId}
          onChange={(e) => onContactChange(e.target.value)}
          aria-label={label}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function JobFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearErrors, handleError, fieldError } = useFormErrors();
  const [formError, setFormError] = useState('');

  const [agentTitle, setAgentTitle] = useState('');
  const [clientTitle, setClientTitle] = useState('Mr');
  const [type, setType] = useState<JobType>(JobType.BUILDING);
  const [clientContactId, setClientContactId] = useState('');
  const [agentContactId, setAgentContactId] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('NSW');
  const [postcode, setPostcode] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  const { data: jobData } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id!),
    enabled: isEdit,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['crm-contacts', ContactType.CLIENT],
    queryFn: () => crmApi.list({ type: ContactType.CLIENT, pageSize: '100' }),
  });

  const { data: agentsData } = useQuery({
    queryKey: ['crm-contacts', ContactType.AGENT],
    queryFn: () => crmApi.list({ type: ContactType.AGENT, pageSize: '100' }),
  });

  useEffect(() => {
    if (!jobData?.job) return;
    const job = jobData.job;
    setType(job.type);
    setClientContactId(job.clientContact?.id ?? '');
    setAgentContactId(job.agentContact?.id ?? '');
    setAddressLine1(job.property?.addressLine1 ?? '');
    setAddressLine2(job.property?.addressLine2 ?? '');
    setSuburb(job.property?.suburb ?? '');
    setState(job.property?.state ?? 'NSW');
    setPostcode(job.property?.postcode ?? '');
    setScheduledDate(job.scheduledDate ? job.scheduledDate.slice(0, 10) : '');
    setScheduledTime(job.scheduledTime ?? '');
    setPrice(job.priceCents != null ? String(job.priceCents / 100) : '');
    setNotes(job.notes ?? '');
  }, [jobData]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: buildJobTitle(type, addressLine1, suburb),
        type,
        clientContactId: clientContactId || undefined,
        agentContactId: agentContactId || undefined,
        property: {
          addressLine1,
          addressLine2: addressLine2 || undefined,
          suburb,
          state,
          postcode,
        },
        scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
        scheduledTime: scheduledTime || undefined,
        priceCents: price ? Math.round(Number.parseFloat(price) * 100) : undefined,
        notes: notes || undefined,
      };

      if (isEdit) return jobsApi.update(id!, payload);
      return jobsApi.create(payload);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
      navigate(`/jobs/${result.job.id}`, { state: { created: !isEdit } });
    },
    onError: (error) => {
      setFormError(handleError(error));
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    clearErrors();
    setFormError('');
    mutation.mutate();
  };

  const jobTypeOptions = Object.entries(JOB_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  const clientOptions = (clientsData?.contacts ?? []).map((c) => ({
    value: c.id,
    label: c.displayName,
  }));
  const agentOptions = (agentsData?.contacts ?? []).map((c) => ({
    value: c.id,
    label: c.displayName,
  }));

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Job' : 'Create Job'}
        description={isEdit ? 'Update job details' : 'Add a new inspection job'}
        breadcrumbs={[
          { label: 'Jobs', href: '/jobs' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
      />

      <Card className="max-w-3xl p-6">
        <form className="space-y-6" onSubmit={onSubmit}>
          {formError && (
            <div className="rounded-sm border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {formError}
            </div>
          )}

          <ContactPicker
            label="Agent"
            title={agentTitle}
            contactId={agentContactId}
            onTitleChange={setAgentTitle}
            onContactChange={setAgentContactId}
            options={agentOptions}
          />

          <ContactPicker
            label="Client"
            title={clientTitle}
            contactId={clientContactId}
            onTitleChange={setClientTitle}
            onContactChange={setClientContactId}
            options={clientOptions}
            error={fieldError('clientContactId')}
          />

          <div className="space-y-4">
            <h3 className="inspection-subsection-heading">Property Address</h3>
            <Input
              label="Address Line 1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              error={fieldError('property.addressLine1')}
              required
            />
            <Input label="Address Line 2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Suburb"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                error={fieldError('property.suburb')}
                required
              />
              <Input label="State" value={state} onChange={(e) => setState(e.target.value)} error={fieldError('property.state')} />
              <Input label="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} error={fieldError('property.postcode')} />
            </div>
          </div>

          <Select
            label="Job Type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as JobType)}
            options={jobTypeOptions}
            error={fieldError('type')}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Scheduled Date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            <Input label="Scheduled Time" placeholder="10:00" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            <Input label="Price (AUD)" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} error={fieldError('priceCents')} />
          </div>

          <Textarea label="Internal Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="flex flex-wrap gap-3">
            <Button type="submit" isLoading={mutation.isPending}>
              {isEdit ? 'Save Changes' : 'Create Job'}
            </Button>
            <Button variant="secondary" asChild>
              <Link to={isEdit ? `/jobs/${id}` : '/jobs'}>Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
