import { Routes, Route, Navigate } from 'react-router-dom';
import { ContactsListPage } from './pages/ContactsListPage';
import { ContactDetailPage } from './pages/ContactDetailPage';
import { ContactFormPage } from './pages/ContactFormPage';

export function CrmRoutes() {
  return (
    <Routes>
      <Route index element={<ContactsListPage />} />
      <Route path="new" element={<ContactFormPage />} />
      <Route path=":id" element={<ContactDetailPage />} />
      <Route path=":id/edit" element={<ContactFormPage />} />
      <Route path="*" element={<Navigate to="/crm" replace />} />
    </Routes>
  );
}
