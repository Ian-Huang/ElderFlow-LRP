import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportsLayout } from '@/pages/reports/ReportsLayout';
import { renderWithProviders, setupReportTestServer } from './testUtils';

describe('ReportsLayout Integration Tests', () => {
  setupReportTestServer();

  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window.URL.createObjectURL !== 'function') {
      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();
    }
  });

  it('renders header, title, current date indicator and export button', async () => {
    renderWithProviders(<ReportsLayout />);

    expect(screen.getByText('照護數據與報表中心')).toBeInTheDocument();
    expect(screen.getByText(/民國 \d+ 年 \d+ 月/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /產生 PDF 報表/i })).toBeInTheDocument();
  });

  it('renders 4 navigation tabs with daily completion active by default', async () => {
    renderWithProviders(<ReportsLayout />);

    const dailyTab = screen.getByTestId('tab-daily-completion');
    const residentTab = screen.getByTestId('tab-resident-summary');
    const alertsTab = screen.getByTestId('tab-alerts');
    const auditTab = screen.getByTestId('tab-audit-trail');

    expect(dailyTab).toBeInTheDocument();
    expect(residentTab).toBeInTheDocument();
    expect(alertsTab).toBeInTheDocument();
    expect(auditTab).toBeInTheDocument();

    expect(dailyTab).toHaveAttribute('aria-selected', 'true');
    expect(residentTab).toHaveAttribute('aria-selected', 'false');

    // Daily completion view content should be visible
    expect(screen.getByText(/照護日期：/i)).toBeInTheDocument();
  });

  it('switches to resident summary view when clicking the tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsLayout />);

    const residentTab = screen.getByTestId('tab-resident-summary');
    await user.click(residentTab);

    expect(residentTab).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => {
      expect(screen.getByText(/管路與三管照護統計/i)).toBeInTheDocument();
    });
  });

  it('switches to alerts view when clicking the alerts tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsLayout />);

    const alertsTab = screen.getByTestId('tab-alerts');
    await user.click(alertsTab);

    expect(alertsTab).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => {
      expect(screen.getByText(/紅標重大警示/i)).toBeInTheDocument();
      expect(screen.getByText(/黃標注意事件/i)).toBeInTheDocument();
    });
  });

  it('switches to audit trail view when clicking the audit trail tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsLayout />);

    const auditTab = screen.getByTestId('tab-audit-trail');
    await user.click(auditTab);

    expect(auditTab).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => {
      expect(screen.getByText(/不可竄改資料稽核軌跡/i)).toBeInTheDocument();
    });
  });

  it('initializes tab from URL query parameter', async () => {
    renderWithProviders(<ReportsLayout />, {
      initialEntries: ['/reports?tab=alerts'],
    });

    const alertsTab = screen.getByTestId('tab-alerts');
    expect(alertsTab).toHaveAttribute('aria-selected', 'true');

    await waitFor(() => {
      expect(screen.getByText(/紅標重大警示/i)).toBeInTheDocument();
    });
  });

  it('opens and closes the PDF export modal from header button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsLayout />);

    const exportBtn = screen.getByRole('button', { name: /產生 PDF 報表/i });
    await user.click(exportBtn);

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /產生 PDF 報表/i })).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /關閉彈窗/i });
    await user.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
