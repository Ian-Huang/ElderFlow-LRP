import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureFlagsView } from '@/pages/admin/FeatureFlagsView';
import { apiClient } from '@/api/apiClient';
import type { FeatureFlag } from '@lrp/shared';

const mockFlags: FeatureFlag[] = [
  {
    id: 'offline_sync_v2',
    name: '離線同步引擎 v2',
    description: '新版 IndexedDB + Dexie 離線同步機制，支援背景定期同動與版本衝撞仲裁',
    enabled: true,
    rolloutPercentage: 100,
    environment: 'production',
  },
  {
    id: 'three_pipe_early_warning',
    name: '管路異常即時黃紅標警示',
    description: '依據三管更換到期日與生理異常即時計算黃標/紅標等級',
    enabled: true,
    rolloutPercentage: 50,
    environment: 'staging',
  },
  {
    id: 'bed_map_heat_overlay',
    name: '床位熱區視覺化覆蓋圖',
    description: '在床位總覽地圖以色彩深度顯示照護負荷與異常頻率',
    enabled: false,
    rolloutPercentage: 0,
    environment: 'development',
  },
];

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <FeatureFlagsView />
    </QueryClientProvider>
  );
}

describe('Feature Flags Management View (Feature F10)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders list of feature flags, IDs, descriptions and environment badges', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: mockFlags,
    });

    renderView();

    expect(await screen.findByText('離線同步引擎 v2')).toBeInTheDocument();
    expect(screen.getByText('offline_sync_v2')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();

    expect(screen.getByText('管路異常即時黃紅標警示')).toBeInTheDocument();
    expect(screen.getByText('three_pipe_early_warning')).toBeInTheDocument();
    expect(screen.getByText('Staging')).toBeInTheDocument();

    expect(screen.getByText('床位熱區視覺化覆蓋圖')).toBeInTheDocument();
    expect(screen.getByText('bed_map_heat_overlay')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
  });

  it('toggles feature flag switch and calls PATCH /api/v1/system/feature-flags/:id', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: mockFlags,
    });

    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      success: true,
      data: {
        ...mockFlags[0],
        enabled: false,
      },
    });

    renderView();

    const toggleCheckbox = await screen.findByLabelText('切換 離線同步引擎 v2 狀態');
    expect(toggleCheckbox).toBeChecked();

    await user.click(toggleCheckbox);

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/system/feature-flags/offline_sync_v2', {
        enabled: false,
      });
      expect(screen.getByText(/功能旗標「離線同步引擎 v2」已停用/i)).toBeInTheDocument();
    });
  });

  it('adjusts rollout percentage slider and calls PATCH endpoint', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: mockFlags,
    });

    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      success: true,
      data: {
        ...mockFlags[1],
        rolloutPercentage: 75,
      },
    });

    renderView();

    const slider = await screen.findByLabelText('管路異常即時黃紅標警示 灰度發布滑桿');
    expect(slider).toHaveValue('50');

    fireEvent.change(slider, { target: { value: '75' } });

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/system/feature-flags/three_pipe_early_warning', {
        rolloutPercentage: 75,
      });
      expect(
        screen.getByText(/功能旗標「管路異常即時黃紅標警示」灰度發布比例已調整為 75%/i)
      ).toBeInTheDocument();
    });
  });

  it('handles patch error and rolls back flag state', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: mockFlags,
    });

    vi.spyOn(apiClient, 'patch').mockRejectedValueOnce(new Error('網路連線失敗，旗標更新被拒絕'));

    renderView();

    const toggle = await screen.findByLabelText('切換 床位熱區視覺化覆蓋圖 狀態');
    expect(toggle).not.toBeChecked();

    await user.click(toggle);

    await waitFor(() => {
      expect(screen.getByText(/網路連線失敗，旗標更新被拒絕/i)).toBeInTheDocument();
      // Verifies roll back
      expect(toggle).not.toBeChecked();
    });
  });
});
