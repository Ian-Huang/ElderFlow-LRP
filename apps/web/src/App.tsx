import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ResidentsPage } from '@/pages/ResidentsPage';
import { ResidentDetailPage } from '@/pages/ResidentDetailPage';
import { ResidentFormPage } from '@/pages/ResidentFormPage';
import { ResidentImportPage } from '@/pages/ResidentImportPage';
import { CareRecordsPage } from '@/pages/CareRecordsPage';
import { MedicationsPage } from '@/pages/MedicationsPage';
import { MedicationDetailPage } from '@/pages/MedicationDetailPage';
import { MedicationFormPage } from '@/pages/MedicationFormPage';
import { CarePlansPage } from '@/pages/CarePlansPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SyncConflictsPage } from '@/pages/SyncConflictsPage';
import { CriticalConflictModal } from '@/components/CriticalConflictModal';
import { useRequireRole } from '@/hooks/useRequireRole';
import { useAuthStore } from '@/stores/authStore';
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
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        element={
          <PrivateRoute>
            <>
              <Layout />
              <CriticalConflictModal />
            </>
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="residents" element={<ResidentsPage />} />
        <Route path="residents/new" element={<ResidentFormPage />} />
        <Route path="residents/import" element={<ResidentImportPage />} />
        <Route path="residents/:id" element={<ResidentDetailPage />} />
        <Route path="residents/:id/edit" element={<ResidentFormPage />} />
        <Route path="care-records" element={<CareRecordsPage />} />
        <Route path="care-records/new" element={<CareRecordsPage />} />
        <Route path="care-records/:id/edit" element={<CareRecordsPage />} />
        <Route path="medications" element={<MedicationsPage />} />
        <Route path="medications/new" element={<MedicationFormPage />} />
        <Route path="medications/:id" element={<MedicationDetailPage />} />
        <Route path="medications/:id/edit" element={<MedicationFormPage />} />
        <Route path="care-plans" element={<CarePlansPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="sync/conflicts" element={<SyncConflictsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}