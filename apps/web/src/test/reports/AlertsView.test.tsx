import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertsView } from '@/pages/reports/AlertsView';
import { renderWithProviders, setupReportTestServer } from './testUtils';

describe('AlertsView Integration Tests', () => {
  setupReportTestServer();

  it('renders alert summary counters bar', async () => {
    renderWithProviders(<AlertsView />);

    await waitFor(() => {
      expect(screen.getByText('紅標重大警示')).toBeInTheDocument();
      expect(screen.getByText('黃標注意事件')).toBeInTheDocument();
      expect(screen.getByText(/未處理項目/)).toBeInTheDocument();
      expect(screen.getByText(/已解除項目/)).toBeInTheDocument();
    });
  });

  it('renders real-time alert items with badges, descriptions, resident info, and links', async () => {
    renderWithProviders(<AlertsView />);

    await waitFor(() => {
      expect(screen.getByTestId('alert-item-ALT-001')).toBeInTheDocument();
    });

    const alert1 = screen.getByTestId('alert-item-ALT-001');
    expect(alert1).toHaveTextContent('血氧飽和度嚴重偏低');
    expect(alert1).toHaveTextContent('住民 SpO2 降至 88%');
    expect(alert1).toHaveTextContent('王大明');
    expect(alert1).toHaveTextContent('101-A');
    expect(alert1).toHaveTextContent('🔴 紅標重大');

    // Link to relevant record
    const recordLink = alert1.querySelector('a');
    expect(recordLink).toBeInTheDocument();
    expect(recordLink).toHaveAttribute('href', expect.stringContaining('/care-records?residentId=RES-001'));
  });

  it('filters alert items by severity level', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AlertsView />);

    await waitFor(() => {
      expect(screen.getByTestId('alert-item-ALT-001')).toBeInTheDocument();
    });

    const severitySelect = screen.getByLabelText(/危害層級：/i);

    // Filter to red severity only
    await user.selectOptions(severitySelect, 'red');
    await waitFor(() => {
      expect(screen.getByTestId('alert-item-ALT-001')).toBeInTheDocument();
      expect(screen.queryByTestId('alert-item-ALT-003')).not.toBeInTheDocument();
    });

    // Filter to yellow severity only
    await user.selectOptions(severitySelect, 'yellow');
    await waitFor(() => {
      expect(screen.getByTestId('alert-item-ALT-003')).toBeInTheDocument();
      expect(screen.queryByTestId('alert-item-ALT-001')).not.toBeInTheDocument();
    });
  });

  it('filters alert items by keyword search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AlertsView />);

    await waitFor(() => {
      expect(screen.getByTestId('alert-item-ALT-001')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/搜尋住民姓名、床號或警示內容/i);
    await user.type(searchInput, '王大明');

    expect(screen.getByTestId('alert-item-ALT-001')).toBeInTheDocument();
    expect(screen.queryByTestId('alert-item-ALT-002')).not.toBeInTheDocument();

    // Clear search keyword
    const clearBtn = screen.getByRole('button', { name: /清除/i });
    await user.click(clearBtn);

    expect(screen.getByTestId('alert-item-ALT-001')).toBeInTheDocument();
    expect(screen.getByTestId('alert-item-ALT-002')).toBeInTheDocument();
  });

  it('toggles alert status interactively from open to acknowledged and resolved', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AlertsView />);

    await waitFor(() => {
      expect(screen.getByTestId('alert-item-ALT-001')).toBeInTheDocument();
    });

    const alert1 = screen.getByTestId('alert-item-ALT-001');
    expect(alert1).toHaveTextContent('未處理');

    // Click "確認警示"
    const ackBtn = alert1.querySelector('button:nth-child(1)');
    expect(ackBtn).toBeInTheDocument();
    await user.click(ackBtn!);

    // Should update status to acknowledged
    await waitFor(() => {
      expect(screen.getByTestId('alert-item-ALT-001')).toHaveTextContent('已確認處理中');
    });

    // Click "解除警示"
    const resolveBtn = screen.getByTestId('alert-item-ALT-001').querySelector('button');
    expect(resolveBtn).toBeInTheDocument();
    await user.click(resolveBtn!);

    // Should update status to resolved
    await waitFor(() => {
      expect(screen.getByTestId('alert-item-ALT-001')).toHaveTextContent('已解除');
    });
  });
});
