import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResidentFormPage } from './ResidentFormPage';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/api/apiClient';

function renderForm(initialPath = '/residents/new') {
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
          <Route path="/residents/new" element={<ResidentFormPage />} />
          <Route path="/residents/:id/edit" element={<ResidentFormPage />} />
          <Route path="/residents" element={<div>Residents List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ResidentFormPage', () => {
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
  });

  it('renders create form and performs client-side validation', async () => {
    const user = userEvent.setup();
    renderForm('/residents/new');

    expect(screen.getByText('新增住民基本資料')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /建立住民資料/i });
    await user.click(submitBtn);

    expect(await screen.findByText('姓名為必填')).toBeInTheDocument();
    expect(screen.getByText('身分證號/保險 ID 為必填')).toBeInTheDocument();
  });

  it('automatically calculates three pipe status when selecting pipes', async () => {
    const user = userEvent.setup();
    renderForm('/residents/new');

    expect(screen.getByText('一般住民（適用護理比 1:20）')).toBeInTheDocument();

    const nasogastricCheckbox = screen.getByRole('checkbox', { name: /鼻胃管/i });
    await user.click(nasogastricCheckbox);

    expect(await screen.findByText('⚠️ 三管住民（適用護理比 1:15）')).toBeInTheDocument();
  });

  it('submits valid resident data successfully', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      data: {
        residentId: 'RES-099',
        name: '測試住民',
      },
    } as never);

    const user = userEvent.setup();
    renderForm('/residents/new');

    await user.type(screen.getByLabelText(/住民姓名/i), '測試住民');
    await user.type(screen.getByLabelText(/身分證字號/i), 'A123456789');
    await user.type(screen.getByLabelText(/通訊地址/i), '台北市信義區信義路一段1號');

    const submitBtn = screen.getByRole('button', { name: /建立住民資料/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalled();
      expect(screen.getByText('Residents List')).toBeInTheDocument();
    });
  });
});
