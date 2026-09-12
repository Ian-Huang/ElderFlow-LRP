import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CarePlanDetailPage } from './CarePlanDetailPage';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import apiClient from '@/api/apiClient';

function renderDetail(planId = 'CP-001') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/care-plans/${planId}`]}>
        <Routes>
          <Route path="/care-plans/:id" element={<CarePlanDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const mockDetailPlan = {
  planId: 'CP-001',
  residentId: '0040',
  residentName: '周吳綺緣',
  bedNumber: '1-1',
  assessmentDate: '2024-01-10',
  reviewDate: '2024-07-10',
  status: 'Active' as const,
  createdBy: 'supervisor-1',
  goals: [
    {
      goalId: 'G-001',
      description: '控制血壓在正常範圍 (收縮壓 < 140 mmHg)',
      targetDate: '2024-06-30',
      progress: 75,
      status: 'InProgress' as const,
      progressNotes: '近期晨間血壓平穩',
    },
  ],
  serviceItems: [
    {
      itemId: 'SI-001',
      name: '晨間與睡前生命徵象監測',
      serviceType: 'NursingCare' as const,
      frequency: '每日兩次',
      responsibleRole: 'Nurse' as const,
      startDate: '2024-01-10',
      endDate: null,
      notes: '早晚量測',
    },
  ],
  createdAt: '2024-01-10T08:30:00Z',
  updatedAt: '2024-02-15T14:20:00Z',
};

describe('CarePlanDetailPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        userId: 'sup-1',
        username: 'supervisor1',
        name: '王督導',
        role: 'supervisor',
        isLocalStaff: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      userRole: 'supervisor',
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

    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url.includes('/care-plans/CP-001')) {
        return { success: true, data: mockDetailPlan };
      }
      if (url.includes('/care-plans/CP-DRAFT')) {
        return { success: true, data: { ...mockDetailPlan, planId: 'CP-DRAFT', status: 'Draft' as const } };
      }
      if (url.includes('/care-plans/CP-COMPLETED')) {
        return { success: true, data: { ...mockDetailPlan, planId: 'CP-COMPLETED', status: 'Completed' as const } };
      }
      if (url.includes('/residents')) {
        return {
          success: true,
          data: {
            items: [
              {
                residentId: '0040',
                name: '周吳綺緣',
                bedNumber: '1-1',
                gender: 'Female',
                hasThreePipe: true,
              },
            ],
          },
        };
      }
      return { success: false, error: { code: 'NOT_FOUND', message: 'not found' } };
    });
  });

  it('renders care plan detail with goals progress bar, service items and resident info', async () => {
    renderDetail('CP-001');

    expect(await screen.findByRole('heading', { name: 'CP-001' })).toBeInTheDocument();
    expect(screen.getByText('執行中')).toBeInTheDocument();
    expect(screen.getByText('周吳綺緣')).toBeInTheDocument();
    expect(screen.getByText('具三管 (1:15 護理比)')).toBeInTheDocument();

    // Goal and progress
    expect(screen.getByText('控制血壓在正常範圍 (收縮壓 < 140 mmHg)')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('近期晨間血壓平穩')).toBeInTheDocument();

    // Service Item
    expect(screen.getByText('晨間與睡前生命徵象監測')).toBeInTheDocument();
    expect(screen.getByText('每日兩次')).toBeInTheDocument();
    expect(screen.getByText('護理師')).toBeInTheDocument();
  });

  it('opens status transition modal and confirms completion for active plan', async () => {
    const user = userEvent.setup();
    const postSpy = vi.spyOn(apiClient, 'post').mockImplementation(async (url) => {
      if (url.includes('/status')) {
        return {
          success: true,
          data: { ...mockDetailPlan, status: 'Completed' as const },
        };
      }
      return { success: true, data: {} };
    });

    renderDetail('CP-001');

    await screen.findByRole('heading', { name: 'CP-001' });

    const completeBtn = screen.getByRole('button', { name: /完成計畫/i });
    expect(completeBtn).toBeInTheDocument();

    await user.click(completeBtn);

    // Modal opens
    expect(await screen.findByText('完成照護計畫')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: '確認完成計畫' });
    await user.click(confirmBtn);

    expect(postSpy).toHaveBeenCalledWith(
      '/care-plans/CP-001/status',
      expect.objectContaining({ status: 'Completed' })
    );
  });

  it('shows activate button for draft plan and reactivate for completed plan', async () => {
    renderDetail('CP-DRAFT');
    expect(await screen.findByRole('button', { name: /啟用計畫/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /完成計畫/i })).not.toBeInTheDocument();
  });

  it('shows reactivate button for completed plan', async () => {
    renderDetail('CP-COMPLETED');
    expect(await screen.findByRole('button', { name: /重新啟用/i })).toBeInTheDocument();
  });
});
