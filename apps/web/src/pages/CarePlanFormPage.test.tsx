import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CarePlanFormPage } from './CarePlanFormPage';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import apiClient from '@/api/apiClient';

function renderForm(initialPath = '/care-plans/new') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/care-plans/new" element={<CarePlanFormPage />} />
          <Route path="/care-plans/:id/edit" element={<CarePlanFormPage />} />
          <Route path="/care-plans/:id" element={<div>明細跳轉成功</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CarePlanFormPage', () => {
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
      if (url.includes('/residents')) {
        return {
          success: true,
          data: {
            items: [
              { residentId: '0040', name: '周吳綺緣', bedNumber: '1-1' },
              { residentId: '0042', name: '陳張阿甚', bedNumber: '2-1' },
            ],
            total: 2,
          },
        };
      }
      if (url.includes('/care-plans/CP-001')) {
        return {
          success: true,
          data: {
            planId: 'CP-001',
            residentId: '0040',
            assessmentDate: '2024-01-10',
            reviewDate: '2024-07-10',
            status: 'Active',
            createdBy: 'supervisor-1',
            goals: [
              {
                goalId: 'G-001',
                description: '原有目標',
                targetDate: '2024-06-30',
                progress: 50,
                status: 'InProgress',
                progressNotes: '',
              },
            ],
            serviceItems: [
              {
                itemId: 'SI-001',
                name: '原有服務',
                serviceType: 'DailyCare',
                frequency: '每日一次',
                responsibleRole: 'Caregiver',
                startDate: '2024-01-10',
                endDate: null,
                notes: '',
              },
            ],
          },
        };
      }
      return { success: false, error: { code: 'NOT_FOUND', message: 'not found' } };
    });
  });

  it('renders create form and allows dynamically adding goals and service items', async () => {
    const user = userEvent.setup();
    renderForm('/care-plans/new');

    expect(await screen.findByRole('heading', { name: '新增個別化照護計畫' })).toBeInTheDocument();
    expect(screen.getByText('目標 #1')).toBeInTheDocument();
    expect(screen.getByText('服務項目 #1')).toBeInTheDocument();

    // Click to add a second goal
    const addGoalBtn = screen.getByRole('button', { name: /新增照護目標/i });
    await user.click(addGoalBtn);

    expect(screen.getByText('目標 #2')).toBeInTheDocument();

    // Click to add a second service item
    const addServiceBtn = screen.getByRole('button', { name: /新增服務項目/i });
    await user.click(addServiceBtn);

    expect(screen.getByText('服務項目 #2')).toBeInTheDocument();
  });

  it('validates required fields on submit when empty', async () => {
    const user = userEvent.setup();
    renderForm('/care-plans/new');

    await screen.findByRole('heading', { name: '新增個別化照護計畫' });

    const submitBtn = screen.getByRole('button', { name: /建立照護計畫/i });
    await user.click(submitBtn);

    expect(await screen.findByText('住民 ID 為必填')).toBeInTheDocument();
    expect(screen.getByText('目標描述必填')).toBeInTheDocument();
    expect(screen.getByText('服務項目名稱必填')).toBeInTheDocument();
  });

  it('loads existing plan in edit mode and submits update', async () => {
    const user = userEvent.setup();
    const patchSpy = vi.spyOn(apiClient, 'patch').mockImplementation(async () => ({
      success: true,
      data: { planId: 'CP-001' },
    }));

    renderForm('/care-plans/CP-001/edit');

    expect(await screen.findByRole('heading', { name: /編輯照護計畫 \(CP-001\)/i })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('原有目標')).toBeInTheDocument();
    expect(screen.getByDisplayValue('原有服務')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /儲存修改/i });
    await user.click(submitBtn);

    expect(patchSpy).toHaveBeenCalledWith(
      '/care-plans/CP-001',
      expect.objectContaining({ planId: 'CP-001' })
    );
  });
});
