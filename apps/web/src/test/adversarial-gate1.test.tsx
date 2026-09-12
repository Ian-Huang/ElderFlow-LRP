import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { App } from '@/App';
import { DailyCompletionView } from '@/pages/reports/DailyCompletionView';
import { AlertsView } from '@/pages/reports/AlertsView';
import { ReportsLayout } from '@/pages/reports/ReportsLayout';
import { UserManagementView } from '@/pages/admin/UserManagementView';
import { useAuthStore } from '@/stores/authStore';
import { apiClient, setSimulateCsrfError, clearCsrfToken } from '@/api/apiClient';
import { handlers, validateCsrf } from '@/mocks/handlers';
import { setupReportTestServer } from './reports/testUtils';
import type { User, PaginatedResponse } from '@lrp/shared';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container" style={{ width: 600, height: 300 }}>
        {children}
      </div>
    ),
  };
});

function renderAppWithRoute(initialEntry: string) {
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

describe('Gate Challenger 1: Adversarial Functional & Security Boundary Suite', () => {
  setupReportTestServer();

  beforeEach(() => {
    vi.restoreAllMocks();
    clearCsrfToken();
    setSimulateCsrfError(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setSimulateCsrfError(false);
  });

  // =========================================================================
  // CHALLENGE 1: RBAC & Security Boundaries - Unauthorized Deep-Links
  // =========================================================================
  describe('Challenge 1.1: Unauthorized Deep-Links to /admin/*', () => {
    const adminDeepLinks = [
      '/admin/users',
      '/admin/settings',
      '/admin/health',
      '/admin/flags',
      '/admin/matrix',
      '/admin/nonexistent-subpath-404',
    ];

    it.each(adminDeepLinks)(
      'redirects unauthenticated user accessing %s to /login',
      async (path) => {
        useAuthStore.setState({
          user: null,
          userRole: null,
          isAuthenticated: false,
          isInitialized: true,
          accessToken: null,
          refreshToken: null,
          switchableUsers: [],
        });

        const { unmount } = renderAppWithRoute(path);

        await waitFor(() => {
          expect(screen.getByText('長照管理系統')).toBeInTheDocument();
          expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();
        });

        unmount();
      }
    );

    it.each(adminDeepLinks)(
      'redirects authenticated caregiver accessing %s to /403',
      async (path) => {
        useAuthStore.setState({
          user: {
            userId: 'user-caregiver-01',
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

        const { unmount } = renderAppWithRoute(path);

        await waitFor(() => {
          expect(screen.getByText(/403 - 存取被拒絕/i)).toBeInTheDocument();
          expect(screen.getByText(path)).toBeInTheDocument();
        });

        unmount();
      }
    );

    it.each(adminDeepLinks)(
      'redirects authenticated supervisor accessing %s to /403',
      async (path) => {
        useAuthStore.setState({
          user: {
            userId: 'user-supervisor-01',
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

        const { unmount } = renderAppWithRoute(path);

        await waitFor(() => {
          expect(screen.getByText(/403 - 存取被拒絕/i)).toBeInTheDocument();
          expect(screen.getByText(path)).toBeInTheDocument();
        });

        unmount();
      }
    );
  });

  // =========================================================================
  // CHALLENGE 1.2: Last Sysadmin Demotion / Deactivation / Deletion Guard
  // =========================================================================
  describe('Challenge 1.2: Last Sysadmin Protection in UserManagement', () => {
    const roleHandler = handlers.find(
      (h: any) => h.info.method === 'PATCH' && h.info.path === '/api/v1/users/:id/role'
    );
    const statusHandler = handlers.find(
      (h: any) => h.info.method === 'PATCH' && h.info.path === '/api/v1/users/:id/status'
    );
    const deleteHandler = handlers.find(
      (h: any) => h.info.method === 'DELETE' && h.info.path === '/api/v1/users/:id'
    );

    it('blocks demoting the last sysadmin via API and returns CANNOT_DEMOTE_LAST_SYSADMIN (400)', async () => {
      const req = new Request('http://localhost/api/v1/users/user-004/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'valid-token' },
        body: JSON.stringify({ role: 'admin' }),
      });

      const res = await (roleHandler as any).resolver({
        request: req,
        params: { id: 'user-004' },
        cookies: {},
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('CANNOT_DEMOTE_LAST_SYSADMIN');
    });

    it('blocks deactivating the last sysadmin via API and returns CANNOT_DEACTIVATE_LAST_SYSADMIN (400)', async () => {
      const req = new Request('http://localhost/api/v1/users/user-004/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'valid-token' },
        body: JSON.stringify({ status: 'inactive' }),
      });

      const res = await (statusHandler as any).resolver({
        request: req,
        params: { id: 'user-004' },
        cookies: {},
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('CANNOT_DEACTIVATE_LAST_SYSADMIN');
    });

    it('blocks deleting the last sysadmin via API and returns CANNOT_REMOVE_LAST_SYSADMIN (400)', async () => {
      const req = new Request('http://localhost/api/v1/users/user-004', {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': 'valid-token' },
      });

      const res = await (deleteHandler as any).resolver({
        request: req,
        params: { id: 'user-004' },
        cookies: {},
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('CANNOT_REMOVE_LAST_SYSADMIN');
    });

    it('UserManagementView rolls back state and displays warning when demoting last sysadmin fails', async () => {
      const user = userEvent.setup();
      const mockSysadmin: User = {
        userId: 'user-004',
        username: 'sysadmin1',
        name: '王系統管理員',
        role: 'sysadmin',
        isLocalStaff: true,
        createdAt: '2024-01-01T00:00:00Z',
        isActive: true,
        status: 'active',
      };

      vi.spyOn(apiClient, 'get').mockResolvedValue({
        success: true,
        data: {
          items: [mockSysadmin],
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        } as PaginatedResponse<User>,
      });

      vi.spyOn(apiClient, 'patch').mockRejectedValueOnce({
        code: 'CANNOT_DEMOTE_LAST_SYSADMIN',
        message: '系統必須保留至少一位啟用的系統管理員，無法調降最後一名管理員權限',
      });

      const queryClient = new QueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <UserManagementView />
        </QueryClientProvider>
      );

      const dropdown = await screen.findByLabelText('調整 王系統管理員 角色');
      await user.selectOptions(dropdown, 'supervisor');

      await waitFor(() => {
        expect(
          screen.getByText('系統必須保留至少一位啟用的系統管理員，無法調降最後一名管理員權限')
        ).toBeInTheDocument();
        expect(dropdown).toHaveValue('sysadmin');
      });
    });
  });

  // =========================================================================
  // CHALLENGE 1.3: Mutating state with CSRF simulation enabled
  // =========================================================================
  describe('Challenge 1.3: CSRF Simulation Validation', () => {
    it('returns HTTP 403 CSRF_INVALID on all mutating methods when X-Simulate-CSRF-Error is true', () => {
      const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
      for (const method of methods) {
        const req = new Request('http://localhost/api/v1/users/user-001/role', {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'some-token',
            'X-Simulate-CSRF-Error': 'true',
          },
        });
        const res = validateCsrf(req);
        expect(res).not.toBeNull();
        expect(res?.status).toBe(403);
      }
    });

    it('returns HTTP 403 CSRF_INVALID on mutating requests without X-CSRF-Token', () => {
      const req = new Request('http://localhost/api/v1/reports/alerts/alert-001', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'resolved' }),
      });
      const res = validateCsrf(req);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(403);
    });

    it('allows safe GET requests even when X-Simulate-CSRF-Error is true', () => {
      const req = new Request('http://localhost/api/v1/reports/daily-completion', {
        method: 'GET',
        headers: {
          'X-Simulate-CSRF-Error': 'true',
        },
      });
      const res = validateCsrf(req);
      expect(res).toBeNull();
    });
  });

  // =========================================================================
  // CHALLENGE 2.1: Data & Date Filtering - Boundary dates in DailyCompletionView
  // =========================================================================
  describe('Challenge 2.1: Boundary Dates in DailyCompletionView', () => {
    function renderDailyView() {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <DailyCompletionView />
          </MemoryRouter>
        </QueryClientProvider>
      );
    }

    it('handles leap year date (2024-02-29) and navigates to 2024-03-01 on next day', async () => {
      renderDailyView();

      const input = (await screen.findByLabelText(/照護日期/i)) as HTMLInputElement;
      expect(input).toBeInTheDocument();

      // Set date to leap day 2024-02-29
      fireEvent.change(input, { target: { value: '2024-02-29' } });
      expect(input.value).toBe('2024-02-29');

      // Click "後一天"
      const nextBtn = screen.getByRole('button', { name: '後一天' });
      fireEvent.click(nextBtn);

      // Verify that after 2024-02-29 comes 2024-03-01
      expect(input.value).toBe('2024-03-01');

      // Click "前一天" twice: 2024-03-01 -> 2024-02-29 -> 2024-02-28
      const prevBtn = screen.getByRole('button', { name: '前一天' });
      fireEvent.click(prevBtn);
      expect(input.value).toBe('2024-02-29');
      fireEvent.click(prevBtn);
      expect(input.value).toBe('2024-02-28');
    });

    it('handles non-leap year (2026-02-28) transition directly to 2026-03-01', async () => {
      renderDailyView();

      const input = (await screen.findByLabelText(/照護日期/i)) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '2026-02-28' } });
      expect(input.value).toBe('2026-02-28');

      const nextBtn = screen.getByRole('button', { name: '後一天' });
      fireEvent.click(nextBtn);
      expect(input.value).toBe('2026-03-01');
    });

    it('handles year boundary transition (2025-12-31 to 2026-01-01)', async () => {
      renderDailyView();

      const input = (await screen.findByLabelText(/照護日期/i)) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '2025-12-31' } });
      expect(input.value).toBe('2025-12-31');

      const nextBtn = screen.getByRole('button', { name: '後一天' });
      fireEvent.click(nextBtn);
      expect(input.value).toBe('2026-01-01');

      const prevBtn = screen.getByRole('button', { name: '前一天' });
      fireEvent.click(prevBtn);
      expect(input.value).toBe('2025-12-31');
    });

    it('EMPIRICAL FINDING: empty date string causes RangeError in new Date("").toISOString() without guard', () => {
      // Direct empirical verification of the date arithmetic function in DailyCompletionView:
      const selectedDate = '';
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 1);

      expect(() => d.toISOString()).toThrowError(RangeError);
    });

    it('EMPIRICAL FINDING: ROC 115 year string is rejected by HTML5 input type="date" and misparsed by standard Date', () => {
      // 1. In HTML5 <input type="date">, setting value to "115/09/04" or "115-09-04" is invalid
      renderDailyView();
      const input = screen.getByLabelText(/照護日期/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '115/09/04' } });
      expect(input.value).toBe(''); // Sanitized to empty

      // 2. new Date("115/09/04") is parsed as year 115 AD, not 2026 AD
      const rocDate = new Date('115/09/04');
      expect(rocDate.getFullYear()).toBe(115); // Not 2026!
    });
  });

  // =========================================================================
  // CHALLENGE 2.2: Empty Alert Queries & Rapid Tab Switching
  // =========================================================================
  describe('Challenge 2.2: Empty Alert Queries & Rapid Tab Switching', () => {
    it('gracefully renders empty state when alerts query returns empty result or search has no match', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AlertsView />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Wait for initial alerts to load
      await waitFor(() => {
        expect(screen.getByTestId('alert-item-ALT-001')).toBeInTheDocument();
      });

      // Type a search query that matches no alert
      const searchInput = screen.getByPlaceholderText(/搜尋住民姓名、床號或警示內容/i);
      fireEvent.change(searchInput, { target: { value: 'XYZ_NONEXISTENT_RESIDENT_9999' } });

      await waitFor(() => {
        expect(screen.getByText('目前無符合條件之警示事件')).toBeInTheDocument();
        expect(screen.getByText('全院各樓層住民生命徵象與照護活動運作正常')).toBeInTheDocument();
      });
    });

    it('rapid tab switching across report tabs completes without crash', async () => {
      const user = userEvent.setup();
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/reports']}>
            <ReportsLayout />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const dailyTab = screen.getByTestId('tab-daily-completion');
      const residentTab = screen.getByTestId('tab-resident-summary');
      const alertsTab = screen.getByTestId('tab-alerts');
      const auditTab = screen.getByTestId('tab-audit-trail');

      // Switch tabs sequentially
      await user.click(residentTab);
      expect(residentTab).toHaveAttribute('aria-selected', 'true');

      await user.click(alertsTab);
      expect(alertsTab).toHaveAttribute('aria-selected', 'true');

      await user.click(auditTab);
      expect(auditTab).toHaveAttribute('aria-selected', 'true');

      await user.click(dailyTab);
      expect(dailyTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});
