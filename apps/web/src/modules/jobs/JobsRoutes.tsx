import { Routes, Route, Navigate } from 'react-router-dom';
import { JobsListPage } from './pages/JobsListPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { JobFormPage } from './pages/JobFormPage';

export function JobsRoutes() {
  return (
    <Routes>
      <Route index element={<JobsListPage />} />
      <Route path="new" element={<JobFormPage />} />
      <Route path=":id" element={<JobDetailPage />} />
      <Route path=":id/edit" element={<JobFormPage />} />
      <Route path="*" element={<Navigate to="/jobs" replace />} />
    </Routes>
  );
}
