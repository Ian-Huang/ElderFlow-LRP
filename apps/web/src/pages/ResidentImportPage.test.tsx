import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResidentImportPage } from './ResidentImportPage';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/api/apiClient';

function renderImportPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ResidentImportPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ResidentImportPage', () => {
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

  it('renders upload area and sample template download buttons', () => {
    renderImportPage();

    expect(screen.getByText('住民基本資料批次匯入')).toBeInTheDocument();
    expect(screen.getByText(/點擊選取檔案 或 將檔案拖曳至此處/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /下載 JSON 範例範本/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /下載 CSV 範例範本/i })).toBeInTheDocument();
  });

  it('displays dry-run preview and allows confirmation', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      data: {
        dryRun: true,
        total: 1,
        validCount: 1,
        errorCount: 0,
        items: [
          {
            row: 1,
            isValid: true,
            errors: [],
            resident: {
              name: '周吳綺緣',
              residentId: '0040',
              insuranceId: 'A201529776',
              bedNumber: '1-1',
              dateOfBirth: '1946-01-13',
              pipes: ['尿管', '鼻胃管'],
            },
          },
        ],
      },
    } as never);

    const user = userEvent.setup();
    renderImportPage();

    const file = new File(
      [
        JSON.stringify([
          {
            序號: '1',
            姓名: '周吳綺緣',
            性別: '女',
            生日: '035/01/13',
            身分證號: 'A201529776',
            住民編號: '0040',
            床位: '1-1',
            入住日期: '111/01/21',
            管路: '尿管、鼻胃管',
          },
        ]),
      ],
      'test_residents.json',
      { type: 'application/json' }
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    expect(await screen.findByText('匯入預覽與資料檢核 (Dry-run)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('周吳綺緣')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0040')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1-1')).toBeInTheDocument();
    expect(screen.getByText('合格')).toBeInTheDocument();

    // Confirm import
    const confirmSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      data: {
        importedCount: 1,
      },
    } as never);

    const confirmBtn = screen.getByRole('button', { name: /確認匯入通過資料/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(screen.getByText(/成功匯入 1 筆住民資料/i)).toBeInTheDocument();
    });
  });
});
