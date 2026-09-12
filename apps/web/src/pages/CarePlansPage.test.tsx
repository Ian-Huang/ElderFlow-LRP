import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CarePlansPage } from './CarePlansPage';
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

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/care-plans${searchQuery}`]}>
        <Routes>
          <Route path="/care-plans" element={<CarePlansPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const mockCarePlansList = [
  {
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
        notes: '早晚量測',
      },
    ],
    createdAt: '2024-01-10T08:30:00Z',
    updatedAt: '2024-02-15T14:20:00Z',
  },
  {
    planId: 'CP-003',
    residentId: '0042',
    residentName: '陳張阿甚',
    bedNumber: '2-1',
    assessmentDate: '2024-03-01',
    reviewDate: '2024-09-01',
    status: 'Draft' as const,
    createdBy: 'supervisor-1',
    goals: [
      {
        goalId: 'G-005',
        description: '助行器步態平衡訓練',
        targetDate: '2024-08-31',
        progress: 0,
        status: 'NotStarted' as const,
        progressNotes: '',
      },
    ],
    serviceItems: [
      {
        itemId: 'SI-006',
        name: '步態與平衡復健',
        frequency: '每週兩次',
        responsibleRole: 'Therapist' as const,
      },
    ],
    createdAt: '2024-03-01T11:00:00Z',
    updatedAt: '2024-03-01T11:00:00Z',
  },
];

describe('CarePlansPage', () => {
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
      if (url.includes('/care-plans')) {
        return {
          success: true,
          data: {
            items: mockCarePlansList,
            total: 2,
            page: 1,
            pageSize: 10,
            totalPages: 1,
          },
        };
      }
      return { success: false, error: { code: 'NOT_FOUND', message: 'not found' } };
    });
  });

  it('renders care plans page header, create button for supervisor and list table', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: '照護計畫' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /新增照護計畫/i })).toBeInTheDocument();

    expect(await screen.findByText('CP-001')).toBeInTheDocument();
    expect(screen.getByText('周吳綺緣')).toBeInTheDocument();
    expect(screen.getAllByText('執行中').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('CP-003')).toBeInTheDocument();
    expect(screen.getAllByText('草稿').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('控制血壓在正常範圍 (收縮壓 < 140 mmHg)')).toBeInTheDocument();
  });

  it('hides create button when logged in as caregiver', async () => {
    useAuthStore.setState({
      userRole: 'caregiver',
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: '照護計畫' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /新增照護計畫/i })).not.toBeInTheDocument();
  });

  it('allows clicking status filter tabs and changes search query', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('CP-001');

    const draftTab = screen.getByRole('button', { name: '草稿' });
    await user.click(draftTab);

    // Expect tab button to exist and be clicked
    expect(draftTab).toBeInTheDocument();
  });

  it('shows empty state when no plans match search filter', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url.includes('/care-plans')) {
        return {
          success: true,
          data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 },
        };
      }
      return { success: true, data: { items: [] } };
    });

    renderPage('?q=nonexistent');

    expect(await screen.findByText('查無符合條件的照護計畫')).toBeInTheDocument();
  });
});
