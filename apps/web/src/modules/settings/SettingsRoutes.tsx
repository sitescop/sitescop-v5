import { NavLink, Outlet, Navigate, Route, Routes } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/design-system/components';
import { CompanySettingsPage } from './pages/CompanySettingsPage';
import {
  BrandingSettingsPage,
  EmailSettingsPage,
  SmsSettingsPage,
  PdfSettingsPage,
  NotificationsSettingsPage,
  PricingSettingsPage,
  TemplatesSettingsPage,
  IntegrationsSettingsPage,
  BackupSettingsPage,
} from './pages/BrandingSettingsPage';
import { ApiKeysSettingsPage } from './pages/ApiKeysSettingsPage';

const NAV = [
  { to: 'company', label: 'Company' },
  { to: 'branding', label: 'Branding' },
  { to: 'email', label: 'Email' },
  { to: 'sms', label: 'SMS' },
  { to: 'pdf', label: 'PDF Reports' },
  { to: 'notifications', label: 'Notifications' },
  { to: 'pricing', label: 'Pricing' },
  { to: 'templates', label: 'Templates' },
  { to: 'integrations', label: 'Integrations' },
  { to: 'api-keys', label: 'API Keys' },
  { to: 'backup', label: 'Backup' },
];

function SettingsLayout() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Company profile, branding, communications, and integrations"
        breadcrumbs={[{ label: 'Settings' }]}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-light hover:bg-background hover:text-text',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function SettingsRoutes() {
  return (
    <Routes>
      <Route element={<SettingsLayout />}>
        <Route index element={<Navigate to="company" replace />} />
        <Route path="company" element={<CompanySettingsPage />} />
        <Route path="branding" element={<BrandingSettingsPage />} />
        <Route path="email" element={<EmailSettingsPage />} />
        <Route path="sms" element={<SmsSettingsPage />} />
        <Route path="pdf" element={<PdfSettingsPage />} />
        <Route path="notifications" element={<NotificationsSettingsPage />} />
        <Route path="pricing" element={<PricingSettingsPage />} />
        <Route path="templates" element={<TemplatesSettingsPage />} />
        <Route path="integrations" element={<IntegrationsSettingsPage />} />
        <Route path="api-keys" element={<ApiKeysSettingsPage />} />
        <Route path="backup" element={<BackupSettingsPage />} />
      </Route>
    </Routes>
  );
}
