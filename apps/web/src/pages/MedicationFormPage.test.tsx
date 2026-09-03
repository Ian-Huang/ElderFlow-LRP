import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MedicationFormPage } from './MedicationFormPage';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/api/apiClient';

function renderForm(initialPath = '/medications/new') {
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
          <Route path="/medications/new" element={<MedicationFormPage />} />
          <Route path="/medications/:id/edit" element={<MedicationFormPage />} />
          <Route path="/medications" element={<div>Medications List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('MedicationFormPage', () => {
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

    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url.includes('/residents')) {
        return {
          success: true,
          data: {
            items: [
              {
                residentId: '0040',
                name: '周吳綺緣',
                bedNumber: '1-1',
              },
            ],
          },
        };
      }
      return { success: false };
    });
  });

  it('renders create form and validates required fields', async () => {
    const user = userEvent.setup();
    renderForm('/medications/new');

    expect(screen.getByText('新增住民藥物')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /建立藥物主檔/i });
    await user.click(submitBtn);

    expect(await screen.findByText('住民 ID 為必填')).toBeInTheDocument();
    expect(screen.getByText('藥物名稱必填')).toBeInTheDocument();
    expect(screen.getByText('劑量必填')).toBeInTheDocument();
  });

  it('allows adding and removing schedule time slots', async () => {
    const user = userEvent.setup();
    renderForm('/medications/new');

    expect(screen.getByText('08:00')).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /\+ 加入時段/i });
    await user.click(addBtn);

    expect(await screen.findByText('12:00')).toBeInTheDocument();
  });

  it('submits valid medication successfully', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      data: {
        medicationId: 'MED-999',
        name: '測試降壓藥',
      },
    } as never);

    const user = userEvent.setup();
    renderForm('/medications/new');

    // Wait for residents dropdown to load
    expect(await screen.findByText(/周吳綺緣/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/所屬住民/i), '0040');
    await user.type(screen.getByLabelText(/藥品名稱/i), '測試降壓藥');
    await user.type(screen.getByLabelText(/劑量與規格/i), '10mg / 顆');

    const submitBtn = screen.getByRole('button', { name: /建立藥物主檔/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalled();
      expect(screen.getByText('Medications List')).toBeInTheDocument();
    });
  });
});
