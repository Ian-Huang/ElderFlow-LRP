import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditReportShell } from './AuditReportShell';
import type { AuditReportConfig } from './auditToolkitTypes';

// Minimal 2-column config for testing
const testConfig: AuditReportConfig = {
  id: 'test-report',
  title: '測試報表',
  orientation: 'portrait',
  columns: [
    { key: 'date', label: '日期', required: true },
    { key: 'note', label: '備註', required: false },
  ],
  sampleData: [],
};

const testRows = [
  { date: '2024/01/15', note: '測試備註一' },
  { date: '2024/02/10', note: '測試備註二' },
];

function renderShell(
  overrides: Partial<AuditReportConfig> = {},
  rows: Record<string, string>[] = [],
  onImport = vi.fn(),
) {
  const config = { ...testConfig, ...overrides };
  return render(
    <AuditReportShell config={config} rows={rows} onImport={onImport} />,
  );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('AuditReportShell 渲染', () => {
  it('呈現 A4 紙張容器（data-testid="a4-sheet"）', () => {
    renderShell();
    expect(screen.getByTestId('a4-sheet')).toBeInTheDocument();
  });

  it('直向模式下 A4 容器套用 portrait class', () => {
    renderShell({ orientation: 'portrait' });
    expect(screen.getByTestId('a4-sheet')).toHaveClass('a4-portrait');
  });

  it('橫向模式下 A4 容器套用 landscape class', () => {
    renderShell({ orientation: 'landscape' });
    expect(screen.getByTestId('a4-sheet')).toHaveClass('a4-landscape');
  });

  it('顯示報表標題', () => {
    renderShell({ title: '機構修繕通報追蹤記錄' });
    expect(screen.getByText('機構修繕通報追蹤記錄')).toBeInTheDocument();
  });

  it('顯示資料筆數', () => {
    renderShell({}, testRows);
    expect(screen.getByTestId('row-count')).toHaveTextContent('2');
  });

  it('資料為空時顯示 0 筆', () => {
    renderShell({}, []);
    expect(screen.getByTestId('row-count')).toHaveTextContent('0');
  });
});

// ---------------------------------------------------------------------------
// Toolbar buttons
// ---------------------------------------------------------------------------

describe('AuditReportShell 工具列', () => {
  it('呈現「下載 CSV 範本」按鈕', () => {
    renderShell();
    expect(screen.getByRole('button', { name: /下載 CSV 範本/i })).toBeInTheDocument();
  });

  it('呈現「匯入 CSV」按鈕', () => {
    renderShell();
    expect(screen.getByRole('button', { name: /匯入 CSV/i })).toBeInTheDocument();
  });

  it('呈現「立即列印」按鈕', () => {
    renderShell();
    expect(screen.getByRole('button', { name: /立即列印|列印.*PDF/i })).toBeInTheDocument();
  });

  it('工具列具備 no-print class（列印時自動隱藏）', () => {
    renderShell();
    const toolbar = screen.getByTestId('audit-toolbar');
    expect(toolbar).toHaveClass('no-print');
  });
});

// ---------------------------------------------------------------------------
// contenteditable title
// ---------------------------------------------------------------------------

describe('AuditReportShell 標題編輯', () => {
  it('標題區域具備 contenteditable="true"', () => {
    renderShell({ title: '原始標題' });
    const titleEl = screen.getByTestId('report-title');
    expect(titleEl).toHaveAttribute('contenteditable', 'true');
  });

  it('點擊標題可直接編輯（帶 focus）', async () => {
    renderShell({ title: '原始標題' });
    const titleEl = screen.getByTestId('report-title');
    await userEvent.click(titleEl);
    expect(document.activeElement).toBe(titleEl);
  });
});

// ---------------------------------------------------------------------------
// CSV file import integration
// ---------------------------------------------------------------------------

describe('AuditReportShell CSV 匯入', () => {
  beforeEach(() => {
    // Mock FileReader
    vi.spyOn(global, 'FileReader').mockImplementation(() => {
      const reader = {
        readAsText: vi.fn(function (this: FileReader) {
          // Simulate async file read
          setTimeout(() => {
            const event = { target: { result: mockCsvContent } } as unknown as ProgressEvent<FileReader>;
            if (typeof this.onload === 'function') this.onload(event);
          }, 0);
        }),
        onload: null as FileReader['onload'],
        onerror: null as FileReader['onerror'],
      };
      return reader as unknown as FileReader;
    });
  });

  const mockCsvContent =
    '日期,備註\n2024/01/15,測試備註';

  it('選取 CSV 檔後呼叫 onImport callback（帶解析後資料）', async () => {
    const onImport = vi.fn();
    renderShell({}, [], onImport);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([mockCsvContent], 'test.csv', { type: 'text/csv' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
      // Wait for FileReader async callback
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(onImport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ date: '2024/01/15', note: '測試備註' }),
      ]),
    );
  });

  it('CSV 缺少必填欄位時呼叫 onImport 帶空陣列（防呆）', async () => {
    const onImport = vi.fn();
    // Use config with required column not in CSV
    const strictConfig: AuditReportConfig = {
      ...testConfig,
      columns: [
        { key: 'date', label: '日期', required: true },
        { key: 'reporter', label: '通報人員', required: true },
      ],
    };
    render(<AuditReportShell config={strictConfig} rows={[]} onImport={onImport} />);

    const badCsv = '備註\n只有備註欄'; // 缺 date 和 通報人員
    vi.spyOn(global, 'FileReader').mockImplementationOnce(() => {
      const reader = {
        readAsText: vi.fn(function (this: FileReader) {
          setTimeout(() => {
            const event = { target: { result: badCsv } } as unknown as ProgressEvent<FileReader>;
            if (typeof this.onload === 'function') this.onload(event);
          }, 0);
        }),
        onload: null as FileReader['onload'],
        onerror: null as FileReader['onerror'],
      };
      return reader as unknown as FileReader;
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([badCsv], 'bad.csv', { type: 'text/csv' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    // Should show error, not call onImport with data
    expect(onImport).not.toHaveBeenCalledWith(expect.arrayContaining([expect.any(Object)]));
  });
});

// ---------------------------------------------------------------------------
// Print
// ---------------------------------------------------------------------------

describe('AuditReportShell 列印', () => {
  it('點擊「立即列印」呼叫 window.print()', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    renderShell();

    const printBtn = screen.getByRole('button', { name: /立即列印|列印.*PDF/i });
    await userEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });
});
