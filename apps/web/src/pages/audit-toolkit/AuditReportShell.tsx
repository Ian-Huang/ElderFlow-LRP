import { useRef, useState, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { CsvParserEngine } from '@/utils/csvParserEngine';
import '@/styles/print.css';
import type { AuditReportConfig } from './auditToolkitTypes';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AuditReportShellProps {
  /** 報表設定（決定方向、欄位、標題） */
  config: AuditReportConfig;
  /** 目前顯示的資料列（由父元件管理） */
  rows: Record<string, string>[];
  /** CSV 解析完成後的 callback（帶解析後的資料列） */
  onImport: (rows: Record<string, string>[]) => void;
  /** 額外工具列操作元件（例如：模擬新增一筆資料按鈕） */
  extraActions?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * AuditReportShell
 *
 * 通用 A4 評鑑報表外殼元件，提供：
 * - 擬真 A4 紙張預覽（portrait / landscape 動態切換）
 * - 頂部工具列：支援額外操作、下載 CSV 範本、匯入 CSV、立即列印
 * - contenteditable 機構名稱與報表標題點擊直接編輯
 * - 檔案選取器整合 CsvParserEngine
 * - 動態資料筆數顯示
 * - 評鑑專用粗黑實線表格與居中排版
 *
 * 列印時 @page 由此元件透過行內 <style> 注入，以支援直向/橫向並存。
 */
export function AuditReportShell({ config, rows, onImport, extraActions }: AuditReportShellProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  // Local title and orgName state: prevents React re-render from overwriting user's contenteditable edits
  const [title, setTitle] = useState(config.title);
  const [orgName, setOrgName] = useState(config.orgName ?? '');

  // -------------------------------------------------------------------------
  // A4 page style injected per instance (so portrait/landscape can coexist)
  // -------------------------------------------------------------------------
  const pageStyle =
    config.orientation === 'landscape'
      ? `@page { size: A4 landscape; margin: 10mm 14mm 10mm 14mm; }`
      : `@page { size: A4 portrait; margin: 14mm 10mm 14mm 10mm; }`;

  const sheetClass = [
    'a4-sheet',
    config.orientation === 'landscape' ? 'a4-landscape' : 'a4-portrait',
  ].join(' ');

  // -------------------------------------------------------------------------
  // Template download
  // -------------------------------------------------------------------------
  const handleDownloadTemplate = useCallback(() => {
    const csv = CsvParserEngine.generateTemplate(config);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.id}-範本.csv`;
    a.click();
    // Defer revocation so async download has time to start
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, [config]);

  // -------------------------------------------------------------------------
  // CSV import
  // -------------------------------------------------------------------------
  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setParseError(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text !== 'string') return;

        const result = CsvParserEngine.parse(text, config);
        if (result.ok) {
          onImport(result.value);
        } else {
          setParseError(
            `匯入失敗：CSV 缺少必填欄位「${result.error.missingColumns.join('、')}」，請檢查範本格式後重試。`,
          );
        }
      };
      reader.readAsText(file, 'utf-8');

      // Reset input so same file can be re-selected
      e.target.value = '';
    },
    [config, onImport],
  );

  // -------------------------------------------------------------------------
  // Print
  // -------------------------------------------------------------------------
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="audit-report-shell">
      {/* Per-instance @page rule for correct orientation */}
      <style>{pageStyle}</style>

      {/* Toolbar — hidden on print */}
      <div
        className="no-print flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10"
        data-testid="audit-toolbar"
      >
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium text-gray-700">
            共 <span className="font-bold text-primary-600" data-testid="row-count">{rows.length}</span> 筆
          </span>
          {parseError && (
            <span className="text-xs text-danger-600 bg-danger-50 px-2 py-1 rounded" role="alert">
              {parseError}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Extra custom actions (e.g. mock add row) */}
          {extraActions}

          {/* Download template */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="btn btn-secondary text-xs"
            aria-label="下載 CSV 範本"
          >
            <DownloadIcon className="w-4 h-4" />
            下載 CSV 範本
          </button>

          {/* Import CSV — file input paired with visible label via aria-labelledby */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary text-xs"
            aria-label="匯入 CSV"
          >
            <UploadIcon className="w-4 h-4" />
            匯入 CSV
          </button>
          {/* tabIndex={-1}: programmatically activated only, so aria-hidden is safe */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="sr-only"
            tabIndex={-1}
            aria-label="選取 CSV 檔案"
          />

          {/* Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary text-xs"
            aria-label="立即列印 / PDF"
          >
            <PrintIcon className="w-4 h-4" />
            立即列印 / PDF
          </button>
        </div>
      </div>

      {/* A4 Sheet Preview */}
      <div className={sheetClass} data-testid="a4-sheet">
        {/* Report header — contenteditable title and orgName */}
        <div className="report-header text-center mb-4">
          {config.orgName && (
            <div
              data-testid="report-org-name"
              contentEditable="true"
              suppressContentEditableWarning
              onBlur={(e) => setOrgName(e.currentTarget.textContent ?? config.orgName ?? '')}
              className="text-2xl font-bold text-gray-900 tracking-wider mb-1 cursor-text"
              title="點擊可直接修改機構名稱"
            >
              {orgName}
            </div>
          )}
          <h1
            data-testid="report-title"
            contentEditable="true"
            suppressContentEditableWarning
            onBlur={(e) => setTitle(e.currentTarget.textContent ?? config.title)}
            className="text-xl font-bold text-gray-900 border-b-2 border-transparent hover:border-gray-300 focus:border-primary-400 focus:outline-none px-1 py-0.5 rounded transition-colors cursor-text inline-block"
            title="點擊可直接修改報表標題"
          >
            {title}
          </h1>
        </div>

        {/* Table */}
        <table className="audit-report-table w-full border-collapse text-sm" style={{ borderColor: '#000' }}>
          <thead>
            <tr>
              {config.columns.map((col) => (
                <th
                  key={col.key}
                  className="border border-black bg-white px-2 py-1.5 font-bold text-center text-xs"
                  style={{
                    width: col.widthPercent ? `${col.widthPercent}%` : undefined,
                    textAlign: col.align ?? 'center',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={config.columns.length}
                  className="border border-black px-2 py-4 text-center text-gray-400 text-xs"
                >
                  尚無資料 — 請使用上方工具列匯入 CSV 檔案
                </td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => (
                // rowIdx is acceptable here: rows are append-only in this component
                // and have no stable domain ID at the shell level
                <tr key={rowIdx}>
                  {config.columns.map((col) => (
                    <td
                      key={col.key}
                      className="border border-black px-2 py-1 text-xs"
                      style={{
                        textAlign: col.align ?? 'left',
                        paddingLeft: col.align === 'left' ? '6px' : undefined,
                        verticalAlign: 'middle',
                      }}
                    >
                      {row[col.key] ?? ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons (no extra deps, tree-shakable)
// ---------------------------------------------------------------------------

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function PrintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  );
}
