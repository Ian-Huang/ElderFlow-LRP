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
import { useRequireRole } from '@/hooks/useRequireRole';
import type { UserRole } from '@lrp/shared';

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) {
  const { isAllowed, isLoading } = useRequireRole(allowedRoles || ['caregiver', 'supervisor', 'admin', 'sysadmin']);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" aria-label="載入中" />
      </div>
    );
  }

  if (!isAllowed) {
    return null; // Redirect handled by useRequireRole
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
        <Route
          path="dashboard"
          element={
            <PrivateRoute allowedRoles={['caregiver', 'supervisor', 'admin', 'sysadmin']}>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="residents"
          element={
            <PrivateRoute allowedRoles={['caregiver', 'supervisor', 'admin', 'sysadmin']}>
              <ResidentsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="residents/:id"
          element={
            <PrivateRoute allowedRoles={['caregiver', 'supervisor', 'admin', 'sysadmin']}>
              <ResidentDetailPage />
            </PrivateRoute>
          }
        />
        <Route
          path="care-records"
          element={
            <PrivateRoute allowedRoles={['caregiver', 'supervisor', 'admin', 'sysadmin']}>
              <CareRecordsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="medications"
          element={
            <PrivateRoute allowedRoles={['caregiver', 'supervisor', 'admin', 'sysadmin']}>
              <MedicationsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="care-plans"
          element={
            <PrivateRoute allowedRoles={['supervisor', 'admin', 'sysadmin']}>
              <CarePlansPage />
            </PrivateRoute>
          }
        />
        <Route
          path="reports"
          element={
            <PrivateRoute allowedRoles={['supervisor', 'admin', 'sysadmin']}>
              <ReportsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="settings"
          element={
            <PrivateRoute allowedRoles={['admin', 'sysadmin']}>
              <SettingsPage />
            </PrivateRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}