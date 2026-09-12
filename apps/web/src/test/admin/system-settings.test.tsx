import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SystemSettingsView } from '@/pages/admin/SystemSettingsView';
import { apiClient } from '@/api/apiClient';
import type { SystemSettings } from '@lrp/shared';

const mockSettings: SystemSettings = {
  syncIntervalSeconds: 30,
  lockDurationHours: 24,
  lowStockThreshold: 15,
  pdfFont: 'Noto Sans TC',
  updatedAt: '2024-01-15T12:00:00Z',
  updatedBy: 'sysadmin1',
};

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SystemSettingsView />
    </QueryClientProvider>
  );
}

describe('System Settings Form View (Feature F11)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads existing system settings into form inputs', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: mockSettings,
    });

    renderView();

    expect(await screen.findByLabelText('背景同步間隔')).toHaveValue(30);
    expect(screen.getByLabelText('記錄鎖定時長')).toHaveValue(24);
    expect(screen.getByLabelText('低庫存警示閾值')).toHaveValue(15);
    expect(screen.getByLabelText('PDF 字體設定')).toHaveValue('Noto Sans TC');
    expect(screen.getByText(/維護人員：sysadmin1/i)).toBeInTheDocument();
  });

  it('validates ranges and displays error messages on invalid inputs', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: mockSettings,
    });

    renderView();

    const syncInput = await screen.findByLabelText('背景同步間隔');
    const lockInput = screen.getByLabelText('記錄鎖定時長');
    const thresholdInput = screen.getByLabelText('低庫存警示閾值');

    // Enter out of range values
    await user.clear(syncInput);
    await user.type(syncInput, '5'); // Below 10

    await user.clear(lockInput);
    await user.type(lockInput, '100'); // Above 72

    await user.clear(thresholdInput);
    await user.type(thresholdInput, '200'); // Above 100

    const saveBtn = screen.getByRole('button', { name: /儲存設定/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('背景同步間隔必須介於 10 至 300 秒之間')).toBeInTheDocument();
      expect(screen.getByText('記錄鎖定時長必須介於 1 至 72 小時之間')).toBeInTheDocument();
      expect(screen.getByText('低庫存警示閾值必須介於 1 至 100 之間')).toBeInTheDocument();
    });
  });

  it('submits valid form to PATCH /api/v1/system/settings and displays success alert', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: mockSettings,
    });

    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      success: true,
      data: {
        ...mockSettings,
        syncIntervalSeconds: 60,
        lowStockThreshold: 20,
        pdfFont: 'PingFang TC',
        updatedAt: '2024-01-16T10:00:00Z',
      },
    });

    renderView();

    const syncInput = await screen.findByLabelText('背景同步間隔');
    const thresholdInput = screen.getByLabelText('低庫存警示閾值');
    const fontSelect = screen.getByLabelText('PDF 字體設定');

    await user.clear(syncInput);
    await user.type(syncInput, '60');

    await user.clear(thresholdInput);
    await user.type(thresholdInput, '20');

    await user.selectOptions(fontSelect, 'PingFang TC');

    const saveBtn = screen.getByRole('button', { name: /儲存設定/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/system/settings', {
        syncIntervalSeconds: 60,
        lockDurationHours: 24,
        lowStockThreshold: 20,
        pdfFont: 'PingFang TC',
      });
      expect(screen.getByText('系統核心參數已成功更新並儲存！')).toBeInTheDocument();
    });
  });

  it('resets form to initial values when clicking 復原 button', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: mockSettings,
    });

    renderView();

    const syncInput = await screen.findByLabelText('背景同步間隔');
    await user.clear(syncInput);
    await user.type(syncInput, '90');
    expect(syncInput).toHaveValue(90);

    const resetBtn = screen.getByRole('button', { name: /重設設定/i });
    await user.click(resetBtn);

    expect(syncInput).toHaveValue(30);
  });
});
