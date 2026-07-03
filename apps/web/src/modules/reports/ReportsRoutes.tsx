import { Route, Routes } from 'react-router-dom';
import { ReportsListPage } from './pages/ReportsListPage';

export function ReportsRoutes() {
  return (
    <Routes>
      <Route index element={<ReportsListPage />} />
    </Routes>
  );
}
