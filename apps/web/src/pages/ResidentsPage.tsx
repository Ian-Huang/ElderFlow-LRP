import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { offlineDb } from '@/utils/offlineDb';
import { formatDate, calculateAge } from '@/utils/rocDate';
import { ResidentInactiveModal } from '@/components/ResidentInactiveModal';
import apiClient from '@/api/apiClient';
import type { Resident, PaginatedResponse } from '@lrp/shared';

export function ResidentsPage() {
  const { hasRole } = useAuthStore();
  const { isOnline } = useSyncStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // View mode: table or grid
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filters state from URL search params or local defaults
  const search = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || '';
  const threePipeFilter = searchParams.get('hasThreePipe') || '';
  const identityTypeFilter = searchParams.get('identityType') || '';
  const dependencyLevelFilter = searchParams.get('dependencyLevel') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 12;
  const sortField = searchParams.get('sort') || 'residentId';
  const sortOrder = (searchParams.get('order') as 'asc' | 'desc') || 'asc';

  // State for Inactive modal
  const [inactiveTarget, setInactiveTarget] = useState<Resident | null>(null);

  // Update search params helper
  const updateFilter = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });
    // Reset to page 1 on filter changes unless page is explicitly updated
    if (!('page' in updates)) {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  // Fetch residents query
  const queryKey = [
    'residents',
    { page, pageSize, search, statusFilter, threePipeFilter, identityTypeFilter, dependencyLevelFilter, sortField, sortOrder },
  ];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (threePipeFilter) params.set('hasThreePipe', threePipeFilter);
      if (identityTypeFilter) params.set('identityType', identityTypeFilter);
      if (dependencyLevelFilter) params.set('dependencyLevel', dependencyLevelFilter);
      params.set('sort', sortField);
      params.set('order', sortOrder);

      try {
        const res = await apiClient.get<PaginatedResponse<Resident>>(`/residents?${params.toString()}`);
        if (res.success && res.data) {
          // Cache to IndexedDB for offline access
          for (const item of res.data.items) {
            await offlineDb.Residents.put({
              ...item,
              localId: item.residentId,
              syncStatus: 'synced',
              version: 1,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            });
          }
          return res.data;
        }
        throw new Error(res.error?.message || '載入失敗');
      } catch (err) {
        // Fallback to IndexedDB
        const offlineItems = await offlineDb.Residents.toArray();
        let filtered = [...offlineItems];
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(
            (r) =>
              r.name.toLowerCase().includes(s) ||
              r.residentId.toLowerCase().includes(s) ||
              (r.bedNumber && r.bedNumber.toLowerCase().includes(s))
          );
        }
        if (statusFilter) {
          filtered = filtered.filter((r) => r.status === statusFilter);
        }
        if (threePipeFilter) {
          const isTrue = threePipeFilter === 'true';
          filtered = filtered.filter((r) => Boolean(r.hasThreePipe) === isTrue);
        }
        if (identityTypeFilter) {
          filtered = filtered.filter((r) => r.identityType === identityTypeFilter);
        }
        if (dependencyLevelFilter) {
          filtered = filtered.filter((r) => r.dependencyLevel === dependencyLevelFilter);
        }

        const start = (page - 1) * pageSize;
        const items = filtered.slice(start, start + pageSize);
        return {
          items,
          total: filtered.length,
          page,
          pageSize,
          totalPages: Math.ceil(filtered.length / pageSize) || 1,
        };
      }
    },
  });

  const residents = useMemo(() => data?.items || [], [data]);
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const canManage = hasRole(['admin', 'sysadmin', 'supervisor']);
  const canDeactivate = hasRole(['admin', 'sysadmin']);

  const handleDeactivateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['residents'] });
  };

  const handleExportCsv = () => {
    if (residents.length === 0) return;
    const headers = ['住民編號', '姓名', '性別', '出生日期', '床位', '三管', '狀態', '身份別', '依賴程度', '入住日期', '緊急聯絡人', '聯絡電話'];
    const rows = residents.map((r) => [
      r.residentId,
      r.name,
      r.gender === 'Male' ? '男' : '女',
      r.dateOfBirth,
      r.bedNumber || '',
      r.hasThreePipe ? '是' : '否',
      r.status === 'Active' ? '住住中' : '已離院',
      r.identityType || '',
      r.dependencyLevel || '',
      r.admissionDate,
      r.emergencyContact?.name || '',
      r.emergencyContact?.mobile || r.emergencyContact?.phone || '',
    ]);

    const csvContent = '\uFEFF' + [headers, ...rows].map((e) => e.map((s) => `"${s}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `住民清冊_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">住民基本資料管理</h1>
            {!isOnline && (
              <span className="badge-warning text-xs px-2.5 py-0.5 rounded-full" title="離線模式：載入本機快取">
                離線模式
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1">
            管理院內住民基本資料、管路狀況、床位分配與緊急聯絡人資訊（共 {total} 筆）
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="btn-secondary text-sm"
            title="匯出目前列表 CSV"
          >
            <DownloadIcon className="w-4 h-4 mr-1" aria-hidden="true" />
            匯出清冊
          </button>
          {canManage && (
            <>
              <Link to="/residents/import" className="btn-secondary text-sm">
                <UploadIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                批次匯入
              </Link>
              <Link to="/residents/new" className="btn-primary text-sm">
                <PlusIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                新增住民
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="card">
        <div className="card-body space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <label htmlFor="resident-search" className="sr-only">搜尋住民</label>
              <input
                id="resident-search"
                type="text"
                value={search}
                onChange={(e) => updateFilter({ q: e.target.value })}
                className="input w-full pl-10"
                placeholder="搜尋姓名、住民編號、身分證號、床位 (例如 0040, 1-1)..."
              />
              <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" aria-hidden="true" />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select
                aria-label="住民狀態篩選"
                value={statusFilter}
                onChange={(e) => updateFilter({ status: e.target.value })}
                className="input text-sm"
              >
                <option value="">所有狀態</option>
                <option value="Active">住住中</option>
                <option value="Inactive">已離院</option>
              </select>

              <select
                aria-label="三管狀態篩選"
                value={threePipeFilter}
                onChange={(e) => updateFilter({ hasThreePipe: e.target.value })}
                className="input text-sm"
              >
                <option value="">所有管路</option>
                <option value="true">三管住民 (1:15)</option>
                <option value="false">一般住民 (1:20)</option>
              </select>

              <select
                aria-label="身份別篩選"
                value={identityTypeFilter}
                onChange={(e) => updateFilter({ identityType: e.target.value })}
                className="input text-sm"
              >
                <option value="">所有身份別</option>
                <option value="一般戶">一般戶</option>
                <option value="中低收入戶">中低收入戶</option>
                <option value="低收入戶">低收入戶</option>
                <option value="緊急安置">緊急安置</option>
                <option value="榮民/眷">榮民/眷</option>
                <option value="原住民">原住民</option>
              </select>

              <select
                aria-label="依賴程度篩選"
                value={dependencyLevelFilter}
                onChange={(e) => updateFilter({ dependencyLevel: e.target.value })}
                className="input text-sm"
              >
                <option value="">所有依賴度</option>
                <option value="完全依賴">完全依賴</option>
                <option value="部分依賴">部分依賴</option>
                <option value="可自行活動">可自行活動</option>
              </select>
            </div>
          </div>

          {/* Sub-bar: Sorting & View Mode */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <span>排序方式：</span>
              <button
                onClick={() =>
                  updateFilter({
                    sort: 'residentId',
                    order: sortField === 'residentId' && sortOrder === 'asc' ? 'desc' : 'asc',
                  })
                }
                className={`px-2 py-1 rounded text-xs font-medium ${sortField === 'residentId' ? 'bg-primary-50 text-primary-700 font-bold' : 'hover:bg-gray-100'}`}
              >
                住民編號 {sortField === 'residentId' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() =>
                  updateFilter({
                    sort: 'bedNumber',
                    order: sortField === 'bedNumber' && sortOrder === 'asc' ? 'desc' : 'asc',
                  })
                }
                className={`px-2 py-1 rounded text-xs font-medium ${sortField === 'bedNumber' ? 'bg-primary-50 text-primary-700 font-bold' : 'hover:bg-gray-100'}`}
              >
                床位 {sortField === 'bedNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() =>
                  updateFilter({
                    sort: 'name',
                    order: sortField === 'name' && sortOrder === 'asc' ? 'desc' : 'asc',
                  })
                }
                className={`px-2 py-1 rounded text-xs font-medium ${sortField === 'name' ? 'bg-primary-50 text-primary-700 font-bold' : 'hover:bg-gray-100'}`}
              >
                姓名 {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() =>
                  updateFilter({
                    sort: 'admissionDate',
                    order: sortField === 'admissionDate' && sortOrder === 'asc' ? 'desc' : 'asc',
                  })
                }
                className={`px-2 py-1 rounded text-xs font-medium ${sortField === 'admissionDate' ? 'bg-primary-50 text-primary-700 font-bold' : 'hover:bg-gray-100'}`}
              >
                入住日期 {sortField === 'admissionDate' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                aria-label="切換表格檢視"
              >
                <TableIcon className="w-4 h-4 inline mr-1" aria-hidden="true" />
                表格
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                aria-label="切換卡片檢視"
              >
                <GridIcon className="w-4 h-4 inline mr-1" aria-hidden="true" />
                卡片
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="card p-12 text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" aria-label="載入中" />
          <p>載入住民資料中...</p>
        </div>
      ) : isError ? (
        <div className="card p-12 text-center text-danger-600">
          <p>載入住民資料失敗，請檢查網路連線或重新整理。</p>
        </div>
      ) : residents.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          <UsersIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden="true" />
          <p className="text-lg font-medium text-gray-700">找不到符合條件的住民</p>
          <p className="text-sm mt-1">請嘗試清除搜尋條件或篩選項目</p>
          <button
            onClick={() => setSearchParams(new URLSearchParams())}
            className="btn-secondary text-xs mt-4"
          >
            重設所有篩選
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">
                  <th className="px-4 py-3">編號 / 床位</th>
                  <th className="px-4 py-3">姓名 (年齡)</th>
                  <th className="px-4 py-3">三管 / 管路</th>
                  <th className="px-4 py-3">身份別 / 依賴度</th>
                  <th className="px-4 py-3">狀態</th>
                  <th className="px-4 py-3">入住日期</th>
                  <th className="px-4 py-3">第一聯絡人</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {residents.map((r) => (
                  <tr key={r.residentId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-gray-900">{r.residentId}</span>
                      {r.bedNumber && (
                        <span className="ml-2 inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {r.bedNumber}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/residents/${r.residentId}`}
                        className="font-medium text-primary-600 hover:text-primary-800 hover:underline"
                      >
                        {r.name}
                      </Link>
                      <span className="text-gray-500 text-xs ml-1.5">
                        ({r.gender === 'Male' ? '男' : '女'}, {calculateAge(r.dateOfBirth)} 歲)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.hasThreePipe ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                          三管 ({r.pipes?.join('、') || '管路'})
                        </span>
                      ) : r.pipes && r.pipes.length > 0 ? (
                        <span className="text-xs text-gray-600">
                          {r.pipes.join('、')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">無</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="space-y-0.5">
                        <span className="inline-block font-medium text-gray-700">{r.identityType || '一般戶'}</span>
                        <span className="text-gray-400 mx-1">·</span>
                        <span className="text-gray-500">{r.dependencyLevel || '部分依賴'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'Active' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          住住中
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          已離院
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                      {formatDate(r.admissionDate)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.emergencyContact?.name ? (
                        <div>
                          <p className="font-medium text-gray-900">
                            {r.emergencyContact.name} ({r.emergencyContact.relationship || '聯絡人'})
                          </p>
                          <p className="text-gray-500 font-mono text-[11px]">
                            {r.emergencyContact.mobile || r.emergencyContact.phone || '—'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/residents/${r.residentId}`}
                          className="btn-ghost text-xs py-1 px-2.5"
                        >
                          詳情
                        </Link>
                        {canManage && (
                          <Link
                            to={`/residents/${r.residentId}/edit`}
                            className="btn-ghost text-xs py-1 px-2.5 text-primary-600 hover:bg-primary-50"
                          >
                            編輯
                          </Link>
                        )}
                        {canDeactivate && r.status === 'Active' && (
                          <button
                            onClick={() => setInactiveTarget(r)}
                            className="btn-ghost text-xs py-1 px-2 text-danger-600 hover:bg-danger-50"
                            title="停用 / 辦理離院"
                          >
                            離院
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {residents.map((r) => (
            <div key={r.residentId} className="card hover:shadow-md transition-shadow">
              <div className="card-body p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/residents/${r.residentId}`}
                        className="text-lg font-bold text-gray-900 hover:text-primary-600"
                      >
                        {r.name}
                      </Link>
                      <span className="text-xs text-gray-500">
                        {r.gender === 'Male' ? '男' : '女'} · {calculateAge(r.dateOfBirth)} 歲
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                      <span>編號：{r.residentId}</span>
                      {r.bedNumber && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-bold">
                          床位 {r.bedNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    {r.status === 'Active' ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        住住中
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        已離院
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-gray-100">
                  <div>
                    <span className="text-gray-400">管路：</span>
                    <span className="font-medium text-gray-800">
                      {r.hasThreePipe ? (
                        <span className="text-amber-700 font-bold">三管 ({r.pipes?.join('、') || '有'})</span>
                      ) : (
                        r.pipes?.join('、') || '無管路'
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">依賴度：</span>
                    <span className="font-medium text-gray-800">{r.dependencyLevel || '部分依賴'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">身份別：</span>
                    <span className="font-medium text-gray-800">{r.identityType || '一般戶'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">入住日：</span>
                    <span className="font-medium text-gray-800">{formatDate(r.admissionDate)}</span>
                  </div>
                </div>

                {r.emergencyContact?.name && (
                  <div className="text-xs bg-gray-50 p-2.5 rounded-lg space-y-0.5">
                    <p className="text-gray-500 text-[11px]">第一聯絡人</p>
                    <p className="font-medium text-gray-900">
                      {r.emergencyContact.name} ({r.emergencyContact.relationship || '家屬'})
                    </p>
                    <p className="text-gray-600 font-mono">
                      {r.emergencyContact.mobile || r.emergencyContact.phone || '—'}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Link
                    to={`/residents/${r.residentId}`}
                    className="btn-secondary text-xs py-1 px-3"
                  >
                    檢視詳情
                  </Link>
                  {canManage && (
                    <Link
                      to={`/residents/${r.residentId}/edit`}
                      className="btn-primary text-xs py-1 px-3"
                    >
                      編輯
                    </Link>
                  )}
                  {canDeactivate && r.status === 'Active' && (
                    <button
                      onClick={() => setInactiveTarget(r)}
                      className="btn-ghost text-xs py-1 px-2 text-danger-600 hover:bg-danger-50"
                    >
                      離院
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">
            第 <span className="font-bold text-gray-900">{page}</span> 頁，共{' '}
            <span className="font-bold text-gray-900">{totalPages}</span> 頁 (共 {total} 筆)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateFilter({ page: String(Math.max(1, page - 1)) })}
              disabled={page <= 1}
              className="btn-secondary text-xs py-1 px-3"
            >
              上一頁
            </button>
            <button
              onClick={() => updateFilter({ page: String(Math.min(totalPages, page + 1)) })}
              disabled={page >= totalPages}
              className="btn-secondary text-xs py-1 px-3"
            >
              下一頁
            </button>
          </div>
        </div>
      )}

      {/* Inactive Confirmation Modal */}
      <ResidentInactiveModal
        resident={inactiveTarget}
        isOpen={Boolean(inactiveTarget)}
        onClose={() => setInactiveTarget(null)}
        onSuccess={handleDeactivateSuccess}
      />
    </div>
  );
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
}

function UploadIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
}

function DownloadIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
}

function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}

function UsersIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}

function TableIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
}

function GridIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
}