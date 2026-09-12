import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SystemHealthView } from '@/pages/admin/SystemHealthView';
import { apiClient } from '@/api/apiClient';
import type { SystemHealthReport } from '@lrp/shared';

const mockHealthData: SystemHealthReport = {
  status: 'healthy',
  uptimeSeconds: 129600, // 1 day 12 hours
  services: {
    api: { status: 'up', latencyMs: 38 },
    database: { status: 'up', latencyMs: 12 },
    serviceWorker: { status: 'active', version: 'v1.4.2' },
    indexedDb: { status: 'connected', sizeEstimateBytes: 15728640 }, // ~15 MB
  },
  metrics: {
    memoryUsageMb: 245,
    cpuLoadPercentage: 22,
  },
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
      <SystemHealthView />
    </QueryClientProvider>
  );
}

describe('System Health Monitoring View (Feature F9)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders overall health status badge, service status cards and metric cards', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: mockHealthData,
    });

    renderView();

    // Check overall badge
    expect(await screen.findByText(/系統健康 \(Healthy\)/i)).toBeInTheDocument();

    // Check service cards
    expect(screen.getByText('後端 API 伺服器')).toBeInTheDocument();
    expect(screen.getByText('38')).toBeInTheDocument();
    expect(screen.getByText('主要資料庫 (PostgreSQL)')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Service Worker (PWA)')).toBeInTheDocument();
    expect(screen.getByText('v1.4.2')).toBeInTheDocument();
    expect(screen.getByText('本地 IndexedDB')).toBeInTheDocument();
    expect(screen.getByText('15.00 MB')).toBeInTheDocument();

    // Check metric cards
    expect(screen.getByText('CPU 負載使用率')).toBeInTheDocument();
    expect(screen.getByText('22%')).toBeInTheDocument();
    expect(screen.getByText('記憶體使用量')).toBeInTheDocument();
    expect(screen.getByText('245 MB')).toBeInTheDocument();
    expect(screen.getByText('系統連續運行時間 (Uptime)')).toBeInTheDocument();
    expect(screen.getByText(/1 天 12 小時 0 分鐘/i)).toBeInTheDocument();
  });

  it('renders degraded status badge when system is degraded', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: {
        ...mockHealthData,
        status: 'degraded',
        services: {
          ...mockHealthData.services,
          database: { status: 'up', latencyMs: 520 },
        },
      },
    });

    renderView();

    expect(await screen.findByText(/服務降級 \(Degraded\)/i)).toBeInTheDocument();
    expect(screen.getByText('520')).toBeInTheDocument();
  });

  it('renders unhealthy status badge when a service is down', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: {
        ...mockHealthData,
        status: 'unhealthy',
        services: {
          ...mockHealthData.services,
          database: { status: 'down', latencyMs: 0 },
        },
      },
    });

    renderView();

    expect(await screen.findByText(/系統異常 \(Unhealthy\)/i)).toBeInTheDocument();
    expect(screen.getByText('DOWN')).toBeInTheDocument();
  });

  it('refreshes health report when clicking 立即檢測 button', async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({
        success: true,
        data: mockHealthData,
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          ...mockHealthData,
          metrics: {
            memoryUsageMb: 310,
            cpuLoadPercentage: 45,
          },
        },
      });

    renderView();

    expect(await screen.findByText('22%')).toBeInTheDocument();

    const refreshBtn = screen.getByRole('button', { name: /立即檢測/i });
    await user.click(refreshBtn);

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('310 MB')).toBeInTheDocument();
    });
  });

  it('handles health fetch error gracefully', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('連線逾時無法連線至健康檢查端點'));

    renderView();

    expect(await screen.findByText(/連線逾時無法連線至健康檢查端點/i)).toBeInTheDocument();
  });
});
