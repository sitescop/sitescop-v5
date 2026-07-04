import { Route, Routes } from 'react-router-dom';
import { CalendarPage } from './pages/CalendarPage';

export function CalendarRoutes() {
  return (
    <Routes>
      <Route index element={<CalendarPage />} />
    </Routes>
  );
}
