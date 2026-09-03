import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useMedications, useMedicationAlertSummary } from '@/hooks/useMedications';
import { useResidents } from '@/hooks/useResidents';
import { formatDateTime } from '@/utils/rocDate';
import { FREQUENCY_LABELS } from '@/utils/medicationScheduler';
import { MedicationAdministerModal } from '@/components/MedicationAdministerModal';
import type { Medication } from '@lrp/shared';

export function MedicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole } = useAuthStore();
  const canManage = hasRole(['caregiver', 'supervisor', 'admin', 'sysadmin']);

  const searchQuery = searchParams.get('q') || '';
  const selectedResidentId = searchParams.get('residentId') || '';
  const selectedStatus = searchParams.get('status') || '';
  const lowStockOnly = searchParams.get('lowStock') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [administerTargetMed, setAdministerTargetMed] = useState<Medication | null>(null);

  // Fetch low stock summary for top banner via repository hook (works online and offline)
  const { data: alertSummary } = useMedicationAlertSummary();

  // Fetch residents for dropdown via deep resident repository hook (works offline too)
  const { data: residentsData } = useResidents({
    pageSize: 100,
    status: 'Active',
  });
  const residentsList = residentsData?.items || [];

  // Fetch medications list via deep medication repository hook
  const { data: medicationsData, isLoading } = useMedications({
    search: searchQuery,
    residentId: selectedResidentId || undefined,
    status: (selectedStatus as 'Active' | 'Discontinued' | 'OnHold') || undefined,
    lowStockOnly,
    page,
    pageSize: 12,
    sortField: sortBy,
    sortOrder,
  });

  const updateFilters = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });
    if ('q' in updates || 'residentId' in updates || 'status' in updates || 'lowStock' in updates) {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  const medications = medicationsData?.items || [];
  const totalPages = medicationsData?.totalPages || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">藥物管理</h1>
          <p className="text-gray-500 mt-1 text-sm">
            掌握全院住民用藥主檔、給藥時間排程、即時庫存監控與一鍵給藥記錄
          </p>
        </div>
        {canManage && (
          <Link to="/medications/new" className="btn-primary">
            <PlusIcon className="w-5 h-5 mr-1" aria-hidden="true" />
            新增藥物主檔
          </Link>
        )}
      </div>

      {/* Low Stock Alert Bar */}
      {alertSummary && (alertSummary.runningLowCount > 0 || alertSummary.outOfStockCount > 0) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold flex-shrink-0">
              <AlertTriangleIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                藥品庫存預警通知：
                {alertSummary.outOfStockCount > 0 && (
                  <span className="text-danger-600 font-extrabold ml-1">
                    {alertSummary.outOfStockCount} 項缺藥 (0 庫存)
                  </span>
                )}
                {alertSummary.runningLowCount > 0 && (
                  <span className="text-amber-800 font-bold ml-2">
                    {alertSummary.runningLowCount} 項庫存偏低 (≤ 15 顆)
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                請護理人員或家屬儘速安排備藥或領藥，以確保住民持續用藥不中斷。
              </p>
            </div>
          </div>
          <button
            onClick={() => updateFilters({ lowStock: lowStockOnly ? null : 'true' })}
            className={`btn-secondary text-xs py-1.5 px-3 whitespace-nowrap font-bold ${
              lowStockOnly ? 'bg-amber-200 border-amber-300' : ''
            }`}
          >
            {lowStockOnly ? '顯示全部藥物' : '僅列出需補藥物'}
          </button>
        </div>
      )}

      {/* Search & Filters Card */}
      <div className="card">
        <div className="card-body p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search */}
            <div>
              <label htmlFor="medSearch" className="block text-xs font-semibold text-gray-700 mb-1">
                關鍵字搜尋
              </label>
              <div className="relative">
                <input
                  id="medSearch"
                  type="text"
                  placeholder="搜尋藥名、劑量、住民..."
                  value={searchQuery}
                  onChange={(e) => updateFilters({ q: e.target.value })}
                  className="input w-full text-xs pl-8"
                />
                <SearchIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Resident Filter */}
            <div>
              <label htmlFor="residentFilter" className="block text-xs font-semibold text-gray-700 mb-1">
                住民篩選
              </label>
              <select
                id="residentFilter"
                value={selectedResidentId}
                onChange={(e) => updateFilters({ residentId: e.target.value })}
                className="input w-full text-xs"
              >
                <option value="">全部住民</option>
                {(residentsList || []).map((r) => (
                  <option key={r.residentId} value={r.residentId}>
                    {r.bedNumber ? `[${r.bedNumber}] ` : ''}
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="statusFilter" className="block text-xs font-semibold text-gray-700 mb-1">
                使用狀態
              </label>
              <select
                id="statusFilter"
                value={selectedStatus}
                onChange={(e) => updateFilters({ status: e.target.value })}
                className="input w-full text-xs"
              >
                <option value="">全部狀態</option>
                <option value="Active">使用中 (Active)</option>
                <option value="OnHold">暫停中 (OnHold)</option>
                <option value="Discontinued">已停用 (Discontinued)</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div>
              <label htmlFor="sortFilter" className="block text-xs font-semibold text-gray-700 mb-1">
                排序方式
              </label>
              <select
                id="sortFilter"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [sb, so] = e.target.value.split('-');
                  updateFilters({ sortBy: sb || 'createdAt', sortOrder: so || 'desc' });
                }}
                className="input w-full text-xs"
              >
                <option value="createdAt-desc">最新建檔優先</option>
                <option value="stockLevel-asc">庫存最低優先</option>
                <option value="nextScheduled-asc">下一劑給藥時間即將到達</option>
                <option value="name-asc">藥品名稱 (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Secondary filter switches & view toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => updateFilters({ lowStock: e.target.checked ? 'true' : null })}
                  className="rounded text-primary-600"
                />
                <span className="font-semibold text-gray-700">僅顯示庫存不足 / 需補藥</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400">共 {medicationsData?.total || 0} 筆藥物</span>
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1 rounded-md text-xs font-medium ${
                    viewMode === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
                  }`}
                  aria-label="切換表格檢視"
                >
                  表格
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded-md text-xs font-medium ${
                    viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
                  }`}
                  aria-label="切換卡片檢視"
                >
                  卡片
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="card p-12 text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" aria-label="載入中" />
          <p>載入藥物清單中...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && medications.length === 0 && (
        <div className="card p-12 text-center text-gray-500 space-y-3">
          <PillIcon className="w-12 h-12 mx-auto text-gray-300" />
          <p className="text-base font-semibold text-gray-800">查無符合條件之藥物主檔</p>
          <p className="text-xs text-gray-400">請嘗試調整搜尋關鍵字或清除篩選條件</p>
          <button
            onClick={() => setSearchParams(new URLSearchParams())}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            重設篩選條件
          </button>
        </div>
      )}

      {/* Medications Table View */}
      {!isLoading && medications.length > 0 && viewMode === 'table' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-500 font-semibold text-left">
                  <th className="px-4 py-3">住民 / 床位</th>
                  <th className="px-4 py-3">藥品名稱</th>
                  <th className="px-4 py-3">劑量規格</th>
                  <th className="px-4 py-3">頻率 / 排程時間</th>
                  <th className="px-4 py-3">目前庫存</th>
                  <th className="px-4 py-3">下一劑時間</th>
                  <th className="px-4 py-3">狀態</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {medications.map((med) => (
                  <tr key={med.medicationId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{med.residentName}</div>
                      <div className="text-[11px] text-gray-500">床位：{med.bedNumber || '未排'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/medications/${med.medicationId}`}
                        className="font-bold text-primary-700 hover:underline"
                      >
                        {med.name}
                      </Link>
                      {med.notes && <div className="text-[11px] text-gray-400 truncate max-w-xs">{med.notes}</div>}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">{med.dosage}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">
                        {FREQUENCY_LABELS[med.frequency] || med.frequency}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {med.schedule && med.schedule.length > 0 ? (
                          med.schedule.map((s) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.5 bg-gray-100 text-gray-700 font-mono text-[10px] rounded"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-400">PRN</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          med.stockLevel <= 0
                            ? 'bg-danger-100 text-danger-800'
                            : med.stockLevel <= med.reorderThreshold
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {med.stockLevel} 顆
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {formatDateTime(med.nextScheduled)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                          med.status === 'Active'
                            ? 'badge-success'
                            : med.status === 'OnHold'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {med.status === 'Active' ? '使用中' : med.status === 'OnHold' ? '暫停' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage && med.status === 'Active' && (
                          <button
                            onClick={() => setAdministerTargetMed(med)}
                            className="btn-primary text-xs py-1 px-2.5 font-bold"
                            title="執行給藥記錄"
                          >
                            給藥
                          </button>
                        )}
                        <Link
                          to={`/medications/${med.medicationId}`}
                          className="btn-ghost text-xs py-1 px-2 text-gray-600 hover:text-gray-900"
                        >
                          明細
                        </Link>
                        {canManage && (
                          <Link
                            to={`/medications/${med.medicationId}/edit`}
                            className="btn-ghost text-xs py-1 px-2 text-gray-600 hover:text-gray-900"
                          >
                            編輯
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Medications Card Grid View */}
      {!isLoading && medications.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medications.map((med) => (
            <div key={med.medicationId} className="card hover:shadow-md transition-shadow">
              <div className="card-body p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold">
                      床位 {med.bedNumber || '未排'}
                    </span>
                    <span className="text-xs font-bold text-gray-900 ml-2">{med.residentName}</span>
                    <h2 className="text-base font-bold text-gray-900 mt-1">
                      <Link to={`/medications/${med.medicationId}`} className="hover:text-primary-700">
                        {med.name}
                      </Link>
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">劑量：{med.dosage}</p>
                  </div>

                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                      med.stockLevel <= 0
                        ? 'bg-danger-100 text-danger-800'
                        : med.stockLevel <= med.reorderThreshold
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    庫存: {med.stockLevel}
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-100 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>頻率：{FREQUENCY_LABELS[med.frequency] || med.frequency}</span>
                    <span className="font-mono text-gray-500">{med.schedule?.join(', ') || 'PRN'}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>下一劑：</span>
                    <span className="font-mono font-bold text-primary-800">
                      {formatDateTime(med.nextScheduled)}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <Link to={`/medications/${med.medicationId}`} className="text-xs text-gray-500 hover:underline">
                    查看完整記錄
                  </Link>
                  {canManage && med.status === 'Active' && (
                    <button
                      onClick={() => setAdministerTargetMed(med)}
                      className="btn-primary text-xs py-1 px-3 font-bold"
                    >
                      執行給藥
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => updateFilters({ page: String(page - 1) })}
            disabled={page <= 1}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            上一頁
          </button>
          <span className="text-xs text-gray-500">
            第 {page} / {totalPages} 頁
          </span>
          <button
            onClick={() => updateFilters({ page: String(page + 1) })}
            disabled={page >= totalPages}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            下一頁
          </button>
        </div>
      )}

      {/* Administer Modal */}
      <MedicationAdministerModal
        medication={administerTargetMed}
        isOpen={Boolean(administerTargetMed)}
        onClose={() => setAdministerTargetMed(null)}
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function PillIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
      />
    </svg>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}