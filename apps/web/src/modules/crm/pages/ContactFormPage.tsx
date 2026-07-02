import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CONTACT_TYPE_LABELS, ContactStatus, ContactType } from '@sitescop/shared-types';
import { crmApi } from '@/lib/api/crm';
import { useFormErrors } from '@/lib/hooks/useFormErrors';
import { Button, Card, Input, PageHeader, Select, Textarea } from '@/design-system/components';

export function ContactFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { clearErrors, handleError, fieldError } = useFormErrors();
  const [formError, setFormError] = useState('');

  const [type, setType] = useState<ContactType>(ContactType.CLIENT);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [abn, setAbn] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ContactStatus>(ContactStatus.ACTIVE);

  const { data } = useQuery({
    queryKey: ['crm-contact', id],
    queryFn: () => crmApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!data?.contact) return;
    const c = data.contact;
    setType(c.type);
    setFirstName(c.firstName);
    setLastName(c.lastName);
    setEmail(c.email ?? '');
    setPhone(c.phone ?? '');
    setCompanyName(c.companyName ?? '');
    setAbn(c.abn ?? '');
    setAddress(c.address ?? '');
    setNotes(c.notes ?? '');
    setStatus(c.status);
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        type,
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        companyName: companyName || undefined,
        abn: abn || undefined,
        address: address || undefined,
        notes: notes || undefined,
        status,
      };
      if (isEdit) return crmApi.update(id!, payload);
      return crmApi.create(payload);
    },
    onSuccess: (result) => navigate(`/crm/${result.contact.id}`),
    onError: (error) => setFormError(handleError(error)),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    clearErrors();
    setFormError('');
    mutation.mutate();
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Contact' : 'Add Contact'}
        breadcrumbs={[
          { label: 'CRM', href: '/crm' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
      />

      <Card className="max-w-2xl p-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          {formError && (
            <div className="rounded-sm border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {formError}
            </div>
          )}

          <Select
            label="Contact Type"
            value={type}
            onChange={(e) => setType(e.target.value as ContactType)}
            options={Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            error={fieldError('type')}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={fieldError('firstName')} required />
            <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} error={fieldError('lastName')} required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError('email')} />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <Input label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <Input label="ABN" value={abn} onChange={(e) => setAbn(e.target.value)} />
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

          {isEdit && (
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ContactStatus)}
              options={[
                { value: ContactStatus.ACTIVE, label: 'Active' },
                { value: ContactStatus.INACTIVE, label: 'Inactive' },
              ]}
            />
          )}

          <div className="flex gap-3">
            <Button type="submit" isLoading={mutation.isPending}>
              {isEdit ? 'Save' : 'Create Contact'}
            </Button>
            <Button variant="secondary" asChild>
              <Link to={isEdit ? `/crm/${id}` : '/crm'}>Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
