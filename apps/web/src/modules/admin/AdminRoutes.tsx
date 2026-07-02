import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminOverviewPage } from './pages/AdminOverviewPage';
import { UsersPage } from './pages/UsersPage';
import { UserFormPage } from './pages/UserFormPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { AdminJobsPage } from './pages/AdminJobsPage';
import { CompaniesPage } from './pages/CompaniesPage';

export function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminOverviewPage />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="users/new" element={<UserFormPage />} />
      <Route path="users/:id/edit" element={<UserFormPage />} />
      <Route path="audit" element={<AuditLogsPage />} />
      <Route path="jobs" element={<AdminJobsPage />} />
      <Route path="companies" element={<CompaniesPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
