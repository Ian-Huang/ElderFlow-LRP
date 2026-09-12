import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DailyCompletionView } from '@/pages/reports/DailyCompletionView';
import { renderWithProviders, setupReportTestServer } from './testUtils';

// Mock ResponsiveContainer for clean jsdom sizing
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

describe('DailyCompletionView Integration Tests', () => {
  setupReportTestServer();

  it('renders loading state initially and then displays summary metrics cards', async () => {
    renderWithProviders(<DailyCompletionView />);

    await waitFor(() => {
      expect(screen.getByText('住民總人數')).toBeInTheDocument();
      expect(screen.getByText('照護達標住民')).toBeInTheDocument();
      expect(screen.getByText('全院平均完成度')).toBeInTheDocument();
      expect(screen.getByText('達標比例')).toBeInTheDocument();
    });

    // Check that numeric metrics are populated
    expect(screen.getByText(/在籍/)).toBeInTheDocument();
    expect(screen.getByText(/≥80% 達標/)).toBeInTheDocument();
  });

  it('renders Recharts bar chart and pie chart containers', async () => {
    renderWithProviders(<DailyCompletionView />);

    await waitFor(() => {
      expect(screen.getByTestId('bar-chart-container')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart-container')).toBeInTheDocument();
    });

    // Pie chart legend categories
    expect(screen.getByText(/正常完成 \(≥80%\)/)).toBeInTheDocument();
    expect(screen.getByText(/待覆核 \(60-79%\)/)).toBeInTheDocument();
    expect(screen.getByText(/需複查 \(<60%\)/)).toBeInTheDocument();
  });

  it('renders low score residents table with missing care items and link', async () => {
    renderWithProviders(<DailyCompletionView />);

    await waitFor(() => {
      expect(screen.getByText(/照護未達標住民名單/)).toBeInTheDocument();
    });

    const table = screen.getByTestId('low-score-table');
    expect(table).toBeInTheDocument();

    // Table columns
    expect(screen.getByText('住民姓名')).toBeInTheDocument();
    expect(screen.getByText('床號')).toBeInTheDocument();
    expect(screen.getByText('今日完成度')).toBeInTheDocument();
    expect(screen.getByText('未完成缺漏項目')).toBeInTheDocument();

    // Care records links
    const actionLinks = screen.getAllByRole('link', { name: /查看紀錄/i });
    expect(actionLinks.length).toBeGreaterThan(0);
    expect(actionLinks[0]).toHaveAttribute('href', expect.stringContaining('/care-records?residentId='));
  });

  it('allows navigating dates using previous, next, and today buttons', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DailyCompletionView />);

    const dateInput = (await screen.findByLabelText(/照護日期：/i)) as HTMLInputElement;
    const initialDate = dateInput.value;
    expect(initialDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Click Prev Day
    const prevBtn = screen.getByRole('button', { name: /前一天/i });
    await user.click(prevBtn);

    const prevDate = dateInput.value;
    expect(prevDate).not.toBe(initialDate);

    // Click Next Day
    const nextBtn = screen.getByRole('button', { name: /後一天/i });
    await user.click(nextBtn);
    expect(dateInput.value).toBe(initialDate);

    // Click Today
    const todayBtn = screen.getByRole('button', { name: /今天/i });
    await user.click(todayBtn);
    expect(dateInput.value).toBe(new Date().toISOString().split('T')[0]);
  });

  it('triggers onOpenExportModal callback when clicking export button', async () => {
    const user = userEvent.setup();
    const mockExport = vi.fn();
    renderWithProviders(<DailyCompletionView onOpenExportModal={mockExport} />);

    const exportBtn = await screen.findByRole('button', { name: /匯出本日報表/i });
    await user.click(exportBtn);

    expect(mockExport).toHaveBeenCalledTimes(1);
    expect(mockExport).toHaveBeenCalledWith({
      reportType: 'completion-report',
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('safely handles date stepping when date input is cleared without throwing RangeError', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DailyCompletionView onOpenExportModal={vi.fn()} />);

    const dateInput = screen.getByLabelText(/照護日期/i) as HTMLInputElement;

    // Clear input
    await user.clear(dateInput);
    expect(dateInput.value).toBe('');

    // Click Prev Day - should safely fallback to today minus 1 rather than throwing RangeError
    const prevBtn = screen.getByRole('button', { name: /前一天/i });
    await user.click(prevBtn);
    expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Clear again and Click Next Day
    await user.clear(dateInput);
    expect(dateInput.value).toBe('');

    const nextBtn = screen.getByRole('button', { name: /後一天/i });
    await user.click(nextBtn);
    expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

