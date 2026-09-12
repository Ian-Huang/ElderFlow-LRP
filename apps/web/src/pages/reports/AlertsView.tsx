import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { AlertReportItem } from '@lrp/shared';
import { useAlerts, useUpdateAlertStatus } from './useReports';

export interface AlertsViewProps {
  initialSeverity?: 'red' | 'yellow' | 'all';
}

const TYPE_CONFIG: Record<
  AlertReportItem['type'],
  { label: string; icon: string; linkPrefix: string }
> = {
  vital_abnormal: {
    label: '生命徵象異常',
    icon: '💓',
    linkPrefix: '/care-records',
  },
  medication_error: {
    label: '給藥異常逾時',
    icon: '💊',
    linkPrefix: '/medications',
  },
  fall: {
    label: '跌倒事件',
    icon: '⚠️',
    linkPrefix: '/residents',
  },
  missed_care: {
    label: '照護排程缺漏',
    icon: '📋',
    linkPrefix: '/care-records',
  },
};

export function AlertsView({ initialSeverity = 'all' }: AlertsViewProps) {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'red' | 'yellow'>(initialSeverity);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'acknowledged' | 'resolved'>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const queryParams = useMemo(() => {
    const params: { severity?: string; status?: string } = {};
    if (severityFilter !== 'all') params.severity = severityFilter;
    if (statusFilter !== 'all') params.status = statusFilter;
    return params;
  }, [severityFilter, statusFilter]);

  const { data: alerts = [], isLoading, isError, error, refetch } = useAlerts(queryParams);
  const updateStatusMutation = useUpdateAlertStatus();

  // Filter with search keyword locally
  const filteredAlerts = useMemo(() => {
    if (!searchKeyword.trim()) return alerts;
    const kw = searchKeyword.toLowerCase().trim();
    return alerts.filter(
      (a) =>
        a.title.toLowerCase().includes(kw) ||
        a.description.toLowerCase().includes(kw) ||
        a.residentName.toLowerCase().includes(kw) ||
        a.bedNumber.toLowerCase().includes(kw) ||
        a.residentId.toLowerCase().includes(kw)
    );
  }, [alerts, searchKeyword]);

  // Alert counters
  const counters = useMemo(() => {
    const openCount = alerts.filter((a) => a.status === 'open').length;
    const ackCount = alerts.filter((a) => a.status === 'acknowledged').length;
    const resCount = alerts.filter((a) => a.status === 'resolved').length;
    const redCount = alerts.filter((a) => a.severity === 'red').length;
    const yellowCount = alerts.filter((a) => a.severity === 'yellow').length;
    return { openCount, ackCount, resCount, redCount, yellowCount, total: alerts.length };
  }, [alerts]);

  const handleUpdateStatus = (id: string, newStatus: 'open' | 'acknowledged' | 'resolved') => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const formatOccurredTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 bg-red-50 border-red-200">
          <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            紅標重大警示
          </p>
          <p className="text-2xl font-bold text-red-900 mt-1">{counters.redCount}</p>
        </div>

        <div className="card p-3 bg-amber-50 border-amber-200">
          <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            黃標注意事件
          </p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{counters.yellowCount}</p>
        </div>

        <div className="card p-3 bg-rose-50 border-rose-200">
          <p className="text-xs font-semibold text-rose-700">未處理項目 (Open)</p>
          <p className="text-2xl font-bold text-rose-900 mt-1">{counters.openCount}</p>
        </div>

        <div className="card p-3 bg-emerald-50 border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700">已解除項目 (Resolved)</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{counters.resCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Severity selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="severity-filter-select" className="text-xs font-medium text-gray-500 whitespace-nowrap">
              危害層級：
            </label>
            <select
              id="severity-filter-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as 'all' | 'red' | 'yellow')}
              className="input py-1 px-2.5 text-xs w-28"
            >
              <option value="all">全部層級</option>
              <option value="red">紅標重大</option>
              <option value="yellow">黃標注意</option>
            </select>
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="status-filter-select" className="text-xs font-medium text-gray-500 whitespace-nowrap">
              處理狀態：
            </label>
            <select
              id="status-filter-select"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'open' | 'acknowledged' | 'resolved')
              }
              className="input py-1 px-2.5 text-xs w-28"
            >
              <option value="all">全部狀態</option>
              <option value="open">未處理</option>
              <option value="acknowledged">已確認</option>
              <option value="resolved">已解除</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="搜尋住民姓名、床號或警示內容..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="input py-1.5 pl-8 pr-3 text-xs"
              aria-label="搜尋警示項目"
            />
            <svg
              className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchKeyword && (
            <button
              type="button"
              onClick={() => setSearchKeyword('')}
              className="btn btn-ghost py-1 px-2 text-xs"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200" data-testid="loading-indicator">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <p className="text-sm text-gray-500">正在檢查最新異常事件警示清單...</p>
          </div>
        </div>
      )}

      {isError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between">
          <p className="text-sm">{error instanceof Error ? error.message : '載入警示事件失敗'}</p>
          <button onClick={() => refetch()} className="btn btn-secondary text-xs">
            重新載入
          </button>
        </div>
      )}

      {/* Alerts list */}
      {!isLoading && !isError && (
        <div className="space-y-3" data-testid="alerts-list">
          {filteredAlerts.length === 0 ? (
            <div className="card p-12 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-base font-semibold text-gray-800">目前無符合條件之警示事件</p>
              <p className="text-xs text-gray-400 mt-1">全院各樓層住民生命徵象與照護活動運作正常</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const typeCfg = TYPE_CONFIG[alert.type] || {
                label: '其他警示',
                icon: '⚠️',
                linkPrefix: '/care-records',
              };
              const isRed = alert.severity === 'red';
              const isPending = updateStatusMutation.isPending;

              return (
                <div
                  key={alert.id}
                  className={`card border-l-4 transition-shadow hover:shadow-md ${
                    isRed ? 'border-l-red-500' : 'border-l-amber-500'
                  }`}
                  data-testid={`alert-item-${alert.id}`}
                >
                  <div className="card-body p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      {/* Left: Info */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Severity badge */}
                          <span
                            className={`badge font-bold px-2 py-0.5 text-xs ${
                              isRed
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isRed ? '🔴 紅標重大' : '🟡 黃標注意'}
                          </span>

                          {/* Type badge */}
                          <span className="badge badge-gray text-xs">
                            {typeCfg.icon} {typeCfg.label}
                          </span>

                          {/* Status badge */}
                          <span
                            className={`badge text-xs font-semibold ${
                              alert.status === 'open'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : alert.status === 'acknowledged'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {alert.status === 'open'
                              ? '未處理'
                              : alert.status === 'acknowledged'
                              ? '已確認處理中'
                              : '已解除'}
                          </span>

                          {/* Occurred timestamp */}
                          <span className="text-xs text-gray-400">
                            發生時間：{formatOccurredTime(alert.occurredAt)}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-base font-bold text-gray-900">
                          {alert.title}
                        </h4>

                        {/* Description */}
                        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          {alert.description}
                        </p>

                        {/* Resident Info & Action Link */}
                        <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap pt-1">
                          <span className="font-semibold text-gray-900">
                            👤 住民：{alert.residentName} ({alert.residentId})
                          </span>
                          <span className="bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-700">
                            🛏️ 床號：{alert.bedNumber}
                          </span>

                          <Link
                            to={`${typeCfg.linkPrefix}?residentId=${alert.residentId}`}
                            className="text-primary-600 hover:text-primary-800 font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            前往關聯紀錄
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        </div>
                      </div>

                      {/* Right: Status Toggle Actions */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 self-start pt-1">
                        {alert.status === 'open' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(alert.id, 'acknowledged')}
                              disabled={isPending}
                              className="btn btn-secondary py-1 px-3 text-xs w-full whitespace-nowrap"
                            >
                              確認警示
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                              disabled={isPending}
                              className="btn btn-primary py-1 px-3 text-xs w-full whitespace-nowrap"
                            >
                              解除警示
                            </button>
                          </>
                        )}

                        {alert.status === 'acknowledged' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                            disabled={isPending}
                            className="btn btn-primary py-1 px-3 text-xs w-full whitespace-nowrap"
                          >
                            解除警示
                          </button>
                        )}

                        {alert.status === 'resolved' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(alert.id, 'open')}
                            disabled={isPending}
                            className="btn btn-ghost text-xs py-1 px-3 w-full whitespace-nowrap border border-gray-300"
                          >
                            重啟警示
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
