import { Routes, Route, Navigate } from 'react-router-dom';
import { InvoicesListPage } from './pages/InvoicesListPage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';

export function AccountsRoutes() {
  return (
    <Routes>
      <Route index element={<InvoicesListPage />} />
      <Route path=":id" element={<InvoiceDetailPage />} />
      <Route path="*" element={<Navigate to="/accounts" replace />} />
    </Routes>
  );
}
