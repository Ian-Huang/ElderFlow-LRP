import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { CareRecordsPage } from '@/pages/CareRecordsPage';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import type { User } from '@lrp/shared';
import apiClient from '@/api/apiClient';

const mockUser: User = {
  userId: 'user-001',
  username: 'caregiver1',
  name: '陳照護',
  role: 'caregiver',
  isLocalStaff: true,
  createdAt: '2024-01-01T00:00:00Z',
};

function renderPage(path = '/care-records/new') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  window.history.pushState({}, 'Test Page', path);

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CareRecordsPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('CareRecordsPage', () => {
  beforeEach(() => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url === '/residents') {
        return {
          success: true,
          data: {
            items: [
              {
                residentId: 'RES-001',
                name: '王大明',
                gender: 'Male',
                dateOfBirth: '1945-03-15',
                address: '台北市',
                insuranceId: 'A123456789',
                diagnosis: '高血壓',
                admissionDate: '2023-06-01',
                specialNeeds: '',
                status: 'Active',
                hasThreePipe: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
              },
            ],
            total: 1,
            page: 1,
            pageSize: 20,
            totalPages: 1,
          },
        };
      }

      if (url === '/care-records') {
        return {
          success: true,
          data: {
            items: [],
            total: 0,
            page: 1,
            pageSize: 10,
            totalPages: 1,
          },
        };
      }

      return { success: false, error: { code: 'NOT_FOUND', message: 'not found' } };
    });

    vi.spyOn(apiClient, 'post').mockResolvedValue({
      success: true,
      data: {
        recordId: 'CR-002',
      },
    } as never);

    vi.spyOn(apiClient, 'patch').mockResolvedValue({
      success: true,
      data: {
        recordId: 'CR-001',
      },
    } as never);

    useAuthStore.setState({
      user: mockUser,
      userRole: 'caregiver',
      isAuthenticated: true,
      isInitialized: true,
      accessToken: 'token',
      refreshToken: 'refresh',
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows completeness hints when required fields missing', async () => {
    renderPage('/care-records/new');

    expect(await screen.findByText('新增照護記錄')).toBeInTheDocument();
    expect(screen.getByText('完整性評分')).toBeInTheDocument();
    expect(screen.getByText('請上傳照片或影片佐證')).toBeInTheDocument();
  });

  it('adds and removes activities', async () => {
    const user = userEvent.setup();
    renderPage('/care-records/new');

    await screen.findByText('新增照護記錄');

    const addButton = screen.getByRole('button', { name: '新增活動' });
    await user.click(addButton);

    expect(screen.getByText('活動 #2')).toBeInTheDocument();

    const removeButtons = screen.getAllByRole('button', { name: '刪除' });
    await user.click(removeButtons[1]!);

    await waitFor(() => {
      expect(screen.queryByText('活動 #2')).not.toBeInTheDocument();
    });
  });

  it('renders list mode with filters', async () => {
    renderPage('/care-records');

    expect(await screen.findByText('日常照護記錄')).toBeInTheDocument();
    expect(screen.getByLabelText('住民篩選')).toBeInTheDocument();
    expect(screen.getByLabelText('狀態篩選')).toBeInTheDocument();
  });
});
