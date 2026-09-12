import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResidentSummaryView } from '@/pages/reports/ResidentSummaryView';
import { renderWithProviders, setupReportTestServer } from './testUtils';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container" style={{ width: 600, height: 300 }}>
        {children}
      </div>
    ),
  };
});

describe('ResidentSummaryView Integration Tests', () => {
  setupReportTestServer();

  it('renders tube & three-pipe statistics cards with accurate labels', async () => {
    renderWithProviders(<ResidentSummaryView />);

    await waitFor(() => {
      expect(screen.getByText('帶管總人數')).toBeInTheDocument();
      expect(screen.getByText('鼻胃管 (NG)')).toBeInTheDocument();
      expect(screen.getByText('導尿管 (Foley)')).toBeInTheDocument();
      expect(screen.getByText('氣切管 (Trach)')).toBeInTheDocument();
      expect(screen.getByText(/三管照護住民 \(三管\)/)).toBeInTheDocument();
    });

    expect(screen.getByText('高照護負荷')).toBeInTheDocument();
  });

  it('renders quick alerts banner and triggers navigation callback', async () => {
    const user = userEvent.setup();
    const mockNavigate = vi.fn();
    renderWithProviders(<ResidentSummaryView onNavigateToAlerts={mockNavigate} />);

    await waitFor(() => {
      expect(screen.getByText(/即時異常事件監控提醒/)).toBeInTheDocument();
    });

    // Check red and yellow alert buttons
    const redBtn = screen.queryByRole('button', { name: /紅標警示/i });
    if (redBtn) {
      await user.click(redBtn);
      expect(mockNavigate).toHaveBeenCalledWith('red');
    }

    const centerBtn = screen.getByRole('button', { name: /查看警示中心/i });
    await user.click(centerBtn);
    expect(mockNavigate).toHaveBeenCalledWith();
  });

  it('renders dependency distribution and tube comparison chart containers', async () => {
    renderWithProviders(<ResidentSummaryView />);

    await waitFor(() => {
      expect(screen.getByTestId('dependency-chart-container')).toBeInTheDocument();
      expect(screen.getByTestId('tube-chart-container')).toBeInTheDocument();
    });

    expect(screen.getByText('住民失能程度分佈')).toBeInTheDocument();
    expect(screen.getByText('各類管路分佈對照')).toBeInTheDocument();
  });

  it('renders bed occupancy map and allows floor filtering', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResidentSummaryView />);

    await waitFor(() => {
      expect(screen.getByTestId('bed-map-grid')).toBeInTheDocument();
    });

    // Floor filter tabs
    const floor1Btn = screen.getByRole('button', { name: /1 樓 \(1F\)/i });
    const floor2Btn = screen.getByRole('button', { name: /2 樓 \(2F\)/i });
    const allFloorsBtn = screen.getByRole('button', { name: /全部樓層/i });

    // Filter to 1F
    await user.click(floor1Btn);
    expect(screen.getByText(/1F - 101 房/)).toBeInTheDocument();
    expect(screen.queryByText(/2F - 201 房/)).not.toBeInTheDocument();

    // Filter to 2F
    await user.click(floor2Btn);
    expect(screen.getByText(/2F - 201 房/)).toBeInTheDocument();
    expect(screen.queryByText(/1F - 101 房/)).not.toBeInTheDocument();

    // Reset to All Floors
    await user.click(allFloorsBtn);
    expect(screen.getByText(/1F - 101 房/)).toBeInTheDocument();
    expect(screen.getByText(/2F - 201 房/)).toBeInTheDocument();
  });

  it('filters beds by status (occupied vs vacant vs maintenance)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResidentSummaryView />);

    await waitFor(() => {
      expect(screen.getByTestId('bed-map-grid')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/床位狀態篩選/i);

    // Filter to vacant beds
    await user.selectOptions(statusSelect, 'vacant');
    expect(screen.getByText(/可安排入住/)).toBeInTheDocument();

    // Filter to maintenance beds
    await user.selectOptions(statusSelect, 'maintenance');
    expect(screen.getByTestId('bed-card-201-B')).toBeInTheDocument();
  });
});
