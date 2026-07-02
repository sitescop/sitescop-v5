import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/design-system/layouts/AppShell';
import { RequireAuth, RequirePermission } from '@/modules/auth/components/RequireAuth';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/modules/auth/pages/ResetPasswordPage';
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { ModulePlaceholder } from '@/design-system/components/ModulePlaceholder';

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
                  <ModulePlaceholder title="Jobs" description="Inspection job management" phase="Phase 1" />
                </RequirePermission>
              }
            />

            <Route
              path="agreements/*"
              element={
                <RequirePermission permission="agreements:view">
                  <ModulePlaceholder title="Agreements" description="Client agreement management" phase="Phase 2" />
                </RequirePermission>
              }
            />

            <Route
              path="inspections/*"
              element={
                <RequirePermission permission="inspections:view">
                  <ModulePlaceholder title="Inspections" description="Field inspection modules" phase="Phase 3" />
                </RequirePermission>
              }
            />

            <Route
              path="crm/*"
              element={
                <RequirePermission permission="crm:view">
                  <ModulePlaceholder title="CRM" description="Clients, agents, and contacts" phase="Phase 1" />
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
                <RequirePermission permission="users:manage">
                  <ModulePlaceholder title="Admin" description="User and company administration" phase="Phase 1" />
                </RequirePermission>
              }
            />

            <Route
              path="settings/*"
              element={
                <RequirePermission permission="settings:view">
                  <ModulePlaceholder title="Settings" description="Company and platform settings" phase="Phase 1" />
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
