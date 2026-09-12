import { useState, useCallback } from 'react';
import { AuditReportShell } from './AuditReportShell';
import { repairReportConfig, getNextMockRepair } from './repairReportConfig';

export interface RepairReportPageProps {
  /** 初始資料（可選，預設使用 repairReportConfig.sampleData） */
  initialRows?: Record<string, string>[];
}

/**
 * 機構修繕通報追蹤記錄 模組頁面
 *
 * 遵循 8 欄黃金比例評鑑專用報表：
 * - 內建 6 筆長照真實情境範例資料
 * - 支援「模擬新增一筆資料」動態資料池循環注入
 * - 支援 CSV 範本下載與即時匯入替換
 * - 支援機構名稱與標題直接編輯
 */
export function RepairReportPage({ initialRows }: RepairReportPageProps) {
  const [rows, setRows] = useState<Record<string, string>[]>(
    initialRows ?? repairReportConfig.sampleData,
  );
  const [poolIndex, setPoolIndex] = useState(0);

  // 動態資料池循環注入一筆資料
  const handleAddMockRow = useCallback(() => {
    const { item, nextIndex } = getNextMockRepair(poolIndex);
    setRows((prev) => [...prev, item]);
    setPoolIndex(nextIndex);
  }, [poolIndex]);

  // CSV 匯入後替換當前資料
  const handleImport = useCallback((newRows: Record<string, string>[]) => {
    setRows(newRows);
  }, []);

  const extraActions = (
    <button
      type="button"
      onClick={handleAddMockRow}
      className="btn btn-secondary text-xs"
      data-testid="btn-mock-add"
      aria-label="模擬新增一筆資料"
    >
      <PlusIcon className="w-4 h-4" />
      模擬新增一筆資料
    </button>
  );

  return (
    <div className="repair-report-page">
      <AuditReportShell
        config={repairReportConfig}
        rows={rows}
        onImport={handleImport}
        extraActions={extraActions}
      />
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
