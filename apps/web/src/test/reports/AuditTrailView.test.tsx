import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditTrailView } from '@/pages/reports/AuditTrailView';
import { renderWithProviders, setupReportTestServer } from './testUtils';

describe('AuditTrailView Integration Tests', () => {
  setupReportTestServer();

  it('renders audit trail table columns and security banner', async () => {
    renderWithProviders(<AuditTrailView />);

    await waitFor(() => {
      expect(screen.getByText(/不可竄改資料稽核軌跡/)).toBeInTheDocument();
      expect(screen.getByTestId('audit-trail-table')).toBeInTheDocument();
    });

    // Table columns
    expect(screen.getByRole('columnheader', { name: '異動時間戳記' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '操作人員 / IP' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '操作類型' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '實體 / 記錄編號' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '異動欄位' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '變更前舊值' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '變更後新值' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '異動理由 / 備註' })).toBeInTheDocument();
  });

  it('renders seeded audit trail entries with action badges and diff values', async () => {
    renderWithProviders(<AuditTrailView />);

    await waitFor(() => {
      expect(screen.getByTestId('audit-trail-table')).toBeInTheDocument();
    });

    // Action types
    expect(screen.getAllByText('新增').length).toBeGreaterThan(0);
    expect(screen.getAllByText('變更').length).toBeGreaterThan(0);

    // Entity types
    expect(screen.getAllByText('住民資料').length).toBeGreaterThan(0);
  });

  it('filters audit trail entries by entity type', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuditTrailView />);

    await waitFor(() => {
      expect(screen.getByTestId('audit-trail-table')).toBeInTheDocument();
    });

    const entitySelect = screen.getByLabelText(/實體類型/i);
    await user.selectOptions(entitySelect, 'Medication');

    await waitFor(() => {
      expect(screen.getAllByText('用藥處方').length).toBeGreaterThan(0);
      expect(screen.queryByText('個別化照護計畫')).not.toBeInTheDocument();
    });
  });

  it('filters audit trail entries by action type and resets filters', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuditTrailView />);

    await waitFor(() => {
      expect(screen.getByTestId('audit-trail-table')).toBeInTheDocument();
    });

    const actionSelect = screen.getByLabelText(/操作類型/i);
    await user.selectOptions(actionSelect, 'Delete');

    await waitFor(() => {
      expect(screen.getAllByText('刪除').length).toBeGreaterThan(0);
    });

    // Reset filters
    const resetBtn = screen.getByRole('button', { name: /重設篩選條件/i });
    await user.click(resetBtn);

    await waitFor(() => {
      expect(screen.getAllByText('新增').length).toBeGreaterThan(0);
    });
  });

  it('renders pagination controls and supports page jump', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuditTrailView />);

    await waitFor(() => {
      expect(screen.getByText(/每頁 20 筆/)).toBeInTheDocument();
    });

    const prevBtn = screen.getByRole('button', { name: /上一頁/i });
    const nextBtn = screen.getByRole('button', { name: /下一頁/i });

    // Page 1: prev button is disabled, next button exists
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeInTheDocument();

    // Jump page input
    const jumpInput = screen.getByLabelText(/跳至/i);
    const jumpBtn = screen.getByRole('button', { name: /前往/i });

    await user.type(jumpInput, '1');
    await user.click(jumpBtn);

    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page');
  });

  it('triggers onOpenExportModal callback when clicking export button', async () => {
    const user = userEvent.setup();
    const mockExport = vi.fn();
    renderWithProviders(<AuditTrailView onOpenExportModal={mockExport} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /匯出稽核報表/i })).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /匯出稽核報表/i });
    await user.click(exportBtn);

    expect(mockExport).toHaveBeenCalledTimes(1);
    expect(mockExport).toHaveBeenCalledWith(
      expect.objectContaining({
        reportType: 'audit-trail',
      })
    );
  });
});
