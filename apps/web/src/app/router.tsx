import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/design-system/layouts/AppShell';
import { RequireAuth, RequirePermission, RequireAnyPermission } from '@/modules/auth/components/RequireAuth';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/modules/auth/pages/ResetPasswordPage';
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { ModulePlaceholder } from '@/design-system/components/ModulePlaceholder';
import { JobsRoutes } from '@/modules/jobs/JobsRoutes';
import { CrmRoutes } from '@/modules/crm/CrmRoutes';
import { SettingsRoutes } from '@/modules/settings/SettingsRoutes';
import { AdminRoutes } from '@/modules/admin/AdminRoutes';
import { AgreementsRoutes } from '@/modules/agreements/AgreementsRoutes';
import { AgreementSignPage } from '@/modules/agreements/pages/AgreementSignPage';
import { InspectionsRoutes } from '@/modules/inspections/InspectionsRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/sign/:token" element={<AgreementSignPage />} />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            <Route
              path="jobs/*"
              element={
                <RequirePermission permission="jobs:view">
                  <JobsRoutes />
                </RequirePermission>
              }
            />

            <Route
              path="agreements/*"
              element={
                <RequirePermission permission="agreements:view">
                  <AgreementsRoutes />
                </RequirePermission>
              }
            />

            <Route
              path="inspections/*"
              element={
                <RequirePermission permission="inspections:view">
                  <InspectionsRoutes />
                </RequirePermission>
              }
            />

            <Route
              path="crm/*"
              element={
                <RequirePermission permission="crm:view">
                  <CrmRoutes />
                </RequirePermission>
              }
            />

            <Route
              path="calendar/*"
              element={
                <RequirePermission permission="calendar:view">
                  <ModulePlaceholder title="Calendar" description="Inspector scheduling" phase="Phase 5" />
                </RequirePermission>
              }
            />

            <Route
              path="reports/*"
              element={
                <RequirePermission permission="reports:view">
                  <ModulePlaceholder title="Reports" description="Inspection reports and PDFs" phase="Phase 5" />
                </RequirePermission>
              }
            />

            <Route
              path="accounts/*"
              element={
                <RequirePermission permission="billing:view">
                  <ModulePlaceholder title="Accounts" description="Billing and invoices" phase="Phase 6" />
                </RequirePermission>
              }
            />

            <Route
              path="admin/*"
              element={
                <RequireAnyPermission
                  permissions={[
                    'users:manage',
                    'users:view',
                    'audit:view',
                    'jobs:view_all',
                    'companies:view_all',
                  ]}
                >
                  <AdminRoutes />
                </RequireAnyPermission>
              }
            />

            <Route
              path="settings/*"
              element={
                <RequirePermission permission="settings:view">
                  <SettingsRoutes />
                </RequirePermission>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
