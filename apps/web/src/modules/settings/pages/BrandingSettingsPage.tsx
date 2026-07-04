import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';
import { useFormErrors } from '@/lib/hooks/useFormErrors';
import { Button, Card, Input, Textarea } from '@/design-system/components';
import { SettingsFormCard, useSettingsForm } from './CompanySettingsPage';

function PreferencesPage({
  title,
  description,
  renderFields,
  buildPayload,
}: {
  title: string;
  description?: string;
  renderFields: (props: { disabled: boolean }) => React.ReactNode;
  buildPayload: () => Record<string, unknown>;
}) {
  const { canManage, invalidate } = useSettingsForm();
  const { handleError } = useFormErrors();
  const [formError, setFormError] = useState('');

  const mutation = useMutation({
    mutationFn: () => settingsApi.updatePreferences(buildPayload()),
    onSuccess: () => invalidate(),
    onError: (e) => setFormError(handleError(e)),
  });

  return (
    <SettingsFormCard
      title={title}
      description={description}
      canManage={canManage}
      isLoading={mutation.isPending}
      onSubmit={(e) => {
        e.preventDefault();
        setFormError('');
        mutation.mutate();
      }}
    >
      {formError && <p className="text-sm text-danger">{formError}</p>}
      {renderFields({ disabled: !canManage })}
    </SettingsFormCard>
  );
}

export function BrandingSettingsPage() {
  const { data } = useSettingsForm();
  const [primaryColor, setPrimaryColor] = useState('#0B6E4F');
  const [secondaryColor, setSecondaryColor] = useState('#1E3A5F');
  const [reportHeader, setReportHeader] = useState('');
  const [reportFooter, setReportFooter] = useState('');

  useEffect(() => {
    if (!data) return;
    setPrimaryColor(data.preferences.primaryColor);
    setSecondaryColor(data.preferences.secondaryColor);
    setReportHeader(data.preferences.reportHeader ?? '');
    setReportFooter(data.preferences.reportFooter ?? '');
  }, [data]);

  return (
    <PreferencesPage
      title="Branding"
      description="Colours and report headers for client-facing documents"
      buildPayload={() => ({ primaryColor, secondaryColor, reportHeader, reportFooter })}
      renderFields={({ disabled }) => (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Primary Colour" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} disabled={disabled} />
            <Input label="Secondary Colour" type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} disabled={disabled} />
          </div>
          <Textarea label="Report Header" value={reportHeader} onChange={(e) => setReportHeader(e.target.value)} disabled={disabled} />
          <Textarea label="Report Footer" value={reportFooter} onChange={(e) => setReportFooter(e.target.value)} disabled={disabled} />
        </>
      )}
    />
  );
}

export function EmailSettingsPage() {
  const { data } = useSettingsForm();
  const [emailFromName, setEmailFromName] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [emailSignature, setEmailSignature] = useState('');

  useEffect(() => {
    if (!data) return;
    setEmailFromName(data.preferences.emailFromName ?? '');
    setEmailFromAddress(data.preferences.emailFromAddress ?? '');
    setEmailSignature(data.preferences.emailSignature ?? '');
  }, [data]);

  return (
    <PreferencesPage
      title="Email"
      description="Outbound email identity and signature"
      buildPayload={() => ({ emailFromName, emailFromAddress, emailSignature })}
      renderFields={({ disabled }) => (
        <>
          <Input label="From Name" value={emailFromName} onChange={(e) => setEmailFromName(e.target.value)} disabled={disabled} />
          <Input label="From Address" type="email" value={emailFromAddress} onChange={(e) => setEmailFromAddress(e.target.value)} disabled={disabled} />
          <Textarea label="Signature" value={emailSignature} onChange={(e) => setEmailSignature(e.target.value)} disabled={disabled} />
        </>
      )}
    />
  );
}

export function SmsSettingsPage() {
  const { data, canManage } = useSettingsForm();
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsSenderId, setSmsSenderId] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testError, setTestError] = useState('');

  const statusQuery = useQuery({
    queryKey: ['settings', 'sms-status'],
    queryFn: () => settingsApi.getSmsStatus(),
  });

  const testMutation = useMutation({
    mutationFn: () => settingsApi.sendTestSms({ toPhone: testPhone.trim() }),
    onSuccess: (result) => {
      setTestError('');
      setTestMessage(
        result.sent
          ? `Test SMS sent to ${result.toPhone}.`
          : `SMS not sent${result.error ? `: ${result.error}` : '.'}`,
      );
    },
    onError: (error) => {
      setTestMessage('');
      setTestError(error instanceof Error ? error.message : 'Test SMS failed.');
    },
  });

  useEffect(() => {
    if (!data) return;
    setSmsEnabled(data.preferences.smsEnabled);
    setSmsSenderId(data.preferences.smsSenderId ?? '');
  }, [data]);

  const twilioReady = statusQuery.data?.twilio.configured ?? false;

  return (
    <div className="space-y-6">
      <PreferencesPage
        title="SMS"
        description="SMS notifications via Twilio (agreement links, invoices, report ready, job reminders)"
        buildPayload={() => ({ smsEnabled, smsSenderId })}
        renderFields={({ disabled }) => (
          <>
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={smsEnabled} onChange={(e) => setSmsEnabled(e.target.checked)} disabled={disabled} />
              Enable SMS notifications for this company
            </label>
            <Input
              label="Sender ID (optional label)"
              value={smsSenderId}
              onChange={(e) => setSmsSenderId(e.target.value)}
              disabled={disabled}
              placeholder="SiteScop"
            />
            <p className="text-xs text-text-muted">
              Twilio sends from <code className="text-text">TWILIO_FROM_NUMBER</code> in the server{' '}
              <code className="text-text">.env</code>. Clients must have a mobile on their contact record.
            </p>
          </>
        )}
      />

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-text">Twilio status</h3>
        {statusQuery.isLoading ? (
          <p className="mt-2 text-sm text-text-light">Checking configuration…</p>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            <p className={twilioReady ? 'text-success' : 'text-danger'}>
              {twilioReady
                ? `Configured — sending from ${statusQuery.data?.twilio.fromNumber}`
                : statusQuery.data?.twilio.reason ?? 'Twilio is not configured.'}
            </p>
            <p className="text-text-light">
              Company SMS: {statusQuery.data?.companyEnabled ? 'enabled' : 'disabled'}
            </p>
          </div>
        )}

        {canManage && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              label="Test mobile"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="0412 345 678"
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              isLoading={testMutation.isPending}
              disabled={!testPhone.trim()}
              onClick={() => testMutation.mutate()}
            >
              Send test SMS
            </Button>
          </div>
        )}
        {testMessage && <p className="mt-3 text-sm text-success">{testMessage}</p>}
        {testError && <p className="mt-3 text-sm text-danger">{testError}</p>}
      </Card>
    </div>
  );
}

export function PdfSettingsPage() {
  const { data } = useSettingsForm();
  const [pdfFooterText, setPdfFooterText] = useState('');
  const [pdfIncludeLogo, setPdfIncludeLogo] = useState(true);

  useEffect(() => {
    if (!data) return;
    setPdfFooterText(data.preferences.pdfFooterText ?? '');
    setPdfIncludeLogo(data.preferences.pdfIncludeLogo);
  }, [data]);

  return (
    <PreferencesPage
      title="PDF Reports"
      buildPayload={() => ({ pdfFooterText, pdfIncludeLogo })}
      renderFields={({ disabled }) => (
        <>
          <Textarea label="PDF Footer Text" value={pdfFooterText} onChange={(e) => setPdfFooterText(e.target.value)} disabled={disabled} />
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={pdfIncludeLogo} onChange={(e) => setPdfIncludeLogo(e.target.checked)} disabled={disabled} />
            Include company logo on PDF reports
          </label>
        </>
      )}
    />
  );
}

export function NotificationsSettingsPage() {
  const { data } = useSettingsForm();
  const [notifyNewJob, setNotifyNewJob] = useState(true);
  const [notifyJobAssigned, setNotifyJobAssigned] = useState(true);
  const [notifyJobCompleted, setNotifyJobCompleted] = useState(true);

  useEffect(() => {
    if (!data) return;
    setNotifyNewJob(data.preferences.notifyNewJob);
    setNotifyJobAssigned(data.preferences.notifyJobAssigned);
    setNotifyJobCompleted(data.preferences.notifyJobCompleted);
  }, [data]);

  return (
    <PreferencesPage
      title="Notifications"
      buildPayload={() => ({ notifyNewJob, notifyJobAssigned, notifyJobCompleted })}
      renderFields={({ disabled }) => (
        <div className="space-y-3">
          {[
            ['New job created', notifyNewJob, setNotifyNewJob],
            ['Job assigned to inspector', notifyJobAssigned, setNotifyJobAssigned],
            ['Job completed', notifyJobCompleted, setNotifyJobCompleted],
          ].map(([label, checked, setter]) => (
            <label key={label as string} className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={checked as boolean}
                onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                disabled={disabled}
              />
              {label as string}
            </label>
          ))}
        </div>
      )}
    />
  );
}

export function PricingSettingsPage() {
  const { data } = useSettingsForm();
  const [building, setBuilding] = useState('');
  const [pest, setPest] = useState('');
  const [combined, setCombined] = useState('');
  const [gstRate, setGstRate] = useState('10');

  useEffect(() => {
    if (!data) return;
    const p = data.preferences;
    setBuilding(p.defaultBuildingPrice != null ? String(p.defaultBuildingPrice / 100) : '');
    setPest(p.defaultPestPrice != null ? String(p.defaultPestPrice / 100) : '');
    setCombined(p.defaultCombinedPrice != null ? String(p.defaultCombinedPrice / 100) : '');
    setGstRate(String(p.gstRate));
  }, [data]);

  return (
    <PreferencesPage
      title="Pricing"
      description="Default service prices (excluding GST unless noted)"
      buildPayload={() => ({
        defaultBuildingPrice: building ? Math.round(Number.parseFloat(building) * 100) : null,
        defaultPestPrice: pest ? Math.round(Number.parseFloat(pest) * 100) : null,
        defaultCombinedPrice: combined ? Math.round(Number.parseFloat(combined) * 100) : null,
        gstRate: Number.parseFloat(gstRate),
      })}
      renderFields={({ disabled }) => (
        <>
          <Input label="Building Inspection (AUD)" type="number" min="0" step="0.01" value={building} onChange={(e) => setBuilding(e.target.value)} disabled={disabled} />
          <Input label="Pest Inspection (AUD)" type="number" min="0" step="0.01" value={pest} onChange={(e) => setPest(e.target.value)} disabled={disabled} />
          <Input label="Combined Inspection (AUD)" type="number" min="0" step="0.01" value={combined} onChange={(e) => setCombined(e.target.value)} disabled={disabled} />
          <Input label="GST Rate (%)" type="number" min="0" max="100" step="0.1" value={gstRate} onChange={(e) => setGstRate(e.target.value)} disabled={disabled} />
        </>
      )}
    />
  );
}

export function TemplatesSettingsPage() {
  const { data } = useSettingsForm();
  const [emailTemplates, setEmailTemplates] = useState('');
  const [smsTemplates, setSmsTemplates] = useState('');

  useEffect(() => {
    if (!data) return;
    setEmailTemplates(JSON.stringify(data.preferences.emailTemplates, null, 2));
    setSmsTemplates(JSON.stringify(data.preferences.smsTemplates, null, 2));
  }, [data]);

  return (
    <PreferencesPage
      title="Templates"
      description="Email and SMS templates as JSON key-value pairs"
      buildPayload={() => ({
        emailTemplates: JSON.parse(emailTemplates || '{}'),
        smsTemplates: JSON.parse(smsTemplates || '{}'),
      })}
      renderFields={({ disabled }) => (
        <>
          <Textarea label="Email Templates (JSON)" value={emailTemplates} onChange={(e) => setEmailTemplates(e.target.value)} className="font-mono text-xs" disabled={disabled} />
          <Textarea label="SMS Templates (JSON)" value={smsTemplates} onChange={(e) => setSmsTemplates(e.target.value)} className="font-mono text-xs" disabled={disabled} />
        </>
      )}
    />
  );
}

export function IntegrationsSettingsPage() {
  const { data } = useSettingsForm();
  const [integrations, setIntegrations] = useState('{}');

  useEffect(() => {
    if (!data) return;
    setIntegrations(JSON.stringify(data.preferences.integrations, null, 2));
  }, [data]);

  return (
    <PreferencesPage
      title="Integrations"
      description="Third-party integration settings (stored as JSON)"
      buildPayload={() => ({ integrations: JSON.parse(integrations || '{}') })}
      renderFields={({ disabled }) => (
        <Textarea label="Integrations JSON" value={integrations} onChange={(e) => setIntegrations(e.target.value)} className="font-mono text-xs min-h-[200px]" disabled={disabled} />
      )}
    />
  );
}

export function BackupSettingsPage() {
  const { data } = useSettingsForm();
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState('weekly');

  useEffect(() => {
    if (!data) return;
    setBackupEnabled(data.preferences.backupEnabled);
    setBackupFrequency(data.preferences.backupFrequency);
  }, [data]);

  return (
    <PreferencesPage
      title="Backup"
      buildPayload={() => ({ backupEnabled, backupFrequency })}
      renderFields={({ disabled }) => (
        <>
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={backupEnabled} onChange={(e) => setBackupEnabled(e.target.checked)} disabled={disabled} />
            Enable automated backups
          </label>
          <select
            className="form-input"
            value={backupFrequency}
            onChange={(e) => setBackupFrequency(e.target.value)}
            disabled={disabled}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </>
      )}
    />
  );
}