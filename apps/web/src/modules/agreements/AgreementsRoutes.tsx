import { Routes, Route, Navigate } from 'react-router-dom';
import { AgreementsListPage } from './pages/AgreementsListPage';
import { AgreementDetailPage } from './pages/AgreementDetailPage';
import { AgreementFormPage } from './pages/AgreementFormPage';
import { AgreementTemplatesPage } from './pages/AgreementTemplatesPage';

export function AgreementsRoutes() {
  return (
    <Routes>
      <Route index element={<AgreementsListPage />} />
      <Route path="send" element={<AgreementFormPage />} />
      <Route path="new" element={<AgreementFormPage />} />
      <Route path="templates" element={<AgreementTemplatesPage />} />
      <Route path=":id" element={<AgreementDetailPage />} />
      <Route path=":id/edit" element={<AgreementFormPage />} />
      <Route path="*" element={<Navigate to="/agreements" replace />} />
    </Routes>
  );
}
