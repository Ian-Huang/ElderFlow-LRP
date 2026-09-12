import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PdfExportModal } from '@/pages/reports/PdfExportModal';
import { renderWithProviders, setupReportTestServer } from './testUtils';

describe('PdfExportModal Integration Tests', () => {
  setupReportTestServer();

  let createObjectURLMock = vi.fn();
  let revokeObjectURLMock = vi.fn();
  let windowOpenMock = vi.fn();

  beforeEach(() => {
    createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/mock-pdf-url');
    revokeObjectURLMock = vi.fn();
    windowOpenMock = vi.fn().mockReturnValue(null);

    window.URL.createObjectURL = createObjectURLMock as unknown as (obj: Blob | MediaSource) => string;
    window.URL.revokeObjectURL = revokeObjectURLMock as unknown as (url: string) => void;
    window.open = windowOpenMock as unknown as typeof window.open;
  });

  it('does not render dialog when isOpen is false', () => {
    renderWithProviders(<PdfExportModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal header, report type select, and buttons when isOpen is true', () => {
    renderWithProviders(<PdfExportModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /產生 PDF 報表/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/選擇報表類型/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /下載 PDF/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /預覽/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /取消/i })).toBeInTheDocument();
  });

  it('adjusts parameter inputs dynamically when switching report type', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PdfExportModal isOpen={true} onClose={vi.fn()} />);

    const reportTypeSelect = screen.getByLabelText(/選擇報表類型/i);

    // Default: completion-report has report date picker
    expect(screen.getByLabelText(/報表日期/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/起始日期/i)).not.toBeInTheDocument();

    // Select audit-trail: date range & entity filter should appear
    await user.selectOptions(reportTypeSelect, 'audit-trail');
    expect(screen.getByLabelText(/起始日期/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/結束日期/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/實體類型篩選/i)).toBeInTheDocument();

    // Select bed-map: floor selector should appear
    await user.selectOptions(reportTypeSelect, 'bed-map');
    expect(screen.getByLabelText(/樓層篩選/i)).toBeInTheDocument();
  });

  it('triggers PDF download and creates object URL when clicking download', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PdfExportModal isOpen={true} onClose={vi.fn()} />);

    const downloadBtn = screen.getByRole('button', { name: /下載 PDF/i });
    await user.click(downloadBtn);

    await waitFor(() => {
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/下載成功/i)).toBeInTheDocument();
    });
  });

  it('triggers PDF preview and opens in new window when clicking preview', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PdfExportModal isOpen={true} onClose={vi.fn()} />);

    const previewBtn = screen.getByRole('button', { name: /預覽/i });
    await user.click(previewBtn);

    await waitFor(() => {
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(windowOpenMock).toHaveBeenCalledWith('blob:http://localhost/mock-pdf-url', '_blank');
    });
  });

  it('calls onClose when cancel or close button is clicked', async () => {
    const user = userEvent.setup();
    const mockClose = vi.fn();
    renderWithProviders(<PdfExportModal isOpen={true} onClose={mockClose} />);

    const cancelBtn = screen.getByRole('button', { name: /取消/i });
    await user.click(cancelBtn);

    expect(mockClose).toHaveBeenCalledTimes(1);

    const closeIconBtn = screen.getByRole('button', { name: /關閉彈窗/i });
    await user.click(closeIconBtn);

    expect(mockClose).toHaveBeenCalledTimes(2);
  });
});
