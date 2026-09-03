import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MedicationsPage } from './MedicationsPage';
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
      <MemoryRouter initialEntries={[`/medications${searchQuery}`]}>
        <Routes>
          <Route path="/medications" element={<MedicationsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('MedicationsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        userId: 'nurse-1',
        username: 'nurse1',
        name: '林護理師',
        role: 'caregiver',
        isLocalStaff: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      userRole: 'caregiver',
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

  it('renders page header and alert banner when low stock items exist', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url.includes('/medications/alerts/low-stock')) {
        return {
          success: true,
          data: {
            total: 5,
            normalCount: 3,
            runningLowCount: 1,
            outOfStockCount: 1,
            items: [],
          },
        };
      }
      if (url.includes('/residents')) {
        return { success: true, data: { items: [], total: 0 } };
      }
      if (url.includes('/medications')) {
        return {
          success: true,
          data: {
            items: [
              {
                medicationId: 'MED-001',
                residentId: '0040',
                residentName: '周吳綺緣',
                bedNumber: '1-1',
                name: 'Norvasc 脈優錠 (Amlodipine)',
                dosage: '5mg',
                frequency: 'OnceDaily',
                schedule: ['08:00'],
                nextScheduled: '2026-09-04T08:00:00Z',
                stockLevel: 28,
                reorderThreshold: 15,
                stockStatus: 'Normal',
                status: 'Active',
                notes: '降血壓',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
              },
            ],
            total: 1,
            page: 1,
            pageSize: 12,
            totalPages: 1,
          },
        };
      }
      return { success: false };
    });

    renderPage();

    expect(screen.getByText('藥物管理')).toBeInTheDocument();
    expect(await screen.findByText(/藥品庫存預警通知/i)).toBeInTheDocument();
    expect(screen.getByText(/1 項缺藥/i)).toBeInTheDocument();
    expect(screen.getByText(/1 項庫存偏低/i)).toBeInTheDocument();
    expect(await screen.findByText('Norvasc 脈優錠 (Amlodipine)')).toBeInTheDocument();
    expect(screen.getByText('28 顆')).toBeInTheDocument();
  });

  it('filters medications by search keyword and switches to grid view', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url.includes('/medications/alerts/low-stock')) {
        return { success: true, data: { total: 0, normalCount: 0, runningLowCount: 0, outOfStockCount: 0, items: [] } };
      }
      if (url.includes('/residents')) {
        return { success: true, data: { items: [], total: 0 } };
      }
      return {
        success: true,
        data: {
          items: [
            {
              medicationId: 'MED-002',
              residentId: '0040',
              residentName: '周吳綺緣',
              bedNumber: '1-1',
              name: 'Glucophage 庫魯化錠',
              dosage: '500mg',
              frequency: 'TwiceDaily',
              schedule: ['08:00', '18:00'],
              nextScheduled: '2026-09-04T08:00:00Z',
              stockLevel: 10,
              reorderThreshold: 15,
              stockStatus: 'RunningLow',
              status: 'Active',
              notes: '降血糖',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 12,
          totalPages: 1,
        },
      };
    });

    const user = userEvent.setup();
    renderPage('?q=Glucophage');

    expect(await screen.findByText('Glucophage 庫魯化錠')).toBeInTheDocument();

    const gridBtn = screen.getByRole('button', { name: /切換卡片檢視/i });
    await user.click(gridBtn);

    expect(screen.getByText('查看完整記錄')).toBeInTheDocument();
  });

  it('opens administer modal when clicking 給藥 button', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url.includes('/medications/alerts/low-stock')) {
        return { success: true, data: { total: 0, normalCount: 0, runningLowCount: 0, outOfStockCount: 0, items: [] } };
      }
      if (url.includes('/residents')) {
        return { success: true, data: { items: [], total: 0 } };
      }
      return {
        success: true,
        data: {
          items: [
            {
              medicationId: 'MED-001',
              residentId: '0040',
              residentName: '周吳綺緣',
              bedNumber: '1-1',
              name: 'Norvasc 脈優錠',
              dosage: '5mg',
              frequency: 'OnceDaily',
              schedule: ['08:00'],
              nextScheduled: '2026-09-04T08:00:00Z',
              stockLevel: 28,
              reorderThreshold: 15,
              stockStatus: 'Normal',
              status: 'Active',
              notes: '晨間服用',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 12,
          totalPages: 1,
        },
      };
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Norvasc 脈優錠')).toBeInTheDocument();

    const adminBtn = screen.getByRole('button', { name: '給藥' });
    await user.click(adminBtn);

    expect(await screen.findByText('執行給藥記錄')).toBeInTheDocument();
    expect(screen.getByDisplayValue('林護理師')).toBeInTheDocument();
  });
});
