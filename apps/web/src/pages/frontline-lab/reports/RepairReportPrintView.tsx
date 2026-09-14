import { useState, useCallback } from 'react';
import { useNavigate, useInRouterContext } from 'react-router-dom';
import { AuditReportShell } from './AuditReportShell';
import { reportRegistry } from './reportRegistry';
import { repairReportConfig, getNextMockRepair } from './repairReportConfig';
import { PlusIcon } from './icons';

function InnerRepairShell(props: {
  config: typeof repairReportConfig;
  rows: Record<string, string>[];
  onImport: (rows: Record<string, string>[]) => void;
  extraActions: React.ReactNode;
  onBack?: () => void;
}) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <InnerRepairShellWithRouter {...props} />;
  }
  return <AuditReportShell {...props} />;
}

function InnerRepairShellWithRouter(props: {
  config: typeof repairReportConfig;
  rows: Record<string, string>[];
  onImport: (rows: Record<string, string>[]) => void;
  extraActions: React.ReactNode;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  return <AuditReportShell {...props} onBack={props.onBack ?? (() => navigate('/frontline-lab'))} />;
}

/**
 * 機構修繕通報追蹤記錄 評鑑列印檢視模組 (RepairReportPrintView)
 * 對應 CONTEXT.md 評鑑報表工具箱之關鍵模組定義
 *
 * 遵循 8 欄黃金比例評鑑專用報表：
 * - 透過 reportRegistry 取得 'repairs' 宣告設定檔
 * - 內建 6 筆長照真實情境範例資料
 * - 支援「模擬新增一筆資料」動態資料池循環注入
 * - 支援 CSV 範本下載與即時匯入替換
 * - 支援機構全銜與報表標題直接編輯
 */
export function RepairReportPrintView({ onBack }: { onBack?: () => void } = {}) {
  const config = reportRegistry.get('repairs') ?? repairReportConfig;
  const [rows, setRows] = useState<Record<string, string>[]>(config.sampleData);
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
    <div className="repair-report-print-view" data-testid="repair-report-print-view">
      <InnerRepairShell
        config={config}
        rows={rows}
        onImport={handleImport}
        extraActions={extraActions}
        onBack={onBack}
      />
    </div>
  );
}

// 支援別名導出以確保向下相容
export const RepairReportPage = RepairReportPrintView;
