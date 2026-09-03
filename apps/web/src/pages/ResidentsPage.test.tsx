import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResidentsPage } from './ResidentsPage';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import apiClient from '@/api/apiClient';

function renderPage(searchQuery = '') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  window.history.pushState({}, 'Test', `/residents${searchQuery}`);

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ResidentsPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('ResidentsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        userId: 'admin-1',
        username: 'admin',
        name: '管理員',
        role: 'admin',
        isLocalStaff: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      userRole: 'admin',
      isAuthenticated: true,
      isInitialized: true,
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      switchableUsers: [],
    });

    useSyncStore.setState({
      isOnline: true,
      isSyncing: false,
      lastSyncedAt: null,
      pendingChanges: 0,
      conflicts: [],
      syncErrors: [],
    });
  });

  it('renders page header and action buttons for admin', async () => {
    renderPage();

    expect(screen.getByText('住民基本資料管理')).toBeInTheDocument();
    expect(screen.getByText('新增住民')).toBeInTheDocument();
    expect(screen.getByText('批次匯入')).toBeInTheDocument();
    expect(screen.getByText('匯出清冊')).toBeInTheDocument();
  });

  it('filters residents by search keyword', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: {
        items: [
          {
            residentId: '0040',
            name: '周吳綺緣',
            gender: 'Female',
            dateOfBirth: '1946-01-13',
            address: '台北市',
            insuranceId: 'A201529776',
            admissionDate: '2022-01-21',
            status: 'Active',
            hasThreePipe: true,
            bedNumber: '1-1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 12,
        totalPages: 1,
      },
    } as never);

    renderPage('?q=周吳');

    expect(await screen.findByText('周吳綺緣')).toBeInTheDocument();
    expect(screen.getByText('0040')).toBeInTheDocument();
    expect(screen.getByText('1-1')).toBeInTheDocument();
  });

  it('switches between Table and Grid view modes', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            residentId: '0066',
            name: '賴明玉',
            gender: 'Female',
            dateOfBirth: '1959-06-05',
            address: '台北市',
            insuranceId: 'A221084054',
            admissionDate: '2025-01-25',
            status: 'Active',
            hasThreePipe: true,
            bedNumber: '1-2',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 12,
        totalPages: 1,
      },
    } as never);

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('賴明玉')).toBeInTheDocument();

    const gridBtn = screen.getByRole('button', { name: /切換卡片檢視/i });
    await user.click(gridBtn);

    expect(screen.getByText('編號：0066')).toBeInTheDocument();
  });
});
