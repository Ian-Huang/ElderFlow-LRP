import { useState, useCallback, useRef, useMemo, Fragment } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate, useInRouterContext } from 'react-router-dom';
import { CsvParserEngine } from '@/utils/csvParserEngine';
import '@/styles/print.css';
import {
  sanitationReportConfig,
  generateMonthSanitationData,
  SANITATION_ITEMS,
  isFutureDate,
  getHandwrittenSeed,
} from './sanitationReportConfig';
import { DownloadIcon, UploadIcon, PrintIcon, ArrowLeftIcon } from './icons';

export interface SanitationReportPrintViewProps {
  initialYear?: number;
  initialMonth?: number;
  onBack?: () => void;
}

/**
 * 擬真人手寫打勾 SVG 路徑資料庫（共 14 種真實手寫筆跡變體）
 */
export const HANDWRITTEN_CHECK_PATHS = [
  // 1. 俐落瀟灑標準勾
  'M 2.8 11.2 C 4.5 12.8 6.2 16.0 7.8 16.8 C 10.2 12.5 14.2 6.8 18.8 2.6',
  // 2. 銳利急速轉折
  'M 3.8 9.5 L 7.2 16.5 L 18.5 2.2',
  // 3. 圓潤底弧、稍緩頓筆
  'M 2.6 10.2 C 4.0 11.8 5.6 15.6 7.2 16.8 C 9.2 12.8 12.8 7.5 17.5 3.8',
  // 4. 自信大甩尾、右上大幅揚升
  'M 2.4 11.8 C 4.1 13.2 5.8 16.2 7.6 17.2 C 10.4 11.8 14.8 5.8 19.5 1.8',
  // 5. 緊湊俐落短勾
  'M 3.6 11.0 Q 5.8 14.5 7.4 16.0 Q 11.5 9.5 16.8 4.6',
  // 6. 明顯偏右傾斜手勢
  'M 4.0 10.2 L 8.0 16.8 L 18.2 2.0',
  // 7. 轉角手腕施力加重
  'M 2.8 10.8 C 4.2 12.4 5.9 15.8 7.5 16.5 C 9.8 12.0 13.6 6.8 17.8 3.2',
  // 8. 柔和圓弧隨筆
  'M 3.2 10.5 C 4.6 12.0 6.0 15.0 7.3 16.2 C 9.5 12.2 13.0 7.2 17.2 3.6',
  // 9. 末端微勾下壓收筆
  'M 3.0 11.2 C 4.5 12.6 6.2 15.5 7.6 16.6 C 10.0 12.0 13.8 6.5 18.2 2.8 C 18.8 3.2 18.5 3.8 18.2 4.2',
  // 10. 起筆稍長、落筆果決
  'M 1.8 9.8 C 3.6 11.8 5.8 15.8 7.4 16.8 C 9.8 12.2 13.5 6.8 18.0 3.0',
  // 11. 隨性快速劃記
  'M 3.5 11.5 L 6.8 16.0 L 17.8 3.5',
  // 12. 大角度開展勾
  'M 2.2 10.8 C 4.2 12.2 6.0 15.2 7.8 16.4 C 10.8 12.5 15.0 7.5 19.2 3.5',
  // 13. 微震顫自然手感
  'M 3.0 10.6 C 4.5 12.2 5.8 15.4 7.4 16.5 C 9.5 12.8 13.2 7.0 18.0 2.5',
  // 14. 挺拔筆直微揚
  'M 3.8 10.0 C 4.8 12.2 6.5 15.8 7.6 16.6 C 9.8 11.5 13.2 6.0 17.6 2.4',
];

/**
 * 擬真人手感打勾元件 (HandwrittenCheck)
 */
export function HandwrittenCheck({ seed }: { seed: number }) {
  const s = Math.abs(seed);

  const pathIdx = s % HANDWRITTEN_CHECK_PATHS.length;
  const pathData = HANDWRITTEN_CHECK_PATHS[pathIdx]!;

  // 尺寸多樣性 (大一點、小一點)
  const sizeTier = (s * 11) % 10;
  let scale = 1.0;
  if (sizeTier === 0 || sizeTier === 1) {
    scale = 0.72 + (s % 4) * 0.03;
  } else if (sizeTier >= 2 && sizeTier <= 6) {
    scale = 0.95 + (s % 6) * 0.03;
  } else if (sizeTier === 7 || sizeTier === 8) {
    scale = 1.18 + (s % 4) * 0.03;
  } else {
    scale = 1.32 + (s % 3) * 0.03;
  }

  // 歪斜傾角 (-15° 至 +18°)
  const rotation = ((s * 17) % 34) - 15;

  // 格內自然偏移 (-1.8px ~ +1.8px)
  const offsetX = (((s * 7) % 7) - 3) * 0.6;
  const offsetY = (((s * 19) % 7) - 3) * 0.5;

  // 筆壓粗細 (1.6px ~ 2.4px)
  const strokeWidth = 1.6 + ((s * 23) % 5) * 0.18;

  // 原子筆墨色微變化
  const inkColors = ['#0f172a', '#171717', '#111827', '#1e293b', '#18181b'];
  const strokeColor = inkColors[(s * 31) % inkColors.length];

  return (
    <svg
      viewBox="0 0 22 20"
      className="w-4 h-4 inline-block select-none overflow-visible pointer-events-none"
      style={{
        transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg) scale(${scale})`,
        transformOrigin: 'center center',
      }}
      aria-label="手寫勾選"
      role="img"
    >
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface DecadeBlockDef {
  label: string;
  startDay: number;
  endDay: number;
}

const DECADE_BLOCKS: DecadeBlockDef[] = [
  { label: '上旬 (1-10日)', startDay: 1, endDay: 10 },
  { label: '中旬 (11-20日)', startDay: 11, endDay: 20 },
  { label: '下旬 (21-31日)', startDay: 21, endDay: 31 },
];

/**
 * 環境清潔消毒紀錄表 (SanitationReportPrintView) - 最新滿版與未來防呆規範
 *
 * 核心升級：
 * 1. 【防呆】未來日期絕對不打勾，且禁止點選勾選未來時段，符合評鑑合規
 * 2. 【月份亂數】打勾種子整合年月參數，每個月同一天的筆跡角度與大小皆徹底不同
 * 3. 【A4 滿版】採用垂直 flex 均勻拉伸佈局，徹底消除下方留白，100% 填滿整張 A4 直向紙張
 * 4. 【大格簽名】日夜班簽名大格合併，簽名空間充裕
 */
export function SanitationReportPrintView({
  initialYear = 2026,
  initialMonth = 9,
  onBack,
}: SanitationReportPrintViewProps) {
  const inRouter = useInRouterContext();
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else if (inRouter) {
      navigate('/frontline-lab');
    }
  }, [onBack, inRouter, navigate]);

  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);

  const [orgName, setOrgName] = useState<string>(sanitationReportConfig.orgName ?? '臺北市私立中山老人長期照顧中心(養護型)');
  const [formCode, setFormCode] = useState<string>('F-環安-004');
  const [title, setTitle] = useState<string>(sanitationReportConfig.title);
  const [formDate, setFormDate] = useState<string>('111.01.01 一修');

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  // 打勾狀態：預設依據當前時間，只有「今天與過去的時間」才能有勾，未來時間維持 false 空白！
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (let d = 1; d <= 31; d++) {
      const isFuture = isFutureDate(initialYear, initialMonth, d);
      ['日', '夜'].forEach((shift) => {
        SANITATION_ITEMS.forEach((item) => {
          initial[`${d}_${shift}_${item.id}`] = !isFuture && d <= daysInMonth;
        });
      });
    }
    return initial;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // 單格切換打勾（防呆：未來時間嚴禁勾選！）
  const handleCellClick = useCallback(
    (key: string, day: number) => {
      if (isFutureDate(year, month, day)) {
        return; // 未來日期禁止打勾
      }
      setChecks((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    },
    [year, month],
  );

  // 一鍵切換打勾（只切換「今天與過去」的日期，未來的時間永遠不會被勾！）
  const handleToggleAllChecks = useCallback(() => {
    setChecks((prev) => {
      // 檢測第 1 日白天是否有勾
      const sampleKey = `1_日_${SANITATION_ITEMS[0]!.id}`;
      const currentlyChecked = Boolean(prev[sampleKey]);
      const nextVal = !currentlyChecked;

      const nextState: Record<string, boolean> = { ...prev };
      for (let d = 1; d <= daysInMonth; d++) {
        const isFuture = isFutureDate(year, month, d);
        ['日', '夜'].forEach((shift) => {
          SANITATION_ITEMS.forEach((item) => {
            // 未來日期嚴禁填勾
            nextState[`${d}_${shift}_${item.id}`] = isFuture ? false : nextVal;
          });
        });
      }
      return nextState;
    });
  }, [year, month, daysInMonth]);

  // 年月份切換（重新套用「未來不打勾」與月份亂數計算）
  const handleDateChange = useCallback((newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    const newMaxDays = new Date(newYear, newMonth, 0).getDate();

    setChecks((prev) => {
      const nextState: Record<string, boolean> = { ...prev };
      for (let d = 1; d <= 31; d++) {
        const isFuture = isFutureDate(newYear, newMonth, d);
        ['日', '夜'].forEach((shift) => {
          SANITATION_ITEMS.forEach((item) => {
            nextState[`${d}_${shift}_${item.id}`] = !isFuture && d <= newMaxDays;
          });
        });
      }
      return nextState;
    });
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    const rows = generateMonthSanitationData(year, month);
    const dynamicConfig = {
      ...sanitationReportConfig,
      sampleData: rows,
    };
    const csv = CsvParserEngine.generateTemplate(dynamicConfig);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `環境清潔消毒紀錄表_${year}年${String(month).padStart(2, '0')}月.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, [year, month]);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setParseError(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text !== 'string') return;

        const result = CsvParserEngine.parse(text, sanitationReportConfig);
        if (result.ok) {
          const importedChecks: Record<string, boolean> = {};
          result.value.forEach((row) => {
            const d = Number(row.date);
            const shift = row.shift;
            if (d && shift) {
              const isFuture = isFutureDate(year, month, d);
              SANITATION_ITEMS.forEach((item) => {
                const val = row[item.id] ?? '';
                if (!isFuture && (val.includes('✔') || val.includes('✓') || val === '1')) {
                  importedChecks[`${d}_${shift}_${item.id}`] = true;
                }
              });
            }
          });
          setChecks(importedChecks);
        } else {
          setParseError(
            `匯入失敗：CSV 缺少必填欄位「${result.error.missingColumns.join('、')}」，請檢查範本格式後重試。`,
          );
        }
      };
      reader.readAsText(file, 'utf-8');
      e.target.value = '';
    },
    [year, month],
  );

  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const yearOptions = useMemo(() => [2024, 2025, 2026, 2027, 2028, 2029, 2030], []);

  return (
    <div className="sanitation-report-print-view" data-testid="sanitation-report-print-view">
      {/* 直向 A4 滿版列印樣式注入（嚴格消除下方留白，一頁滿版） */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 4mm 6mm 4mm 6mm;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .a4-sheet {
            width: 100% !important;
            height: 289mm !important;
            max-height: 289mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .block-table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .audit-report-table th,
          .audit-report-table td {
            border: 1px solid #000 !important;
          }
        }
      `}</style>

      {/* 頂部全域工具列（列印自動隱藏） */}
      <div
        className="no-print flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20"
        data-testid="audit-toolbar"
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            data-testid="btn-back-to-hub"
            aria-label="返回現場實驗室"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            <span>返回現場實驗室</span>
          </button>

          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            A4 直向滿版・未來防呆保護中
          </span>

          {parseError && (
            <span className="text-xs text-danger-600 bg-danger-50 px-2 py-1 rounded" role="alert">
              {parseError}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleAllChecks}
            className="btn btn-secondary text-xs"
            data-testid="btn-toggle-all-checks"
            title="一鍵全選或清除清潔打勾（未來的時間自動維持空白）"
          >
            一鍵切換打勾
          </button>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="btn btn-secondary text-xs flex items-center gap-1"
            aria-label="下載 CSV 範本"
            data-testid="btn-download-csv"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            下載 CSV 範本
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary text-xs flex items-center gap-1"
            aria-label="匯入 CSV"
            data-testid="btn-import-csv"
          >
            <UploadIcon className="w-3.5 h-3.5" />
            匯入 CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="sr-only"
            tabIndex={-1}
            aria-label="選取 CSV 檔案"
          />

          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary text-xs flex items-center gap-1"
            aria-label="立即列印 / PDF"
            data-testid="btn-print-toolbar"
          >
            <PrintIcon className="w-3.5 h-3.5" />
            立即列印 / PDF
          </button>
        </div>
      </div>

      {/* A4 直向紙張本體：採用 flex-col 與 justify-between 100% 塞滿一張 A4，消除下方空白 */}
      <div
        className="a4-sheet a4-portrait relative font-sans text-gray-900 bg-white flex flex-col justify-between"
        style={{
          height: '1123px',
          maxHeight: '1123px',
          maxWidth: '794px',
          margin: '12px auto',
          padding: '18px 24px 14px 24px',
          boxSizing: 'border-box',
        }}
        data-testid="a4-sheet"
      >
        {/* 背景中央浮水印「中山」 */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0"
          aria-hidden="true"
        >
          <span
            className="font-black tracking-widest text-gray-900"
            style={{
              fontSize: '180px',
              opacity: 0.05,
              transform: 'rotate(-35deg)',
              fontFamily: 'serif',
            }}
          >
            中山
          </span>
        </div>

        {/* 頂部區域：按鈕、機構全銜、表單代號、主標題、制定日期與年月份 */}
        <div className="z-10 relative">
          {/* 操作列（螢幕顯示，列印隱藏） */}
          <div className="no-print flex items-center justify-between mb-1">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1 bg-white hover:bg-gray-50 text-gray-800 text-xs font-medium rounded border border-gray-400 shadow-sm transition-colors cursor-pointer"
              data-testid="btn-click-to-print"
              aria-label="點我列印"
            >
              點我列印
            </button>

            <div className="flex items-center gap-1 bg-white p-1 rounded border border-gray-300 text-xs">
              <label htmlFor="select-year" className="sr-only">選擇年份</label>
              <select
                id="select-year"
                value={year}
                onChange={(e) => handleDateChange(Number(e.target.value), month)}
                className="border-none bg-transparent font-bold text-gray-800 focus:ring-0 cursor-pointer py-0.5"
                data-testid="select-year"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>

              <label htmlFor="select-month" className="sr-only">選擇月份</label>
              <select
                id="select-month"
                value={month}
                onChange={(e) => handleDateChange(year, Number(e.target.value))}
                className="border-none bg-transparent font-bold text-gray-800 focus:ring-0 cursor-pointer py-0.5"
                data-testid="select-month"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 機構全銜 */}
          <div className="text-center mb-0.5">
            <div
              data-testid="report-org-name"
              contentEditable="true"
              suppressContentEditableWarning
              onBlur={(e) => setOrgName(e.currentTarget.textContent ?? orgName)}
              className="text-xl sm:text-2xl font-black text-gray-900 tracking-wider cursor-text inline-block"
              title="點擊可修改機構全銜"
            >
              {orgName}
            </div>
          </div>

          {/* 表單代碼、標題、制定日期 */}
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-gray-900 mb-0.5 px-1">
            <div
              data-testid="report-form-code"
              contentEditable="true"
              suppressContentEditableWarning
              onBlur={(e) => setFormCode(e.currentTarget.textContent ?? formCode)}
              className="w-1/4 text-left font-semibold cursor-text"
              title="點擊可修改表單代號"
            >
              {formCode}
            </div>

            <div className="w-2/4 text-center">
              <h1
                data-testid="report-title"
                contentEditable="true"
                suppressContentEditableWarning
                onBlur={(e) => setTitle(e.currentTarget.textContent ?? title)}
                className="text-lg sm:text-xl font-black tracking-widest cursor-text inline-block"
                title="點擊可修改標題"
              >
                {title}
              </h1>
            </div>

            <div
              data-testid="report-form-date"
              contentEditable="true"
              suppressContentEditableWarning
              onBlur={(e) => setFormDate(e.currentTarget.textContent ?? formDate)}
              className="w-1/4 text-right font-normal text-[11px] sm:text-xs cursor-text"
              title="點擊可修改制定日期"
            >
              {formDate}
            </div>
          </div>

          {/* 年 月標記 */}
          <div
            className="text-center text-sm font-bold tracking-widest text-gray-900 mb-1"
            data-testid="report-year-month"
          >
            {year} 年 {String(month).padStart(2, '0')} 月
          </div>
        </div>

        {/* 表格主體區域：三旬表格垂直滿版分佈 */}
        <div className="flex-1 flex flex-col justify-between py-1 z-10 relative">
          {DECADE_BLOCKS.map((block, blockIdx) => {
            const blockDays: number[] = [];
            for (let d = block.startDay; d <= block.endDay; d++) {
              blockDays.push(d);
            }

            return (
              <div
                key={block.label}
                className="block-table"
                data-testid={`decade-block-${blockIdx}`}
              >
                <table
                  className="w-full border-collapse text-center"
                  style={{
                    border: '1.8px solid #000',
                    fontSize: '10px',
                    tableLayout: 'fixed',
                  }}
                >
                  <thead>
                    {/* 表頭第 1 列：日期與天數 */}
                    <tr style={{ height: '18px' }}>
                      <th
                        rowSpan={2}
                        className="border border-black bg-white p-0 font-bold text-center"
                        style={{ width: '13%', letterSpacing: '2px', verticalAlign: 'middle' }}
                      >
                        <div className="leading-tight">
                          <div>日 期</div>
                          <div className="border-t border-black my-0.5" />
                          <div>項 目</div>
                        </div>
                      </th>

                      {blockDays.map((d) => {
                        const isOverMonth = d > daysInMonth;
                        const isFuture = isFutureDate(year, month, d);

                        return (
                          <th
                            key={d}
                            colSpan={2}
                            className={`border border-black p-0 font-bold text-center ${
                              isOverMonth
                                ? 'bg-gray-100 text-gray-400'
                                : isFuture
                                ? 'bg-amber-50/50 text-gray-700'
                                : 'bg-white text-black'
                            }`}
                            style={{ height: '15px' }}
                            title={isFuture ? '未來日期（不可預先填寫）' : undefined}
                          >
                            {d}
                          </th>
                        );
                      })}

                      {/* 右側查核欄對齊（無獨立消毒欄位） */}
                      <th
                        rowSpan={2}
                        className="border border-black bg-white p-0 font-bold text-center"
                        style={{ width: '7%', verticalAlign: 'middle' }}
                      />
                    </tr>

                    {/* 表頭第 2 列：日 / 夜 班別 */}
                    <tr style={{ height: '15px' }}>
                      {blockDays.map((d) => {
                        const isOverMonth = d > daysInMonth;
                        const isFuture = isFutureDate(year, month, d);

                        return (
                          <Fragment key={`sub-${d}`}>
                            <th
                              className={`border border-black p-0 font-medium text-[9px] text-center ${
                                isOverMonth
                                  ? 'bg-gray-100 text-gray-400'
                                  : isFuture
                                  ? 'bg-amber-50/40 text-gray-600'
                                  : 'bg-white text-black'
                              }`}
                            >
                              日
                            </th>
                            <th
                              className={`border border-black p-0 font-medium text-[9px] text-center ${
                                isOverMonth
                                  ? 'bg-gray-100 text-gray-400'
                                  : isFuture
                                  ? 'bg-amber-50/40 text-gray-600'
                                  : 'bg-white text-black'
                              }`}
                            >
                              夜
                            </th>
                          </Fragment>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {/* 8 項清潔項目列：高度加高至 23px 讓滿版飽滿舒適 */}
                    {SANITATION_ITEMS.map((item, itemIdx) => (
                      <tr key={item.id} style={{ height: '23px' }}>
                        {/* 項目名稱 */}
                        <td
                          className="border border-black p-0 text-center font-bold text-[10.5px] tracking-wider"
                          style={{ verticalAlign: 'middle' }}
                        >
                          {item.label}
                        </td>

                        {/* 各日各班別單元格 */}
                        {blockDays.map((d) => {
                          const isOverMonth = d > daysInMonth;
                          const isFuture = isFutureDate(year, month, d);

                          return ['日', '夜'].map((shift) => {
                            const key = `${d}_${shift}_${item.id}`;
                            const isChecked = Boolean(checks[key]) && !isOverMonth && !isFuture;

                            // 【核心亮點】隨機種子加入 year 和 month，保證每個月同一天的勾都長得完全不同！
                            const seed = getHandwrittenSeed(year, month, d, itemIdx, shift);

                            return (
                              <td
                                key={`${d}_${shift}`}
                                onClick={() => !isOverMonth && handleCellClick(key, d)}
                                className={`border border-black p-0 text-center select-none ${
                                  isOverMonth
                                    ? 'bg-gray-100'
                                    : isFuture
                                    ? 'bg-gray-50/70 cursor-not-allowed'
                                    : 'cursor-pointer hover:bg-blue-50/50'
                                }`}
                                style={{ verticalAlign: 'middle' }}
                                data-testid={`cell-${d}-${shift}-${item.id}`}
                                title={isFuture ? '未來時間不可預先填寫' : undefined}
                              >
                                {isChecked && <HandwrittenCheck seed={seed} />}
                              </td>
                            );
                          });
                        })}

                        {/* 右側對齊空格 */}
                        <td className="border border-black p-0 text-center" />
                      </tr>
                    ))}

                    {/* 日班簽名列：高度加高至 25px，日夜合併大格 */}
                    <tr style={{ height: '25px' }}>
                      <td className="border border-black p-0 text-center font-bold text-[10px]">
                        日班簽名
                      </td>
                      {blockDays.map((d) => {
                        const isOverMonth = d > daysInMonth;
                        const isFuture = isFutureDate(year, month, d);

                        return (
                          <td
                            key={`sign-day-${d}`}
                            colSpan={2}
                            className={`border border-black p-0 text-center ${
                              isOverMonth ? 'bg-gray-100' : isFuture ? 'bg-gray-50/70' : 'cursor-text'
                            }`}
                            data-testid={`sign-day-cell-${d}`}
                            contentEditable={!isOverMonth && !isFuture}
                            suppressContentEditableWarning
                            title={isFuture ? '未來日期不可簽名' : '日班簽名大格（空白親簽）'}
                          />
                        );
                      })}
                      <td
                        className="border border-black p-0 text-center font-bold text-[10px]"
                        style={{ verticalAlign: 'middle', letterSpacing: '1px' }}
                      >
                        查核
                      </td>
                    </tr>

                    {/* 夜班簽名列：高度加高至 25px，日夜合併大格 */}
                    <tr style={{ height: '25px' }}>
                      <td className="border border-black p-0 text-center font-bold text-[10px]">
                        夜班簽名
                      </td>
                      {blockDays.map((d) => {
                        const isOverMonth = d > daysInMonth;
                        const isFuture = isFutureDate(year, month, d);

                        return (
                          <td
                            key={`sign-night-${d}`}
                            colSpan={2}
                            className={`border border-black p-0 text-center ${
                              isOverMonth ? 'bg-gray-100' : isFuture ? 'bg-gray-50/70' : 'cursor-text'
                            }`}
                            data-testid={`sign-night-cell-${d}`}
                            contentEditable={!isOverMonth && !isFuture}
                            suppressContentEditableWarning
                            title={isFuture ? '未來日期不可簽名' : '夜班簽名大格（空白親簽）'}
                          />
                        );
                      })}
                      <td
                        className="border border-black p-0 text-center cursor-text"
                        data-testid={`auditor-sign-cell-${blockIdx}`}
                        contentEditable="true"
                        suppressContentEditableWarning
                        title="查核主管簽核處"
                      />
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* 頁尾最新規定註記（居底貼合） */}
        <div
          className="text-center text-[10.5px] sm:text-xs font-bold text-gray-800 z-10 relative tracking-wide pb-1"
          data-testid="report-footer-disinfection-note"
        >
          **日班、夜班每日以1000ppm 漂白水消毒清潔各一次；嘔吐、排泄物5000ppm 漂白水消毒清潔。
        </div>
      </div>
    </div>
  );
}

export const SanitationReportPage = SanitationReportPrintView;
