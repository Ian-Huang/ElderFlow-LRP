import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import {
  SanitationReportPrintView,
  SanitationReportPage,
  sanitationReportConfig,
  sanitationReportColumns,
  generateMonthSanitationData,
  defaultSanitationSampleData,
  reportRegistry,
  AuditReportDispatcher,
  HandwrittenCheck,
  isFutureDate,
  getHandwrittenSeed,
} from './index';
import { CsvParserEngine } from '@/utils/csvParserEngine';

describe('sanitationReportConfig 規格與欄位定義 (F-環安-004 直向 A4 一頁制式)', () => {
  it('正確定義標準欄位且包含日期、班別、8項清潔、簽名與查核', () => {
    expect(sanitationReportColumns).toHaveLength(12);

    const labels = sanitationReportColumns.map((c) => c.label);
    expect(labels).toContain('日期');
    expect(labels).toContain('班別');
    expect(labels).toContain('地面');
    expect(labels).toContain('桌椅');
    expect(labels).toContain('一般用品');
    expect(labels).toContain('窗戶');
    expect(labels).toContain('衣櫃.床');
    expect(labels).toContain('衣物清潔');
    expect(labels).toContain('廁所1');
    expect(labels).toContain('廁所2');
    expect(labels).toContain('清潔簽名');
    expect(labels).toContain('查核');
  });

  it('defaultSanitationSampleData 包含 2026 年 9 月每日雙班次紀錄，簽名與查核預設為空', () => {
    expect(defaultSanitationSampleData).toHaveLength(60); // 30 天 x 2 班
    expect(defaultSanitationSampleData[0]?.signature).toBe('');
    expect(defaultSanitationSampleData[0]?.auditor).toBe('');
  });

  it('generateMonthSanitationData 能動態生成指定月份之雙班次資料列', () => {
    const data = generateMonthSanitationData(2026, 10);
    expect(data).toHaveLength(62); // 31 天 x 2 班
  });

  it('支援別名導出 SanitationReportPage', () => {
    render(
      <MemoryRouter>
        <SanitationReportPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('decade-block-0')).toBeInTheDocument();
  });

  it('reportRegistry 預設註冊包含 sanitation 模組，紙張方向為直向 portrait', () => {
    reportRegistry.reset();
    const config = reportRegistry.get('sanitation');
    expect(config).toBeDefined();
    expect(config?.id).toBe('sanitation');
    expect(config?.orientation).toBe('portrait');
  });

  it('支援透過 CsvParserEngine 產製 UTF-8 CSV 範本', () => {
    const csv = CsvParserEngine.generateTemplate(sanitationReportConfig);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('地面');
    expect(csv).toContain('桌椅');
  });

  it('報表設定檔 ID 為 "sanitation" 且方向為直向 (portrait)', () => {
    expect(sanitationReportConfig.id).toBe('sanitation');
    expect(sanitationReportConfig.orientation).toBe('portrait');
    expect(sanitationReportConfig.title).toBe('環境清潔消毒紀錄表');
    expect(sanitationReportConfig.status).toBe('available');
  });
});

describe('isFutureDate 未來時間防呆演算法', () => {
  const mockRefDate = new Date(2026, 8, 12, 12, 0, 0); // 2026-09-12

  it('當月小於或等於今天的日期為過去/當日，不屬於未來', () => {
    expect(isFutureDate(2026, 9, 1, mockRefDate)).toBe(false);
    expect(isFutureDate(2026, 9, 12, mockRefDate)).toBe(false);
  });

  it('當月大於今天的日期為未來時間，必須判定為 true', () => {
    expect(isFutureDate(2026, 9, 13, mockRefDate)).toBe(true);
    expect(isFutureDate(2026, 9, 20, mockRefDate)).toBe(true);
    expect(isFutureDate(2026, 9, 30, mockRefDate)).toBe(true);
  });

  it('未來月份的所有日期皆判定為未來時間', () => {
    expect(isFutureDate(2026, 10, 1, mockRefDate)).toBe(true);
    expect(isFutureDate(2027, 1, 1, mockRefDate)).toBe(true);
  });

  it('過去月份的所有日期皆判定為過去時間（非未來）', () => {
    expect(isFutureDate(2026, 8, 31, mockRefDate)).toBe(false);
    expect(isFutureDate(2025, 12, 25, mockRefDate)).toBe(false);
  });
});

describe('getHandwrittenSeed 跨月隨機種子演算法', () => {
  it('不同月份的同一天產生完全不同的隨機種子，擺脫千篇一律', () => {
    const seedSep1 = getHandwrittenSeed(2026, 9, 1, 0, '日');
    const seedOct1 = getHandwrittenSeed(2026, 10, 1, 0, '日');
    const seedAug1 = getHandwrittenSeed(2026, 8, 1, 0, '日');

    expect(seedSep1).not.toEqual(seedOct1);
    expect(seedSep1).not.toEqual(seedAug1);
    expect(seedOct1).not.toEqual(seedAug1);
  });
});

describe('HandwrittenCheck 擬真人手寫打勾元件 (高多樣性手感)', () => {
  it('渲染具備手寫特徵的 SVG 元素與 path 輪廓', () => {
    const { container } = render(<HandwrittenCheck seed={101} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-label', '手寫勾選');

    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path).toHaveAttribute('stroke-linecap', 'round');
  });

  it('不同 seed 產生不同旋轉角度、尺寸與平移，展現大、小、歪等豐富人味變化', () => {
    const { container: c1 } = render(<HandwrittenCheck seed={10} />);
    const { container: c2 } = render(<HandwrittenCheck seed={25} />);
    const { container: c3 } = render(<HandwrittenCheck seed={99} />);

    const svg1 = c1.querySelector('svg');
    const svg2 = c2.querySelector('svg');
    const svg3 = c3.querySelector('svg');

    expect(svg1?.style.transform).not.toEqual(svg2?.style.transform);
    expect(svg2?.style.transform).not.toEqual(svg3?.style.transform);
  });
});

describe('SanitationReportPrintView 元件渲染與互動 (F-環安-004 滿版與未來防呆)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('A4 紙張外觀容器套用 flex 垂直填滿樣式 (justify-between 滿版)', () => {
    render(
      <MemoryRouter>
        <SanitationReportPrintView />
      </MemoryRouter>,
    );

    const sheet = screen.getByTestId('a4-sheet');
    expect(sheet).toHaveClass('flex');
    expect(sheet).toHaveClass('flex-col');
    expect(sheet).toHaveClass('justify-between');
  });

  it('過去與今天日期有勾，未來日期（如 9/20）預設絕不打勾', () => {
    render(
      <MemoryRouter>
        <SanitationReportPrintView />
      </MemoryRouter>,
    );

    // 第 1 日（過去）預設有打勾
    const pastCell = screen.getByTestId('cell-1-日-floor');
    expect(within(pastCell).getByRole('img', { name: '手寫勾選' })).toBeInTheDocument();

    // 第 25 日（未來）預設絕對無打勾
    const futureCell = screen.getByTestId('cell-25-日-floor');
    expect(within(futureCell).queryByRole('img', { name: '手寫勾選' })).not.toBeInTheDocument();
  });

  it('未來日期嚴格禁止點選打勾 (防呆保護)', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SanitationReportPrintView />
      </MemoryRouter>,
    );

    const futureCell = screen.getByTestId('cell-25-日-floor');
    expect(within(futureCell).queryByRole('img', { name: '手寫勾選' })).not.toBeInTheDocument();

    // 點擊未來日期單元格
    await user.click(futureCell);

    // 依然無打勾，防呆生效
    expect(within(futureCell).queryByRole('img', { name: '手寫勾選' })).not.toBeInTheDocument();
  });

  it('簽名格子日夜合併（colspan=2），提供寬裕空間', () => {
    render(
      <MemoryRouter>
        <SanitationReportPrintView />
      </MemoryRouter>,
    );

    const daySignCell = screen.getByTestId('sign-day-cell-1');
    expect(daySignCell).toBeInTheDocument();
    expect(daySignCell).toHaveAttribute('colspan', '2');
  });

  it('表頭修訂日期預設為「111.01.01 一修」且支援可編輯', () => {
    render(
      <MemoryRouter>
        <SanitationReportPrintView />
      </MemoryRouter>,
    );

    const formDate = screen.getByTestId('report-form-date');
    expect(formDate).toHaveTextContent('111.01.01 一修');
  });

  it('頁尾渲染最新規定「**日班、夜班每日以1000ppm 漂白水消毒清潔各一次；嘔吐、排泄物5000ppm 漂白水消毒清潔。」', () => {
    render(
      <MemoryRouter>
        <SanitationReportPrintView />
      </MemoryRouter>,
    );

    const note = screen.getByTestId('report-footer-disinfection-note');
    expect(note).toHaveTextContent('**日班、夜班每日以1000ppm 漂白水消毒清潔各一次；嘔吐、排泄物5000ppm 漂白水消毒清潔。');
  });

  it('點擊左上方「點我列印」或工具列「立即列印 / PDF」皆觸發 window.print', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SanitationReportPrintView />
      </MemoryRouter>,
    );

    const clickToPrintBtn = screen.getByTestId('btn-click-to-print');
    await user.click(clickToPrintBtn);
    expect(printSpy).toHaveBeenCalledTimes(1);

    const toolbarPrintBtn = screen.getByTestId('btn-print-toolbar');
    await user.click(toolbarPrintBtn);
    expect(printSpy).toHaveBeenCalledTimes(2);
  });

  it('點擊「一鍵切換打勾」僅切換過去與今天日期，未來的時間永遠不會被勾', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SanitationReportPrintView />
      </MemoryRouter>,
    );

    const toggleBtn = screen.getByTestId('btn-toggle-all-checks');
    const pastCell = screen.getByTestId('cell-1-日-floor');
    const futureCell = screen.getByTestId('cell-25-日-floor');

    // 點擊 -> 清除過去勾
    await user.click(toggleBtn);
    expect(within(pastCell).queryByRole('img', { name: '手寫勾選' })).not.toBeInTheDocument();
    expect(within(futureCell).queryByRole('img', { name: '手寫勾選' })).not.toBeInTheDocument();

    // 再次點擊 -> 填滿過去勾，未來依舊為空！
    await user.click(toggleBtn);
    expect(within(pastCell).getByRole('img', { name: '手寫勾選' })).toBeInTheDocument();
    expect(within(futureCell).queryByRole('img', { name: '手寫勾選' })).not.toBeInTheDocument();
  });

  it('動態路由器 AuditReportDispatcher 能正確分發 /audit-toolkit/sanitation', () => {
    render(
      <MemoryRouter initialEntries={['/audit-toolkit/sanitation']}>
        <Routes>
          <Route path="/audit-toolkit/:reportId" element={<AuditReportDispatcher />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('sanitation-report-print-view')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '環境清潔消毒紀錄表' })).toBeInTheDocument();
  });
});
