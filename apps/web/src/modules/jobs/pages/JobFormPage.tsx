import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { JOB_TYPE_LABELS, JobType } from '@sitescop/shared-types';
import { jobsApi } from '@/lib/api/jobs';
import { crmApi } from '@/lib/api/crm';
import { settingsApi } from '@/lib/api/settings';
import { useFormErrors } from '@/lib/hooks/useFormErrors';
import { ContactSearchPicker } from '@/modules/crm/components/ContactSearchPicker';
import { Button, Card, Input, PageHeader, Select, Textarea } from '@/design-system/components';
import { ContactType } from '@sitescop/shared-types';

function buildJobTitle(type: JobType, addressLine1: string, suburb: string): string {
  const label = JOB_TYPE_LABELS[type];
  const location = [addressLine1.trim(), suburb.trim()].filter(Boolean).join(', ');
  return location ? `${label} — ${location}` : label;
}

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

interface ContactPickerProps {
  label: string;
  required?: boolean;
  title: string;
  contactId: string;
  onTitleChange: (value: string) => void;
  onContactChange: (value: string) => void;
  contactType: ContactType;
  requireEmail?: boolean;
  error?: string;
  hint?: string;
  searchPlaceholder?: string;
}

function ContactPicker({
  label,
  required,
  title,
  contactId,
  onTitleChange,
  onContactChange,
  contactType,
  requireEmail,
  error,
  hint,
  searchPlaceholder,
}: ContactPickerProps) {
  return (
    <ContactSearchPicker
      label={label}
      contactType={contactType}
      value={contactId}
      onChange={onContactChange}
      title={title}
      onTitleChange={onTitleChange}
      required={required}
      requireEmail={requireEmail}
      error={error}
      hint={hint}
      searchPlaceholder={searchPlaceholder}
    />
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
  const [priceTouched, setPriceTouched] = useState(false);
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('new');
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  const { data: jobData } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id!),
    enabled: isEdit,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings-company'],
    queryFn: () => settingsApi.get(),
    enabled: !isEdit,
  });

  const { data: selectedClientData } = useQuery({
    queryKey: ['crm-contact', clientContactId],
    queryFn: () => crmApi.get(clientContactId),
    enabled: Boolean(clientContactId),
  });

  const selectedClient = selectedClientData?.contact;

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
    setPriceTouched(true);
  }, [jobData]);

  useEffect(() => {
    if (isEdit || priceTouched || !settingsData?.preferences) return;
    setPrice(defaultPriceForType(type, settingsData.preferences));
  }, [isEdit, priceTouched, settingsData, type]);

  const mutation = useMutation({
    mutationFn: async () => {
      let resolvedClientId = clientContactId;

      if (clientMode === 'new') {
        if (!newClientName.trim() || !newClientEmail.trim()) {
          throw new Error('Client name and email are required');
        }
        const parts = newClientName.trim().split(/\s+/);
        const firstName = parts[0] ?? 'Client';
        const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '-';
        const created = await crmApi.create({
          type: ContactType.CLIENT,
          firstName,
          lastName,
          email: newClientEmail.trim(),
          phone: newClientPhone.trim() || undefined,
        });
        resolvedClientId = created.contact.id;
      }

      if (!resolvedClientId) {
        throw new Error('Client is required');
      }

      const clientRecord =
        clientMode === 'new'
          ? { email: newClientEmail.trim() }
          : selectedClient;

      if (!clientRecord?.email?.trim()) {
        throw new Error('Selected client must have an email address. Add it in CRM first.');
      }
      if (!addressLine1.trim() || !suburb.trim() || !postcode.trim()) {
        throw new Error('Property address, suburb, and postcode are required');
      }
      const priceValue = Number.parseFloat(price);
      if (!price || Number.isNaN(priceValue) || priceValue <= 0) {
        throw new Error('Price is required');
      }

      const payload = {
        title: buildJobTitle(type, addressLine1, suburb),
        type,
        clientContactId: resolvedClientId,
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
        priceCents: Math.round(priceValue * 100),
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

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Job' : 'Create Job'}
        description={
          isEdit
            ? 'Update job details'
            : 'Capture client, property, and price — then send an agreement from the job page'
        }
        breadcrumbs={[
          { label: 'Jobs', href: '/jobs' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
      />

      <Card className="max-w-3xl p-6">
        {!isEdit && (
          <div className="mb-6 rounded-sm border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-text">
            For new enquiries, use <Link className="font-medium text-primary hover:underline" to="/agreements/send">Agreements → Send Agreement</Link> first.
            Use this form when you already need a job record (repeat clients or manual jobs).
          </div>
        )}

        <form className="space-y-8" onSubmit={onSubmit}>
          {formError && (
            <div className="rounded-sm border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {formError}
            </div>
          )}

          <section className="space-y-4">
            <h3 className="inspection-subsection-heading">Inspection type</h3>
            <Select
              label="Job Type"
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as JobType)}
              options={jobTypeOptions}
              error={fieldError('type')}
            />
          </section>

          <section className="space-y-4">
            <h3 className="inspection-subsection-heading">People</h3>

            {!isEdit && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={clientMode === 'new' ? 'primary' : 'secondary'}
                  onClick={() => setClientMode('new')}
                >
                  New client
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={clientMode === 'existing' ? 'primary' : 'secondary'}
                  onClick={() => setClientMode('existing')}
                >
                  Existing client
                </Button>
              </div>
            )}

            {clientMode === 'new' && !isEdit ? (
              <div className="space-y-4">
                <Input
                  label="Client Name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  required
                />
                <Input
                  label="Client Email"
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  required
                />
                <Input
                  label="Client Mobile"
                  type="tel"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                />
                <p className="text-xs text-text-light">
                  Saved to CRM automatically when you create the job.
                </p>
              </div>
            ) : (
              <>
                <ContactPicker
                  label="Client"
                  required
                  title={clientTitle}
                  contactId={clientContactId}
                  onTitleChange={setClientTitle}
                  onContactChange={setClientContactId}
                  contactType={ContactType.CLIENT}
                  requireEmail
                  error={fieldError('clientContactId')}
                  hint="Search by name, email, or phone."
                  searchPlaceholder="Search clients…"
                />
                <Button variant="secondary" size="sm" asChild>
                  <Link to="/crm/new">Add new client in CRM</Link>
                </Button>
              </>
            )}

            <ContactPicker
              label="Agent"
              title={agentTitle}
              contactId={agentContactId}
              onTitleChange={setAgentTitle}
              onContactChange={setAgentContactId}
              contactType={ContactType.AGENT}
              hint="Optional. Selling or managing agent for the property."
              searchPlaceholder="Search agents…"
            />
          </section>

          <section className="space-y-4">
            <h3 className="inspection-subsection-heading">Property address</h3>
            <p className="text-sm text-text-light">Required. Appears on the agreement, invoice, and inspection report.</p>
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
              <Input label="State" value={state} onChange={(e) => setState(e.target.value)} error={fieldError('property.state')} required />
              <Input label="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} error={fieldError('property.postcode')} required />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="inspection-subsection-heading">Pricing & schedule</h3>
            <Input
              label="Price (AUD, ex GST)"
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
            <p className="text-xs text-text-light">Required. Flows to the agreement and invoice. GST is calculated automatically.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Input label="Scheduled Date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                <p className="mt-1 text-xs text-text-light">Optional. When the inspection is planned.</p>
              </div>
              <div>
                <Input label="Scheduled Time" placeholder="10:00" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                <p className="mt-1 text-xs text-text-light">Optional.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="inspection-subsection-heading">Internal notes</h3>
            <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <p className="text-xs text-text-light">Optional. Office-only — not shown to the client.</p>
          </section>

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
