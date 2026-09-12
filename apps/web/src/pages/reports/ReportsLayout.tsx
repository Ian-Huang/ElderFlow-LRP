import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DailyCompletionView } from './DailyCompletionView';
import { ResidentSummaryView } from './ResidentSummaryView';
import { AlertsView } from './AlertsView';
import { AuditTrailView } from './AuditTrailView';
import { PdfExportModal } from './PdfExportModal';
import { useAlerts } from './useReports';
import type { PdfExportRequest } from '@lrp/shared';

export type ReportTab = 'daily-completion' | 'resident-summary' | 'alerts' | 'audit-trail';

const TABS: { key: ReportTab; label: string; icon: string; description: string }[] = [
  {
    key: 'daily-completion',
    label: '每日照護完成度',
    icon: '📊',
    description: '照護活動達標率、異常分佈與低分追蹤',
  },
  {
    key: 'resident-summary',
    label: '住民狀態概覽',
    icon: '🏥',
    description: '三管管路統計、床位佔用與失能等級',
  },
  {
    key: 'alerts',
    label: '異常事件警示',
    icon: '🚨',
    description: '即時紅黃標異常通報與處理追蹤',
  },
  {
    key: 'audit-trail',
    label: '稽核軌跡查詢',
    icon: '🛡️',
    description: '不可竄改資料異動歷程與合規防護',
  },
];

export function ReportsLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as ReportTab;
  const currentTab: ReportTab = TABS.some((t) => t.key === rawTab) ? rawTab : 'daily-completion';

  // State for opening PDF export modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalConfig, setExportModalConfig] = useState<{
    reportType: PdfExportRequest['reportType'];
    parameters?: Record<string, unknown>;
  }>({
    reportType: 'completion-report',
  });

  // Query alerts to display badge in tab
  const { data: alerts = [] } = useAlerts();
  const activeAlertsCount = useMemo(
    () => alerts.filter((a) => a.status !== 'resolved').length,
    [alerts]
  );

  const handleTabChange = (tab: ReportTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  };

  const handleOpenExportModal = (config: {
    reportType: PdfExportRequest['reportType'];
    parameters?: Record<string, unknown>;
  }) => {
    setExportModalConfig(config);
    setIsExportModalOpen(true);
  };

  const handleNavigateToAlerts = (severity?: 'red' | 'yellow') => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'alerts');
    if (severity) {
      next.set('severity', severity);
    }
    setSearchParams(next);
  };

  // Formatted date string in ROC format
  const currentDateDisplay = useMemo(() => {
    const now = new Date();
    const rocYear = now.getFullYear() - 1911;
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[now.getDay()];
    return `民國 ${rocYear} 年 ${month} 月 ${date} 日 (星期${weekday})`;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-primary-50 text-primary-600 rounded-xl text-xl">
              📈
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">照護數據與報表中心</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                整合衛福部規範之每日照護、管路床位、即時異常事件與稽核軌跡
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Current Date Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{currentDateDisplay}</span>
          </div>

          {/* PDF Export trigger */}
          <button
            type="button"
            onClick={() =>
              handleOpenExportModal({
                reportType:
                  currentTab === 'daily-completion'
                    ? 'completion-report'
                    : currentTab === 'audit-trail'
                    ? 'audit-trail'
                    : currentTab === 'resident-summary'
                    ? 'tube-statistics'
                    : 'completion-report',
              })
            }
            className="btn btn-primary py-2 px-4 text-sm flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            產生 PDF 報表
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 bg-white px-3 rounded-xl shadow-sm">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2" role="tablist" aria-label="報表視圖分類">
          {TABS.map((tab) => {
            const isActive = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.key)}
                className={`py-2.5 px-3.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.key === 'alerts' && activeAlertsCount > 0 && (
                  <span
                    className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white text-primary-700' : 'bg-red-500 text-white animate-pulse'
                    }`}
                  >
                    {activeAlertsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active view content */}
      <div className="min-h-[450px]">
        {currentTab === 'daily-completion' && (
          <DailyCompletionView onOpenExportModal={handleOpenExportModal} />
        )}
        {currentTab === 'resident-summary' && (
          <ResidentSummaryView onNavigateToAlerts={handleNavigateToAlerts} />
        )}
        {currentTab === 'alerts' && (
          <AlertsView
            initialSeverity={
              (searchParams.get('severity') as 'red' | 'yellow' | 'all') || 'all'
            }
          />
        )}
        {currentTab === 'audit-trail' && (
          <AuditTrailView onOpenExportModal={handleOpenExportModal} />
        )}
      </div>

      {/* Unified PDF Export Modal */}
      <PdfExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        initialReportType={exportModalConfig.reportType}
        initialParameters={exportModalConfig.parameters}
      />
    </div>
  );
}
