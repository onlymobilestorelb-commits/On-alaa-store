import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Storefront from './pages/Storefront';
import AdminDashboard from './pages/AdminDashboard';
import AdminAuthGate from './components/admin/AdminAuthGate';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/storefront" element={<Storefront />} />
        <Route path="/" element={<Storefront />} />
        <Route
          path="/admin/*"
          element={
            <AdminAuthGate>
              <AdminDashboard />
            </AdminAuthGate>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
