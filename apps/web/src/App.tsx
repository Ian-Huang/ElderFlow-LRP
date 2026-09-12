import { lazy, Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import { CarePlanDetailPage } from '@/pages/CarePlanDetailPage';
import { CarePlanFormPage } from '@/pages/CarePlanFormPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SyncConflictsPage } from '@/pages/SyncConflictsPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { CriticalConflictModal } from '@/components/CriticalConflictModal';
import { AuditToolkitHub, AuditReportDispatcher } from '@/pages/audit-toolkit';
import { useRequireRole } from '@/hooks/useRequireRole';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@lrp/shared';

const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const AdminLayout = lazy(() =>
  import('@/pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout }))
);
const UserManagementView = lazy(() =>
  import('@/pages/admin/UserManagementView').then((m) => ({ default: m.UserManagementView }))
);
const SystemHealthView = lazy(() =>
  import('@/pages/admin/SystemHealthView').then((m) => ({ default: m.SystemHealthView }))
);
const FeatureFlagsView = lazy(() =>
  import('@/pages/admin/FeatureFlagsView').then((m) => ({ default: m.FeatureFlagsView }))
);
const SystemSettingsView = lazy(() =>
  import('@/pages/admin/SystemSettingsView').then((m) => ({ default: m.SystemSettingsView }))
);
const RoleMatrixView = lazy(() =>
  import('@/pages/admin/RoleMatrixView').then((m) => ({ default: m.RoleMatrixView }))
);

function PrivateRoute({ children, allowedRoles }: { children?: ReactNode; allowedRoles?: UserRole[] }) {
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

  return children ? <>{children}</> : <Outlet />;
}

export function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">載入中...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          element={
            <>
              <Layout />
              <CriticalConflictModal />
            </>
          }
        >
          {/* Public / Unauthenticated accessible routes: Audit Toolkit (免登入即印即用) */}
          <Route path="audit-toolkit" element={<AuditToolkitHub />} />
          <Route path="audit-toolkit/:reportId" element={<AuditReportDispatcher />} />

          {/* Protected routes: 需要登入驗證 */}
          <Route element={<PrivateRoute />}>
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
            <Route path="care-plans/new" element={<CarePlanFormPage />} />
            <Route path="care-plans/:id" element={<CarePlanDetailPage />} />
            <Route path="care-plans/:id/edit" element={<CarePlanFormPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="sync/conflicts" element={<SyncConflictsPage />} />
            <Route
              path="admin"
              element={
                <PrivateRoute allowedRoles={['admin', 'sysadmin']}>
                  <AdminLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<UserManagementView />} />
              <Route path="health" element={<SystemHealthView />} />
              <Route path="flags" element={<FeatureFlagsView />} />
              <Route path="settings" element={<SystemSettingsView />} />
              <Route path="matrix" element={<RoleMatrixView />} />
              <Route path="*" element={<Navigate to="users" replace />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}