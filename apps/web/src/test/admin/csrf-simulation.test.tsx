import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { UserManagementView } from '@/pages/admin/UserManagementView';
import { FeatureFlagsView } from '@/pages/admin/FeatureFlagsView';
import { SystemSettingsView } from '@/pages/admin/SystemSettingsView';
import { apiClient, setSimulateCsrfError } from '@/api/apiClient';
import { useAuthStore } from '@/stores/authStore';
import type { User, PaginatedResponse, FeatureFlag, SystemSettings } from '@lrp/shared';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return queryClient;
}

describe('CSRF Simulation & Security 403 Protection (Feature F14, AC4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setSimulateCsrfError(false);
    useAuthStore.setState({
      user: {
        userId: 'admin-1',
        username: 'admin1',
        name: '管理員',
        role: 'admin',
        isLocalStaff: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      userRole: 'admin',
      isAuthenticated: true,
      isInitialized: true,
      accessToken: 'token-admin',
      refreshToken: 'refresh-admin',
      switchableUsers: [],
    });
  });

  afterEach(() => {
    setSimulateCsrfError(false);
  });

  it('toggles CSRF simulation switch in AdminLayout header and updates localStorage', async () => {
    const user = userEvent.setup();
    const queryClient = createWrapper();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/users']}>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="users" element={<div>使用者管理內容</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const csrfToggle = screen.getByLabelText('模擬 CSRF 驗證失敗開關');
    expect(csrfToggle).not.toBeChecked();
    expect(screen.getByText('狀態：未啟用 (正常)')).toBeInTheDocument();

    // Toggle ON
    await user.click(csrfToggle);

    expect(csrfToggle).toBeChecked();
    expect(screen.getByText('狀態：已啟用 (403)')).toBeInTheDocument();
    expect(localStorage.setItem).toHaveBeenCalledWith('SIMULATE_CSRF_ERROR', 'true');
    expect(screen.getByText(/CSRF 驗證失敗模擬已開啟/i)).toBeInTheDocument();

    // Toggle OFF
    await user.click(csrfToggle);
    expect(csrfToggle).not.toBeChecked();
    expect(screen.getByText('狀態：未啟用 (正常)')).toBeInTheDocument();
    expect(localStorage.removeItem).toHaveBeenCalledWith('SIMULATE_CSRF_ERROR');
  });

  it('triggers security warning alert in UserManagementView when mutating API call receives 403 CSRF_INVALID', async () => {
    const user = userEvent.setup();
    const queryClient = createWrapper();

    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            userId: 'user-001',
            username: 'caregiver1',
            name: '陳照護',
            role: 'caregiver',
            isLocalStaff: true,
            createdAt: '2024-01-01T00:00:00Z',
            isActive: true,
            status: 'active',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      } as PaginatedResponse<User>,
    });

    // Simulate CSRF 403 rejection from backend
    vi.spyOn(apiClient, 'patch').mockRejectedValueOnce({
      code: 'CSRF_INVALID',
      message: 'CSRF 驗證失敗',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <UserManagementView />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const roleSelect = await screen.findByLabelText('調整 陳照護 角色');
    await user.selectOptions(roleSelect, 'supervisor');

    await waitFor(() => {
      expect(screen.getByText(/安全性警示：CSRF 驗證失敗 \(403 Forbidden\)/i)).toBeInTheDocument();
      // Verifies roll back
      expect(roleSelect).toHaveValue('caregiver');
    });
  });

  it('triggers security warning in FeatureFlagsView when mutating call receives CSRF error', async () => {
    const user = userEvent.setup();
    const queryClient = createWrapper();

    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: [
        {
          id: 'offline_sync_v2',
          name: '離線同步引擎 v2',
          description: '離線同步測試旗標',
          enabled: true,
          rolloutPercentage: 100,
          environment: 'production',
        },
      ] as FeatureFlag[],
    });

    vi.spyOn(apiClient, 'patch').mockRejectedValueOnce({
      code: 'CSRF_INVALID',
      message: 'CSRF 驗證失敗',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureFlagsView />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const flagToggle = await screen.findByLabelText('切換 離線同步引擎 v2 狀態');
    await user.click(flagToggle);

    await waitFor(() => {
      expect(screen.getByText(/安全性警示：CSRF 驗證失敗 \(403 Forbidden\)/i)).toBeInTheDocument();
      // Verifies roll back
      expect(flagToggle).toBeChecked();
    });
  });

  it('triggers security warning in SystemSettingsView when saving settings with CSRF failure', async () => {
    const user = userEvent.setup();
    const queryClient = createWrapper();

    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        syncIntervalSeconds: 30,
        lockDurationHours: 24,
        lowStockThreshold: 15,
        pdfFont: 'Noto Sans TC',
        updatedAt: '2024-01-01T00:00:00Z',
        updatedBy: 'admin',
      } as SystemSettings,
    });

    vi.spyOn(apiClient, 'patch').mockRejectedValueOnce({
      code: 'CSRF_INVALID',
      message: 'CSRF 驗證失敗',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SystemSettingsView />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const saveBtn = await screen.findByRole('button', { name: /儲存設定/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/安全性警示：CSRF 驗證失敗 \(403 Forbidden\)/i)).toBeInTheDocument();
    });
  });
});
