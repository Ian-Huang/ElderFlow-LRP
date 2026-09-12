import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RepairReportPage,
  repairReportConfig,
  repairReportColumns,
  defaultRepairSampleData,
  mockRepairPool,
  getNextMockRepair,
  reportRegistry,
} from './index';
import { CsvParserEngine } from '@/utils/csvParserEngine';

describe('repairReportConfig 規範與欄位定義', () => {
  it('正確定義 8 個標準欄位且寬度總和為 100%', () => {
    expect(repairReportColumns).toHaveLength(8);

    const totalWidth = repairReportColumns.reduce(
      (sum, col) => sum + (col.widthPercent ?? 0),
      0,
    );
    expect(totalWidth).toBe(100);

    const labels = repairReportColumns.map((c) => c.label);
    expect(labels).toEqual([
      '日期',
      '時間',
      '通報人員',
      '事由',
      '稽核',
      '修繕',
      '日期(完)',
      '時間(完)',
    ]);
  });

  it('事由欄位佔比 35% 且對齊方式為靠左 (align: "left")', () => {
    const reasonCol = repairReportColumns.find((c) => c.key === 'reason');
    expect(reasonCol).toBeDefined();
    expect(reasonCol?.widthPercent).toBe(35);
    expect(reasonCol?.align).toBe('left');
    expect(reasonCol?.required).toBe(true);
  });

  it('內建 6 筆長照真實情境預設範例資料', () => {
    expect(defaultRepairSampleData).toHaveLength(6);

    const allReasons = defaultRepairSampleData.map((d) => d.reason).join(' ');
    // 涵蓋叫人鈴、輪椅煞車、冷氣漏水、無障礙扶手
    expect(allReasons).toContain('呼叫鈴');
    expect(allReasons).toContain('輪椅');
    expect(allReasons).toContain('冷氣');
    expect(allReasons).toContain('扶手');
  });

  it('報表設定檔 ID 為 "repairs" 且方向為直向 (portrait)', () => {
    expect(repairReportConfig.id).toBe('repairs');
    expect(repairReportConfig.orientation).toBe('portrait');
    expect(repairReportConfig.title).toBe('2026年度 機構修繕通報追蹤記錄');
    expect(repairReportConfig.orgName).toBe('臺北市私立中山老人長期照顧中心(養護型)');
  });
});

describe('reportRegistry 報表註冊中心', () => {
  beforeEach(() => {
    reportRegistry.reset();
  });

  it('預設已註冊 repairReportConfig', () => {
    const report = reportRegistry.get('repairs');
    expect(report).toBeDefined();
    expect(report?.id).toBe('repairs');
    expect(report?.title).toBe('2026年度 機構修繕通報追蹤記錄');
  });

  it('getAll() 回傳清單包含修繕報表', () => {
    const all = reportRegistry.getAll();
    expect(all.some((r) => r.id === 'repairs')).toBe(true);
  });
});

describe('動態資料池與循環注入演算法', () => {
  it('mockRepairPool 包含至少 5 筆擴充資料', () => {
    expect(mockRepairPool.length).toBeGreaterThanOrEqual(5);
  });

  it('getNextMockRepair 循環遞增 index 並折返', () => {
    const poolSize = mockRepairPool.length;
    const first = getNextMockRepair(0);
    expect(first.item).toEqual(mockRepairPool[0]);
    expect(first.nextIndex).toBe(1);

    const last = getNextMockRepair(poolSize - 1);
    expect(last.item).toEqual(mockRepairPool[poolSize - 1]);
    expect(last.nextIndex).toBe(0); // 環狀折返
  });
});

describe('RepairReportPage 元件渲染與互動', () => {
  it('初始載入 6 筆長照預設資料，筆數顯示「共 6 筆」', () => {
    render(<RepairReportPage />);
    expect(screen.getByTestId('row-count')).toHaveTextContent('6');
    expect(screen.getByText('護理站鍵盤無法使用')).toBeInTheDocument();
    expect(
      screen.getByText('203房 2床 床頭緊急呼叫鈴按鈕接觸不良'),
    ).toBeInTheDocument();
  });

  it('渲染機構全銜與報表標題，且具備 contenteditable="true"', () => {
    render(<RepairReportPage />);
    const orgEl = screen.getByTestId('report-org-name');
    const titleEl = screen.getByTestId('report-title');

    expect(orgEl).toHaveTextContent('臺北市私立中山老人長期照顧中心(養護型)');
    expect(orgEl).toHaveAttribute('contenteditable', 'true');

    expect(titleEl).toHaveTextContent('2026年度 機構修繕通報追蹤記錄');
    expect(titleEl).toHaveAttribute('contenteditable', 'true');
  });

  it('表格套用評鑑專用樣式 class（audit-report-table）', () => {
    render(<RepairReportPage />);
    const table = document.querySelector('table');
    expect(table).toHaveClass('audit-report-table');
  });

  it('呈現「模擬新增一筆資料」按鈕', () => {
    render(<RepairReportPage />);
    expect(screen.getByTestId('btn-mock-add')).toBeInTheDocument();
  });

  it('點擊「模擬新增一筆資料」動態累加資料筆數並顯示新項目', async () => {
    render(<RepairReportPage />);
    const user = userEvent.setup();
    const mockAddBtn = screen.getByTestId('btn-mock-add');

    // 初始 6 筆
    expect(screen.getByTestId('row-count')).toHaveTextContent('6');

    // 點擊新增 1 筆 -> 7 筆
    await user.click(mockAddBtn);
    expect(screen.getByTestId('row-count')).toHaveTextContent('7');
    expect(screen.getByText(mockRepairPool[0]?.reason ?? '')).toBeInTheDocument();

    // 點擊新增第 2 筆 -> 8 筆
    await user.click(mockAddBtn);
    expect(screen.getByTestId('row-count')).toHaveTextContent('8');
    expect(screen.getByText(mockRepairPool[1]?.reason ?? '')).toBeInTheDocument();
  });
});

describe('端到端範本與 CSV 匯入整合', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('生成之 CSV 範本具備 UTF-8 BOM 與 8 個完整欄位標頭', () => {
    const csv = CsvParserEngine.generateTemplate(repairReportConfig);

    // 必須以 BOM 開頭
    expect(csv.startsWith('\uFEFF')).toBe(true);

    // 第一行為 8 欄標頭
    const firstLine = csv.slice(1).split('\r\n')[0] ?? '';
    const headers = firstLine.split(',');
    expect(headers).toEqual([
      '日期',
      '時間',
      '通報人員',
      '事由',
      '稽核',
      '修繕',
      '日期(完)',
      '時間(完)',
    ]);
  });

  it('匯入自訂 CSV 檔案後，表格資料即時替換並更新筆數', async () => {
    render(<RepairReportPage />);

    const customCsv = [
      '日期,時間,通報人員,事由,稽核,修繕,日期(完),時間(完)',
      '2026/09/28,08:30,測試員A,701房 測試呼叫鈴,督導A,檢測正常,2026/09/28,09:00',
      '2026/09/29,14:00,測試員B,702房 測試冷氣濾網,督導A,清洗完畢,2026/09/29,15:00',
    ].join('\r\n');

    vi.spyOn(global, 'FileReader').mockImplementationOnce(() => {
      const reader = {
        readAsText: vi.fn(function (this: FileReader) {
          setTimeout(() => {
            const event = {
              target: { result: customCsv },
            } as unknown as ProgressEvent<FileReader>;
            if (typeof this.onload === 'function') this.onload(event);
          }, 0);
        }),
        onload: null as FileReader['onload'],
        onerror: null as FileReader['onerror'],
      };
      return reader as unknown as FileReader;
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([customCsv], 'custom-repairs.csv', { type: 'text/csv' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    // 資料筆數替換為 2 筆
    expect(screen.getByTestId('row-count')).toHaveTextContent('2');
    expect(screen.getByText('701房 測試呼叫鈴')).toBeInTheDocument();
    expect(screen.getByText('702房 測試冷氣濾網')).toBeInTheDocument();
    // 舊資料已被替換
    expect(screen.queryByText('護理站鍵盤無法使用')).not.toBeInTheDocument();
  });
});
