import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useCarePlans } from '@/hooks/useCarePlans';
import { useResidents } from '@/hooks/useResidents';
import { formatDate } from '@/utils/rocDate';
import type { CarePlanStatus } from '@lrp/shared';

const STATUS_FILTERS: Array<{ id: string; label: string; value?: CarePlanStatus }> = [
  { id: 'all', label: '全部' },
  { id: 'draft', label: '草稿', value: 'Draft' },
  { id: 'active', label: '執行中', value: 'Active' },
  { id: 'completed', label: '已完成', value: 'Completed' },
  { id: 'archived', label: '已封存', value: 'Archived' },
];

export function CarePlansPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole } = useAuthStore();
  const canManage = hasRole(['supervisor', 'admin', 'sysadmin']);

  const searchQuery = searchParams.get('q') || '';
  const selectedResidentId = searchParams.get('residentId') || '';
  const selectedStatus = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const [searchTerm, setSearchTerm] = useState(searchQuery);

  // Fetch residents for dropdown
  const { data: residentsData } = useResidents({
    pageSize: 100,
    status: 'Active',
  });
  const residentsList = residentsData?.items || [];

  // Fetch care plans
  const { data: carePlansData, isLoading } = useCarePlans({
    residentId: selectedResidentId || undefined,
    status: (selectedStatus as CarePlanStatus) || undefined,
    search: searchQuery || undefined,
    page,
    pageSize: 10,
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
    if ('q' in updates || 'residentId' in updates || 'status' in updates) {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchTerm.trim() || null });
  };

  const carePlans = carePlansData?.items || [];
  const totalPages = carePlansData?.totalPages || 1;
  const totalCount = carePlansData?.total || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">照護計畫</h1>
          <p className="text-gray-500 mt-1 text-sm">
            制定個別化照護目標、跨專業服務項目與執行進度追蹤
          </p>
        </div>
        {canManage && (
          <Link to="/care-plans/new" className="btn-primary">
            <PlusIcon className="w-5 h-5 mr-1" aria-hidden="true" />
            新增照護計畫
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            {STATUS_FILTERS.map((tab) => {
              const isActive = (tab.value === undefined && !selectedStatus) || selectedStatus === tab.value;
              return (
                <button
                  key={tab.id}
                  onClick={() => updateFilters({ status: tab.value || null })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder="搜尋計畫、目標、服務項目..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field text-sm w-full pr-8"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    updateFilters({ q: null });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            <button type="submit" className="btn-secondary text-sm">
              搜尋
            </button>
          </form>
        </div>

        {/* Resident dropdown selector */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-100 text-sm">
          <span className="text-gray-600 font-medium text-xs whitespace-nowrap">篩選住民：</span>
          <select
            value={selectedResidentId}
            onChange={(e) => updateFilters({ residentId: e.target.value || null })}
            className="input-field text-xs py-1.5 max-w-xs"
            aria-label="依住民篩選"
          >
            <option value="">全部住民</option>
            {residentsList.map((r) => (
              <option key={r.residentId} value={r.residentId}>
                {r.name} ({r.residentId} · 床位 {r.bedNumber || '未設定'})
              </option>
            ))}
          </select>
          {(selectedResidentId || selectedStatus || searchQuery) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSearchParams(new URLSearchParams());
              }}
              className="text-xs text-primary-600 hover:underline ml-auto"
            >
              清除所有篩選
            </button>
          )}
        </div>
      </div>

      {/* Plans List Table / Cards */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" aria-label="載入中" />
            <p>載入照護計畫資料中...</p>
          </div>
        ) : carePlans.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <DocumentIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden="true" />
            <p className="font-semibold text-gray-700">查無符合條件的照護計畫</p>
            <p className="text-xs text-gray-400 mt-1">請嘗試變更搜尋關鍵字或清除篩選條件</p>
            {canManage && (
              <Link to="/care-plans/new" className="btn-primary text-xs mt-4 inline-flex items-center">
                <PlusIcon className="w-4 h-4 mr-1" />
                新增照護計畫
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs border-b">
                  <th className="py-3.5 px-4 font-semibold">計畫編號</th>
                  <th className="py-3.5 px-4 font-semibold">住民姓名 / 床位</th>
                  <th className="py-3.5 px-4 font-semibold">狀態</th>
                  <th className="py-3.5 px-4 font-semibold">評估日期 · 複審日期</th>
                  <th className="py-3.5 px-4 font-semibold min-w-[220px]">主要目標摘要</th>
                  <th className="py-3.5 px-4 font-semibold">服務項目</th>
                  <th className="py-3.5 px-4 font-semibold text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {carePlans.map((plan) => {
                  const goals = plan.goals || [];
                  const avgProgress =
                    goals.length > 0
                      ? Math.round(
                          goals.reduce((acc, g) => acc + (g.progress ?? 0), 0) / goals.length
                        )
                      : 0;

                  return (
                    <tr key={plan.planId} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        <Link to={`/care-plans/${plan.planId}`} className="text-primary-600 hover:underline">
                          {plan.planId}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">
                          <Link to={`/residents/${plan.residentId}`} className="hover:underline">
                            {plan.residentName || plan.residentId}
                          </Link>
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {plan.bedNumber ? `床位 ${plan.bedNumber}` : `編號 ${plan.residentId}`}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={plan.status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600 whitespace-nowrap">
                        <div>評估：{formatDate(plan.assessmentDate)}</div>
                        <div className="text-gray-400">複審：{formatDate(plan.reviewDate)}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          {goals.slice(0, 2).map((g, idx) => (
                            <div key={idx} className="text-xs">
                              <p className="text-gray-800 line-clamp-1">
                                <span className="font-semibold text-gray-500 mr-1">#{idx + 1}</span>
                                {g.description}
                              </p>
                            </div>
                          ))}
                          {goals.length > 2 && (
                            <span className="text-[11px] text-gray-400">
                              另有 {goals.length - 2} 項照護目標
                            </span>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            <div className="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${avgProgress}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-gray-500">
                              平均進度 {avgProgress}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">
                          {plan.serviceItems?.length || 0}
                        </span>{' '}
                        項服務
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <Link
                          to={`/care-plans/${plan.planId}`}
                          className="btn-secondary text-xs py-1 px-2.5"
                        >
                          查看明細
                        </Link>
                        {canManage && (
                          <Link
                            to={`/care-plans/${plan.planId}/edit`}
                            className="btn-ghost text-xs py-1 px-2 text-gray-600 hover:text-gray-900"
                          >
                            編輯
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div>
              共 <span className="font-semibold text-gray-900">{totalCount}</span> 筆計畫，第{' '}
              <span className="font-semibold text-gray-900">{page}</span> / {totalPages} 頁
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => updateFilters({ page: String(page - 1) })}
                className="btn-secondary text-xs px-2.5 py-1 disabled:opacity-40"
              >
                上一頁
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => updateFilters({ page: String(page + 1) })}
                className="btn-secondary text-xs px-2.5 py-1 disabled:opacity-40"
              >
                下一頁
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: CarePlanStatus }) {
  switch (status) {
    case 'Draft':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
          草稿
        </span>
      );
    case 'Active':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          執行中
        </span>
      );
    case 'Completed':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          已完成
        </span>
      );
    case 'Archived':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
          已封存
        </span>
      );
    default:
      return <span className="badge-primary text-xs">{status}</span>;
  }
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}