import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MedicationDetailPage } from './MedicationDetailPage';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/api/apiClient';
import type { Medication } from '@lrp/shared';

const mockDetail: Medication = {
  medicationId: 'MED-001',
  residentId: '0040',
  residentName: '周吳綺緣',
  bedNumber: '1-1',
  name: 'Norvasc 脈優錠 (Amlodipine)',
  dosage: '5mg / 顆',
  frequency: 'OnceDaily',
  schedule: ['08:00'],
  lastAdministered: '2026-09-03T08:05:00Z',
  nextScheduled: '2026-09-04T08:00:00Z',
  stockLevel: 28,
  reorderThreshold: 15,
  stockStatus: 'Normal',
  status: 'Active',
  notes: '高血壓控制用藥，晨間飯後服用',
  administrationHistory: [
    {
      administrationId: 'ADM-001',
      medicationId: 'MED-001',
      residentId: '0040',
      scheduledTime: '2026-09-03T08:00:00Z',
      actualTime: '2026-09-03T08:05:00Z',
      administeredBy: '護理師 林淑惠',
      status: 'Administered',
      notes: '住民配合服藥',
      createdAt: '2026-09-03T08:05:00Z',
    },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

function renderDetail(id = 'MED-001') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/medications/${id}`]}>
        <Routes>
          <Route path="/medications/:id" element={<MedicationDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('MedicationDetailPage', () => {
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

    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: mockDetail,
    } as never);
  });

  it('renders medication full profile, stock status and administration timeline', async () => {
    renderDetail('MED-001');

    expect(await screen.findByRole('heading', { name: 'Norvasc 脈優錠 (Amlodipine)' })).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText(/周吳綺緣/i)).toBeInTheDocument();
    expect(screen.getByText('護理師 林淑惠')).toBeInTheDocument();
    expect(screen.getByText(/住民配合服藥/)).toBeInTheDocument();
  });

  it('opens restock modal when clicking 補充庫存', async () => {
    const user = userEvent.setup();
    renderDetail('MED-001');

    await screen.findByRole('heading', { name: 'Norvasc 脈優錠 (Amlodipine)' });

    const restockBtn = screen.getByRole('button', { name: /\+ 補充庫存/i });
    await user.click(restockBtn);

    expect(await screen.findByText('補充藥品庫存')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '確認入庫' })).toBeInTheDocument();
  });
});
