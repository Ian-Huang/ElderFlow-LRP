import { useState, useMemo } from 'react';
import type { AuditEntry } from '@lrp/shared';
import { useAuditTrail } from './useReports';

export interface AuditTrailViewProps {
  onOpenExportModal?: (params: {
    reportType: 'audit-trail';
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => void;
}

const ACTION_BADGES: Record<string, { label: string; className: string }> = {
  Create: { label: '新增', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Update: { label: '變更', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  Delete: { label: '刪除', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  Supplement: { label: '補登', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  Lock: { label: '自動鎖定', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Unlock: { label: '主管解鎖', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  Sign: { label: '數位簽核', className: 'bg-teal-50 text-teal-700 border-teal-200' },
};

const ENTITY_LABELS: Record<string, string> = {
  Resident: '住民資料',
  CareRecord: '照護紀錄',
  Medication: '用藥處方',
  CarePlan: '個別化照護計畫',
  Contract: '長照機構合約',
};

export function AuditTrailView({ onOpenExportModal }: AuditTrailViewProps) {
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;
  const [entityType, setEntityType] = useState<string>('');
  const [actionType, setActionType] = useState<string>('');
  const [changedBy, setChangedBy] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [jumpPageInput, setJumpPageInput] = useState<string>('');

  const queryParams = useMemo(() => {
    const params: {
      page: number;
      pageSize: number;
      entityType?: string;
      actionType?: string;
      changedBy?: string;
      dateFrom?: string;
      dateTo?: string;
    } = { page, pageSize };
    if (entityType) params.entityType = entityType;
    if (actionType) params.actionType = actionType;
    if (changedBy.trim()) params.changedBy = changedBy.trim();
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return params;
  }, [page, pageSize, entityType, actionType, changedBy, dateFrom, dateTo]);

  const { data, isLoading, isError, error, refetch } = useAuditTrail(queryParams);

  const items: AuditEntry[] = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handleResetFilters = () => {
    setEntityType('');
    setActionType('');
    setChangedBy('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setPage(p);
      setJumpPageInput('');
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info & Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            不可竄改資料稽核軌跡 (Audit Trail)
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            符合衛生福利部規範與個人資料保護法，完整記錄 5 年資料異動履歷與操作人稽核戳記
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onOpenExportModal?.({
                reportType: 'audit-trail',
                entityType: entityType || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
              })
            }
            className="btn btn-primary py-2 px-4 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            匯出稽核報表
          </button>
        </div>
      </div>

      {/* Multi-field Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Entity Type Filter */}
          <div>
            <label htmlFor="audit-entity-type" className="label text-xs">
              實體類型
            </label>
            <select
              id="audit-entity-type"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="input py-1.5 px-3 text-xs"
            >
              <option value="">全部實體 (All)</option>
              <option value="Resident">住民資料 (Resident)</option>
              <option value="CareRecord">照護紀錄 (CareRecord)</option>
              <option value="Medication">用藥處方 (Medication)</option>
              <option value="CarePlan">照護計畫 (CarePlan)</option>
              <option value="Contract">合約記錄 (Contract)</option>
            </select>
          </div>

          {/* Action Type Filter */}
          <div>
            <label htmlFor="audit-action-type" className="label text-xs">
              操作類型
            </label>
            <select
              id="audit-action-type"
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value);
                setPage(1);
              }}
              className="input py-1.5 px-3 text-xs"
            >
              <option value="">全部操作 (All)</option>
              <option value="Create">新增 (Create)</option>
              <option value="Update">變更 (Update)</option>
              <option value="Delete">刪除 (Delete)</option>
              <option value="Supplement">補充紀錄 (Supplement)</option>
              <option value="Lock">鎖定 (Lock)</option>
              <option value="Unlock">解鎖 (Unlock)</option>
              <option value="Sign">簽章 (Sign)</option>
            </select>
          </div>

          {/* Changed By Filter */}
          <div>
            <label htmlFor="audit-changed-by" className="label text-xs">
              操作人員
            </label>
            <input
              id="audit-changed-by"
              type="text"
              placeholder="人員帳號或姓名"
              value={changedBy}
              onChange={(e) => {
                setChangedBy(e.target.value);
                setPage(1);
              }}
              className="input py-1.5 px-3 text-xs"
            >
            </input>
          </div>

          {/* Date From */}
          <div>
            <label htmlFor="audit-date-from" className="label text-xs">
              起始日期
            </label>
            <input
              id="audit-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="input py-1.5 px-3 text-xs"
            />
          </div>

          {/* Date To */}
          <div>
            <label htmlFor="audit-date-to" className="label text-xs">
              結束日期
            </label>
            <input
              id="audit-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="input py-1.5 px-3 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
          <span className="text-gray-500">
            已套用篩選條件：共搜尋出 <strong className="text-gray-900 font-semibold">{total}</strong> 筆稽核記錄
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn btn-ghost py-1 px-2.5 text-xs text-gray-500 hover:text-gray-700"
          >
            重設篩選條件
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200" data-testid="loading-indicator">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <p className="text-sm text-gray-500">正在安全查詢不可竄改稽核軌跡...</p>
          </div>
        </div>
      )}

      {isError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between">
          <p className="text-sm">{error instanceof Error ? error.message : '載入稽核紀錄失敗'}</p>
          <button onClick={() => refetch()} className="btn btn-secondary text-xs">
            重新查詢
          </button>
        </div>
      )}

      {/* Audit Trail Table */}
      {!isLoading && !isError && (
        <div className="card">
          <div className="card-body p-0">
            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="font-medium text-gray-700">查無符合條件的稽核紀錄</p>
                <p className="text-xs text-gray-400 mt-1">請嘗試調整實體類型、操作類型或日期範圍</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" data-testid="audit-trail-table">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">異動時間戳記</th>
                      <th className="py-3 px-3">操作人員 / IP</th>
                      <th className="py-3 px-3">操作類型</th>
                      <th className="py-3 px-3">實體 / 記錄編號</th>
                      <th className="py-3 px-3">異動欄位</th>
                      <th className="py-3 px-3">變更前舊值</th>
                      <th className="py-3 px-3">變更後新值</th>
                      <th className="py-3 px-4">異動理由 / 備註</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((entry) => {
                      const badge = ACTION_BADGES[entry.actionType] || {
                        label: entry.actionType,
                        className: 'bg-gray-50 text-gray-700 border-gray-200',
                      };
                      const entityName = ENTITY_LABELS[entry.recordType] || entry.recordType;

                      return (
                        <tr key={entry.auditId} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3 font-mono text-gray-600 whitespace-nowrap">
                            {formatTimestamp(entry.changedAt)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-semibold text-gray-900">{entry.changedBy}</div>
                            {entry.ipAddress && (
                              <div className="text-[10px] text-gray-400 font-mono">
                                IP: {entry.ipAddress}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-medium text-gray-900">{entityName}</span>
                            <div className="text-[11px] text-gray-500 font-mono">{entry.recordId}</div>
                          </td>
                          <td className="py-3 px-3 font-mono text-gray-800 font-medium whitespace-nowrap">
                            {entry.fieldName}
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate text-gray-500">
                            {entry.oldValue ? (
                              <span className="line-through bg-gray-100 px-1 py-0.5 rounded text-gray-600">
                                {entry.oldValue}
                              </span>
                            ) : (
                              <span className="text-gray-300 italic">(空白)</span>
                            )}
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate font-medium text-emerald-700">
                            <span className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                              {entry.newValue || '(空白)'}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-sm text-gray-700 text-xs">
                            {entry.reason || <span className="text-gray-400 italic">無填寫</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Bar (AC5 Requirement) */}
          <div className="card-footer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
            <div>
              顯示第 <span className="font-semibold text-gray-900">{items.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> 至{' '}
              <span className="font-semibold text-gray-900">{Math.min(page * pageSize, total)}</span> 筆，共{' '}
              <span className="font-semibold text-gray-900">{total}</span> 筆記錄 (每頁 20 筆)
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Previous & Next */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn btn-secondary py-1 px-2.5 text-xs disabled:opacity-40"
                  aria-label="上一頁"
                >
                  上一頁
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`py-1 px-2.5 rounded font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                      aria-current={page === pageNum ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn btn-secondary py-1 px-2.5 text-xs disabled:opacity-40"
                  aria-label="下一頁"
                >
                  下一頁
                </button>
              </div>

              {/* Jump to page */}
              <form onSubmit={handleJumpPage} className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                <label htmlFor="jump-page-input" className="text-gray-500 whitespace-nowrap">
                  跳至
                </label>
                <input
                  id="jump-page-input"
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  placeholder={String(page)}
                  className="input py-1 px-1.5 w-14 text-center text-xs"
                />
                <span className="text-gray-500">頁</span>
                <button type="submit" className="btn btn-secondary py-1 px-2 text-xs">
                  前往
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
