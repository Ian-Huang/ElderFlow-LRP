import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResidentDetailPage } from './ResidentDetailPage';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/api/apiClient';
import type { Resident } from '@lrp/shared';

const mockDetail: Resident = {
  residentId: '0040',
  name: '周吳綺緣',
  gender: 'Female',
  dateOfBirth: '1946-01-13',
  address: '台北市南港區 研究院路2段185號',
  householdAddress: '台北市南港區 研究院路2段185號',
  phone: '',
  mobile: '',
  insuranceId: 'A201529776',
  diagnosis: '高血壓',
  admissionDate: '2022-01-21',
  specialNeeds: '完全依賴',
  status: 'Active',
  hasThreePipe: true,
  bedNumber: '1-1',
  pipes: ['尿管', '鼻胃管'],
  identityType: '一般戶',
  dependencyLevel: '完全依賴',
  emergencyContact: {
    name: '周士剛',
    relationship: '母子',
    phone: '0226546918',
    mobile: '0955034033',
    address: '臺北市南港區南港區研究院路2段185號',
    notes: '',
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

function renderDetail(id = '0040') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/residents/${id}`]}>
        <Routes>
          <Route path="/residents/:id" element={<ResidentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ResidentDetailPage', () => {
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

    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url.includes('/residents/0040')) {
        return { success: true, data: mockDetail };
      }
      if (url.includes('/care-records')) {
        return { success: true, data: { items: [], total: 0 } };
      }
      if (url.includes('/medications')) {
        return { success: true, data: { items: [], total: 0 } };
      }
      if (url.includes('/care-plans')) {
        return { success: true, data: { items: [], total: 0 } };
      }
      return { success: false, error: { code: 'NOT_FOUND', message: 'not found' } };
    });
  });

  it('renders resident full profile details and highlights three pipes', async () => {
    renderDetail('0040');

    expect(await screen.findByRole('heading', { name: '周吳綺緣' })).toBeInTheDocument();
    expect(screen.getByText('0040')).toBeInTheDocument();
    expect(screen.getByText('床位 1-1')).toBeInTheDocument();
    expect(screen.getByText('三管住民 (1:15)')).toBeInTheDocument();
    expect(screen.getAllByText(/周士剛/)[0]).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    renderDetail('0040');

    await screen.findByRole('heading', { name: '周吳綺緣' });

    const careTab = screen.getByRole('tab', { name: /照護記錄/i });
    await user.click(careTab);

    expect(await screen.findByText('最近照護記錄')).toBeInTheDocument();
    expect(screen.getByText('新增此住民記錄')).toBeInTheDocument();
  });

  it('opens deactivation modal when clicking deactivation button', async () => {
    const user = userEvent.setup();
    renderDetail('0040');

    await screen.findByRole('heading', { name: '周吳綺緣' });

    const deactivateBtn = screen.getByRole('button', { name: /辦理離院/i });
    await user.click(deactivateBtn);

    expect(await screen.findByText('確認停用 / 住民離院')).toBeInTheDocument();
    expect(screen.getByLabelText(/離院 \/ 停用原因/i)).toBeInTheDocument();
  });
});
