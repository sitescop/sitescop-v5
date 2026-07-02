import { Route, Routes } from 'react-router-dom';
import { InspectionsListPage } from './pages/InspectionsListPage';
import { InspectionWorkspacePage } from './pages/InspectionWorkspacePage';

export function InspectionsRoutes() {
  return (
    <Routes>
      <Route index element={<InspectionsListPage />} />
      <Route path=":id" element={<InspectionWorkspacePage />} />
    </Routes>
  );
}
