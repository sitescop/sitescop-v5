import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/design-system/layouts/AppShell';
import { RequireAuth, RequirePermission, RequireAnyPermission } from '@/modules/auth/components/RequireAuth';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/modules/auth/pages/ResetPasswordPage';
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { JobsRoutes } from '@/modules/jobs/JobsRoutes';
import { CrmRoutes } from '@/modules/crm/CrmRoutes';
import { SettingsRoutes } from '@/modules/settings/SettingsRoutes';
import { AdminRoutes } from '@/modules/admin/AdminRoutes';
import { AgreementsRoutes } from '@/modules/agreements/AgreementsRoutes';
import { AgreementSignPage } from '@/modules/agreements/pages/AgreementSignPage';
import { InspectionsRoutes } from '@/modules/inspections/InspectionsRoutes';
import { ReportsRoutes } from '@/modules/reports/ReportsRoutes';
import { AccountsRoutes } from '@/modules/accounts/AccountsRoutes';
import { CalendarRoutes } from '@/modules/calendar/CalendarRoutes';
import { ClientPortalPage } from '@/modules/portal/pages/ClientPortalPage';
import { HomeRedirect } from '@/modules/auth/components/HomeRedirect';

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
            <Route index element={<HomeRedirect />} />
            <Route path="dashboard" element={<DashboardPage />} />

            <Route
              path="portal"
              element={
                <RequirePermission permission="client:portal">
                  <ClientPortalPage />
                </RequirePermission>
              }
            />

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
                  <CalendarRoutes />
                </RequirePermission>
              }
            />

            <Route
              path="reports/*"
              element={
                <RequirePermission permission="reports:view">
                  <ReportsRoutes />
                </RequirePermission>
              }
            />

            <Route
              path="accounts/*"
              element={
                <RequirePermission permission="billing:view">
                  <AccountsRoutes />
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
