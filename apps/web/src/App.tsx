import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ResidentsPage } from '@/pages/ResidentsPage';
import { ResidentDetailPage } from '@/pages/ResidentDetailPage';
import { CareRecordsPage } from '@/pages/CareRecordsPage';
import { MedicationsPage } from '@/pages/MedicationsPage';
import { CarePlansPage } from '@/pages/CarePlansPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="residents" element={<ResidentsPage />} />
        <Route path="residents/:id" element={<ResidentDetailPage />} />
        <Route path="care-records" element={<CareRecordsPage />} />
        <Route path="medications" element={<MedicationsPage />} />
        <Route path="care-plans" element={<CarePlansPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}