import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserManagementView } from '@/pages/admin/UserManagementView';
import { apiClient } from '@/api/apiClient';
import type { User, PaginatedResponse } from '@lrp/shared';

const mockUsersList: User[] = [
  {
    userId: 'user-001',
    username: 'caregiver1',
    name: '陳照護',
    role: 'caregiver',
    isLocalStaff: true,
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-01-15T08:00:00Z',
    isActive: true,
    status: 'active',
  },
  {
    userId: 'user-002',
    username: 'supervisor1',
    name: '林主管',
    role: 'supervisor',
    isLocalStaff: true,
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-01-15T07:30:00Z',
    isActive: true,
    status: 'active',
  },
  {
    userId: 'user-003',
    username: 'admin1',
    name: '張管理員',
    role: 'admin',
    isLocalStaff: false,
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-01-14T18:00:00Z',
    isActive: true,
    status: 'active',
  },
  {
    userId: 'user-004',
    username: 'sysadmin1',
    name: '王系統管理員',
    role: 'sysadmin',
    isLocalStaff: true,
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-01-15T09:00:00Z',
    isActive: true,
    status: 'active',
  },
];

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UserManagementView />
    </QueryClientProvider>
  );
}

describe('User Management View (Features F6, F7, F8, F21)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders user list, role dropdowns, status badges and pagination', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: {
        items: mockUsersList,
        total: 4,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      } as PaginatedResponse<User>,
    });

    renderView();

    expect(await screen.findByText('陳照護')).toBeInTheDocument();
    expect(screen.getByText('caregiver1')).toBeInTheDocument();
    expect(screen.getByText('林主管')).toBeInTheDocument();
    expect(screen.getByText('張管理員')).toBeInTheDocument();
    expect(screen.getByText('王系統管理員')).toBeInTheDocument();

    // Check badges
    expect(screen.getAllByText('本國籍').length).toBe(3);
    expect(screen.getByText('外籍人員')).toBeInTheDocument();
    expect(screen.getAllByText('啟用中').length).toBeGreaterThan(0);
    expect(screen.getByText('第 1 / 1 頁，共 4 筆記錄')).toBeInTheDocument();
  });

  it('filters users by search query and role filter', async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: [mockUsersList[0]],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      } as PaginatedResponse<User>,
    });

    renderView();

    const searchInput = await screen.findByLabelText('搜尋帳號或姓名');
    await user.type(searchInput, '陳照護');

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith('/users', expect.objectContaining({ search: '陳照護' }));
    });

    const roleSelect = screen.getByLabelText('依角色篩選');
    await user.selectOptions(roleSelect, 'caregiver');

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith('/users', expect.objectContaining({ role: 'caregiver' }));
    });
  });

  it('validates user creation form with Zod schema and shows error messages', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: mockUsersList,
        total: 4,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      } as PaginatedResponse<User>,
    });

    renderView();

    const openBtn = await screen.findByRole('button', { name: /新增使用者/i });
    await user.click(openBtn);

    expect(screen.getByText('新增系統使用者')).toBeInTheDocument();

    // Submit without filling required fields
    const submitBtn = screen.getByRole('button', { name: /確認建立/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/帳號.*至少需 3 個字元/i)).toBeInTheDocument();
      expect(screen.getByText(/姓名為必填/i)).toBeInTheDocument();
    });
  });

  it('successfully creates new user via POST /api/v1/users', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: mockUsersList,
        total: 4,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      } as PaginatedResponse<User>,
    });

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      data: {
        userId: 'user-new',
        username: 'new_nurse',
        name: '吳護理師',
        role: 'caregiver',
        isLocalStaff: true,
        createdAt: '2024-01-16T00:00:00Z',
        isActive: true,
        status: 'active',
      } as User,
    });

    renderView();

    const openBtn = await screen.findByRole('button', { name: /新增使用者/i });
    await user.click(openBtn);

    await user.type(screen.getByLabelText('使用者帳號'), 'new_nurse');
    await user.type(screen.getByLabelText('使用者姓名'), '吳護理師');
    await user.type(screen.getByLabelText('初始密碼'), 'pass123456');
    await user.selectOptions(screen.getByLabelText('指派角色'), 'caregiver');

    const submitBtn = screen.getByRole('button', { name: /確認建立/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/users', {
        username: 'new_nurse',
        name: '吳護理師',
        password: 'pass123456',
        role: 'caregiver',
        isLocalStaff: true,
      });
      expect(screen.getByText(/使用者「吳護理師」建立成功！/i)).toBeInTheDocument();
    });
  });

  it('handles duplicate username error from backend', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: mockUsersList,
        total: 4,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      } as PaginatedResponse<User>,
    });

    vi.spyOn(apiClient, 'post').mockRejectedValueOnce({
      code: 'DUPLICATE_USERNAME',
      message: '使用者帳號已存在',
    });

    renderView();

    const openBtn = await screen.findByRole('button', { name: /新增使用者/i });
    await user.click(openBtn);

    await user.type(screen.getByLabelText('使用者帳號'), 'caregiver1');
    await user.type(screen.getByLabelText('使用者姓名'), '陳二號');

    const submitBtn = screen.getByRole('button', { name: /確認建立/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('使用者帳號已存在')).toBeInTheDocument();
    });
  });

  it('updates user role via inline select', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: mockUsersList,
        total: 4,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      } as PaginatedResponse<User>,
    });

    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      success: true,
      data: { ...mockUsersList[0], role: 'supervisor' } as User,
    });

    renderView();

    const roleSelect = await screen.findByLabelText('調整 陳照護 角色');
    await user.selectOptions(roleSelect, 'supervisor');

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/users/user-001/role', { role: 'supervisor' });
      expect(screen.getByText(/已成功將使用者身分調整為 主管/i)).toBeInTheDocument();
    });
  });

  it('protects last sysadmin when attempting role demotion', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: mockUsersList,
        total: 4,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      } as PaginatedResponse<User>,
    });

    vi.spyOn(apiClient, 'patch').mockRejectedValueOnce({
      code: 'CANNOT_DEMOTE_LAST_SYSADMIN',
      message: '系統必須保留至少一位啟用的系統管理員，無法調降最後一名管理員權限',
    });

    renderView();

    const sysadminRoleSelect = await screen.findByLabelText('調整 王系統管理員 角色');
    await user.selectOptions(sysadminRoleSelect, 'admin');

    await waitFor(() => {
      expect(
        screen.getByText('系統必須保留至少一位啟用的系統管理員，無法調降最後一名管理員權限')
      ).toBeInTheDocument();
      // Verifies roll back
      expect(sysadminRoleSelect).toHaveValue('sysadmin');
    });
  });

  it('toggles user status via inline button and protects last sysadmin', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: mockUsersList,
        total: 4,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      } as PaginatedResponse<User>,
    });

    // 1. Successful toggle for caregiver
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      success: true,
      data: { ...mockUsersList[0], isActive: false, status: 'inactive' } as User,
    });

    renderView();

    const caregiverStatusBtn = await screen.findByLabelText('切換 陳照護 帳號狀態');
    await user.click(caregiverStatusBtn);

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/users/user-001/status', {
        status: 'inactive',
        isActive: false,
      });
      expect(screen.getByText(/使用者狀態已切換為「停用」/i)).toBeInTheDocument();
    });

    // 2. Prevent deactivating last sysadmin
    vi.spyOn(apiClient, 'patch').mockRejectedValueOnce({
      code: 'CANNOT_DEACTIVATE_LAST_SYSADMIN',
      message: '系統必須保留至少一位啟用的系統管理員，無法停用最後一名管理員帳號',
    });

    const sysadminStatusBtn = screen.getByLabelText('切換 王系統管理員 帳號狀態');
    await user.click(sysadminStatusBtn);

    await waitFor(() => {
      expect(
        screen.getByText('系統必須保留至少一位啟用的系統管理員，無法停用最後一名管理員帳號')
      ).toBeInTheDocument();
    });
  });

  it('protects last sysadmin when attempting deletion', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: mockUsersList,
        total: 4,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      } as PaginatedResponse<User>,
    });

    vi.spyOn(apiClient, 'delete').mockRejectedValueOnce({
      code: 'CANNOT_REMOVE_LAST_SYSADMIN',
      message: '系統必須保留至少一位啟用的系統管理員，無法刪除最後一名管理員帳號',
    });

    renderView();

    const deleteBtn = await screen.findByLabelText('刪除 王系統管理員');
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(
        screen.getByText('系統必須保留至少一位啟用的系統管理員，無法刪除最後一名管理員帳號')
      ).toBeInTheDocument();
    });
  });
});
