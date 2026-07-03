import { SITESCOP_LOGO_PATH } from '@sitescop/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import { useFormErrors } from '@/lib/hooks/useFormErrors';
import { Button, Card, Input, LoadingOverlay } from '@/design-system/components';
import { useEffect, useState, type FormEvent } from 'react';

export function useSettingsForm() {
  const queryClient = useQueryClient();
  const canManage = useAuthStore((s) => s.hasPermission('settings:manage'));
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['settings'] });

  return { data, isLoading, canManage, invalidate };
}

export function SettingsFormCard({
  title,
  description,
  children,
  onSubmit,
  isLoading,
  canManage,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (e: FormEvent) => void;
  isLoading?: boolean;
  canManage: boolean;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      {description && <p className="mt-1 text-sm text-text-light">{description}</p>}
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {children}
        {canManage && (
          <Button type="submit" isLoading={isLoading}>
            Save Changes
          </Button>
        )}
      </form>
    </Card>
  );
}

export function CompanySettingsPage() {
  const { data, isLoading, canManage, invalidate } = useSettingsForm();
  const { clearErrors, handleError, fieldError } = useFormErrors();
  const [formError, setFormError] = useState('');
  const [name, setName] = useState('');
  const [abn, setAbn] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (!data) return;
    setName(data.company.name);
    setAbn(data.company.abn ?? '');
    setEmail(data.company.email ?? '');
    setPhone(data.company.phone ?? '');
    setWebsite(data.company.website ?? '');
    setAddress(data.company.address ?? '');
    setLogoUrl(data.company.logoUrl ?? '');
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      settingsApi.updateCompany({
        name,
        abn,
        email,
        phone,
        website,
        address,
        logoUrl,
      }),
    onSuccess: () => invalidate(),
    onError: (e) => setFormError(handleError(e)),
  });

  if (isLoading) return <LoadingOverlay message="Loading settings..." fullScreen={false} />;

  return (
    <SettingsFormCard
      title="Company Profile"
      description="Legal and contact details for your inspection business"
      canManage={canManage}
      isLoading={mutation.isPending}
      onSubmit={(e) => {
        e.preventDefault();
        clearErrors();
        setFormError('');
        mutation.mutate();
      }}
    >
      {formError && <p className="text-sm text-danger">{formError}</p>}
      <Input label="Company Name" value={name} onChange={(e) => setName(e.target.value)} error={fieldError('name')} disabled={!canManage} />
      <Input label="ABN" value={abn} onChange={(e) => setAbn(e.target.value)} disabled={!canManage} />
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError('email')} disabled={!canManage} />
      <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canManage} />
      <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} disabled={!canManage} placeholder="www.sitescop.com.au" />
      <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} disabled={!canManage} />
      <Input
        label="Logo URL or path"
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
        error={fieldError('logoUrl')}
        disabled={!canManage}
        placeholder={SITESCOP_LOGO_PATH}
      />
      {(logoUrl || SITESCOP_LOGO_PATH) && (
        <div className="rounded-sm border border-border bg-background p-4">
          <p className="mb-2 text-sm font-medium text-text">Logo preview</p>
          <img
            src={logoUrl || SITESCOP_LOGO_PATH}
            alt={`${name || 'Company'} logo`}
            className="max-h-36 max-w-[320px] object-contain"
          />
        </div>
      )}
    </SettingsFormCard>
  );
}
