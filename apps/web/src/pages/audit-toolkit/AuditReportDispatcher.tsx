import { useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { reportRegistry } from './reportRegistry';
import { RepairReportPrintView } from './RepairReportPrintView';
import { SanitationReportPrintView } from './SanitationReportPrintView';
import { AuditReportShell } from './AuditReportShell';
import { ArrowLeftIcon } from './icons';
import type { AuditReportConfig } from './auditToolkitTypes';

/**
 * 評鑑報表動態路由器 (AuditReportDispatcher)
 *
 * 根據 URL 參數 :reportId 動態分發：
 * - 若為 'repairs'，渲染機構修繕記錄專用模組（含模擬新增與資料池）
 * - 若為 'sanitation'，渲染環境清潔消毒記錄表專用模組（含月份動態推導、2x2 打勾與紅色印章）
 * - 若為其他已註冊之有效報表，使用通用 AuditReportShell 渲染
 * - 若為即將推出 (coming-soon) 模組，顯示籌備中預告與返回按鈕
 * - 若查無此報表，顯示友善 404 狀態與返回按鈕
 */
export function AuditReportDispatcher() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  // 若為修繕報表，使用專用 PrintView
  if (reportId === 'repairs') {
    return <RepairReportPrintView />;
  }

  // 若為環境清潔消毒記錄表，使用專用 PrintView
  if (reportId === 'sanitation') {
    return <SanitationReportPrintView />;
  }

  const config: AuditReportConfig | undefined = reportId ? reportRegistry.get(reportId) : undefined;

  // 404 找不到報表
  if (!config) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center" data-testid="report-not-found">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">找不到指定的評鑑報表</h2>
        <p className="text-sm text-gray-600 mb-6">
          系統中未找到代號為「<code className="text-danger-600 font-mono">{reportId}</code>」的報表設定。請檢查網址或點擊下方按鈕返回工具箱總覽。
        </p>
        <Link
          to="/audit-toolkit"
          className="btn btn-primary inline-flex items-center gap-2 text-sm"
          data-testid="btn-back-from-404"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>返回工具箱總覽</span>
        </Link>
      </div>
    );
  }

  // 籌備中報表 (Coming Soon)
  if (config.status === 'coming-soon') {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4" data-testid="report-coming-soon">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold mb-4 border border-amber-200">
            <span>模組籌備中</span>
            <span>・</span>
            <span>{config.orientation === 'landscape' ? '橫向 A4' : '直向 A4'}</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">{config.title}</h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-6 text-sm leading-relaxed">
            {config.description}
          </p>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 max-w-lg mx-auto mb-8 text-left">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">預計支援欄位規格：</h4>
            <div className="flex flex-wrap gap-1.5">
              {config.columns.map((col) => (
                <span
                  key={col.key}
                  className="px-2.5 py-1 rounded bg-white text-gray-700 text-xs border border-gray-200"
                >
                  {col.label} {col.required && <span className="text-danger-500">*</span>}
                </span>
              ))}
            </div>
          </div>

          <Link
            to="/audit-toolkit"
            className="btn btn-primary inline-flex items-center gap-2 text-sm"
            data-testid="btn-back-from-coming-soon"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>返回工具箱總覽</span>
          </Link>
        </div>
      </div>
    );
  }

  // 通用動態報表外殼渲染
  return <GenericAuditReportView config={config} onBack={() => navigate('/audit-toolkit')} />;
}

/** 通用已註冊報表渲染外殼 */
function GenericAuditReportView({
  config,
  onBack,
}: {
  config: AuditReportConfig;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<Record<string, string>[]>(config.sampleData);

  const handleImport = useCallback((newRows: Record<string, string>[]) => {
    setRows(newRows);
  }, []);

  return (
    <div className="generic-audit-report-view" data-testid={`generic-report-${config.id}`}>
      <AuditReportShell
        config={config}
        rows={rows}
        onImport={handleImport}
        onBack={onBack}
      />
    </div>
  );
}
