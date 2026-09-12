import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '@/App';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useAuthStore } from '@/stores/authStore';

function renderWithRouter(initialEntry = '/admin') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('RBAC Guards & 403 Forbidden Access (Feature F13, AC4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated user accessing /admin to /login with state', async () => {
    useAuthStore.setState({
      user: null,
      userRole: null,
      isAuthenticated: false,
      isInitialized: true,
      accessToken: null,
      refreshToken: null,
      switchableUsers: [],
    });

    renderWithRouter('/admin');

    await waitFor(() => {
      expect(screen.getByText('長照管理系統')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();
    });
  });

  it('redirects authenticated caregiver accessing /admin to /403', async () => {
    useAuthStore.setState({
      user: {
        userId: 'user-001',
        username: 'caregiver1',
        name: '陳照護',
        role: 'caregiver',
        isLocalStaff: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      userRole: 'caregiver',
      isAuthenticated: true,
      isInitialized: true,
      accessToken: 'token-cg',
      refreshToken: 'refresh-cg',
      switchableUsers: [],
    });

    renderWithRouter('/admin');

    await waitFor(() => {
      expect(screen.getByText(/403 - 存取被拒絕/i)).toBeInTheDocument();
      expect(screen.getByText(/您目前的帳號身分無權存取此頁面/i)).toBeInTheDocument();
    });
  });

  it('redirects authenticated supervisor accessing /admin/users to /403', async () => {
    useAuthStore.setState({
      user: {
        userId: 'user-002',
        username: 'supervisor1',
        name: '林主管',
        role: 'supervisor',
        isLocalStaff: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      userRole: 'supervisor',
      isAuthenticated: true,
      isInitialized: true,
      accessToken: 'token-sp',
      refreshToken: 'refresh-sp',
      switchableUsers: [],
    });

    renderWithRouter('/admin/users');

    await waitFor(() => {
      expect(screen.getByText(/403 - 存取被拒絕/i)).toBeInTheDocument();
    });
  });

  it('allows authenticated admin to access /admin and renders AdminLayout', async () => {
    useAuthStore.setState({
      user: {
        userId: 'user-003',
        username: 'admin1',
        name: '張管理員',
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

    renderWithRouter('/admin/users');

    await waitFor(() => {
      expect(screen.getByText('系統管理中心')).toBeInTheDocument();
      expect(screen.getAllByText('使用者管理').length).toBeGreaterThan(0);
      expect(screen.getByText('系統健康監控')).toBeInTheDocument();
      expect(screen.getByText('功能旗標管理')).toBeInTheDocument();
      expect(screen.getByText('核心參數設定')).toBeInTheDocument();
      expect(screen.getByText('角色權限矩陣')).toBeInTheDocument();
    });
  });

  it('allows authenticated sysadmin to access /admin', async () => {
    useAuthStore.setState({
      user: {
        userId: 'user-004',
        username: 'sysadmin1',
        name: '王系統管理員',
        role: 'sysadmin',
        isLocalStaff: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      userRole: 'sysadmin',
      isAuthenticated: true,
      isInitialized: true,
      accessToken: 'token-sysadmin',
      refreshToken: 'refresh-sysadmin',
      switchableUsers: [],
    });

    renderWithRouter('/admin/users');

    await waitFor(() => {
      expect(screen.getByText('系統管理中心')).toBeInTheDocument();
      expect(screen.getAllByText('系統管理員').length).toBeGreaterThan(0);
    });
  });

  it('ForbiddenPage renders attempted path and returns to dashboard button', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      user: {
        userId: 'user-001',
        username: 'caregiver1',
        name: '陳照護',
        role: 'caregiver',
        isLocalStaff: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      userRole: 'caregiver',
      isAuthenticated: true,
      isInitialized: true,
      accessToken: 'token-cg',
      refreshToken: 'refresh-cg',
      switchableUsers: [],
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/403', state: { from: '/admin/settings' } }]}>
        <Routes>
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/dashboard" element={<div>儀表板頁面</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/403 - 存取被拒絕/i)).toBeInTheDocument();
    expect(screen.getByText('/admin/settings')).toBeInTheDocument();
    expect(screen.getByText(/陳照護/i)).toBeInTheDocument();

    const returnBtn = screen.getByRole('link', { name: /返回儀表板/i });
    expect(returnBtn).toBeInTheDocument();
    await user.click(returnBtn);

    expect(screen.getByText('儀表板頁面')).toBeInTheDocument();
  });

  it('SettingsPage displays prominent Admin Portal banner for admin and hides for caregiver', async () => {
    const queryClient = new QueryClient();

    // 1. As Caregiver: banner should NOT be present
    useAuthStore.setState({
      user: {
        userId: 'user-001',
        username: 'caregiver1',
        name: '陳照護',
        role: 'caregiver',
        isLocalStaff: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      userRole: 'caregiver',
      isAuthenticated: true,
      isInitialized: true,
      accessToken: 'token-cg',
      refreshToken: 'refresh-cg',
      switchableUsers: [],
    });

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.queryByText(/進入系統管理中心 \(\/admin\)/i)).not.toBeInTheDocument();
    unmount();

    // 2. As Admin: banner MUST be present
    useAuthStore.setState({
      user: {
        userId: 'user-003',
        username: 'admin1',
        name: '張管理員',
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

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/系統管理中心 \(Admin Portal\)/i)).toBeInTheDocument();
    expect(screen.getByText(/進入系統管理中心 \(\/admin\)/i)).toBeInTheDocument();
  });
});
