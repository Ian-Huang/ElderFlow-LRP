import { useState, useEffect, useCallback } from 'react';
import type { User, UserRole, UserCreateInput, PaginatedResponse } from '@lrp/shared';
import { UserCreateSchema } from '@lrp/shared';
import { apiClient } from '@/api/apiClient';
import { getRoleLabel } from '@/utils/roles';

export function UserManagementView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals & Notifications
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'security'; message: string } | null>(null);

  // Load Users from API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await apiClient.get<PaginatedResponse<User>>('/users', params);
      if (response.data) {
        setUsers(response.data.items);
        setTotalPages(response.data.totalPages || 1);
        setTotalCount(response.data.total);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '載入使用者清單失敗';
      setAlertMessage({
        type: 'error',
        message: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Role Change
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const originalUsers = [...users];
    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.userId === userId ? { ...u, role: newRole } : u))
    );

    try {
      const res = await apiClient.patch<User>(`/users/${userId}/role`, { role: newRole });
      if (res.data) {
        setAlertMessage({
          type: 'success',
          message: `已成功將使用者身分調整為 ${getRoleLabel(newRole)}`,
        });
      }
    } catch (err: unknown) {
      // Rollback
      setUsers(originalUsers);
      const apiErr = err as { code?: string; message?: string } | null;
      const isCsrf = apiErr?.code === 'CSRF_INVALID' || apiErr?.message?.includes('CSRF');
      setAlertMessage({
        type: isCsrf ? 'security' : 'error',
        message: isCsrf
          ? '安全性警示：CSRF 驗證失敗 (403 Forbidden)，角色變更已取消'
          : apiErr?.message || '無法變更使用者角色',
      });
    }
  };

  // Handle Status Toggle (Active / Inactive)
  const handleStatusToggle = async (userId: string, currentActive: boolean) => {
    const nextStatus = currentActive ? 'inactive' : 'active';
    const originalUsers = [...users];

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) =>
        u.userId === userId
          ? { ...u, isActive: !currentActive, status: nextStatus }
          : u
      )
    );

    try {
      const res = await apiClient.patch<User>(`/users/${userId}/status`, {
        status: nextStatus,
        isActive: !currentActive,
      });
      if (res.data) {
        setAlertMessage({
          type: 'success',
          message: `使用者狀態已切換為「${nextStatus === 'active' ? '啟用' : '停用'}」`,
        });
      }
    } catch (err: unknown) {
      // Rollback
      setUsers(originalUsers);
      const apiErr = err as { code?: string; message?: string } | null;
      const isCsrf = apiErr?.code === 'CSRF_INVALID' || apiErr?.message?.includes('CSRF');
      setAlertMessage({
        type: isCsrf ? 'security' : 'error',
        message: isCsrf
          ? '安全性警示：CSRF 驗證失敗 (403 Forbidden)，狀態變更已取消'
          : apiErr?.message || '無法更新使用者狀態',
      });
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`確定要刪除使用者「${userName}」嗎？此操作無法復原。`)) {
      return;
    }

    try {
      await apiClient.delete(`/users/${userId}`);
      setAlertMessage({
        type: 'success',
        message: `使用者「${userName}」已成功刪除`,
      });
      fetchUsers();
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string } | null;
      const isCsrf = apiErr?.code === 'CSRF_INVALID' || apiErr?.message?.includes('CSRF');
      setAlertMessage({
        type: isCsrf ? 'security' : 'error',
        message: isCsrf
          ? '安全性警示：CSRF 驗證失敗 (403 Forbidden)，刪除操作已被拒絕'
          : apiErr?.message || '刪除使用者失敗',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {alertMessage && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-sm flex items-center justify-between transition-all ${
            alertMessage.type === 'success'
              ? 'bg-success-50 border border-success-200 text-success-700'
              : alertMessage.type === 'security'
              ? 'bg-danger-100 border-2 border-danger-500 text-danger-900 font-semibold'
              : 'bg-danger-50 border border-danger-200 text-danger-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {alertMessage.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-success-600 flex-shrink-0" />}
            {alertMessage.type === 'security' && <ShieldWarningIcon className="w-5 h-5 text-danger-600 flex-shrink-0" />}
            {alertMessage.type === 'error' && <XCircleIcon className="w-5 h-5 text-danger-600 flex-shrink-0" />}
            <span>{alertMessage.message}</span>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-xs underline hover:opacity-75 ml-4"
          >
            關閉
          </button>
        </div>
      )}

      {/* Action Bar & Filters */}
      <div className="card">
        <div className="card-body flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="搜尋帳號、姓名..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="input pl-9"
                aria-label="搜尋帳號或姓名"
              />
              <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="input sm:w-40"
              aria-label="依角色篩選"
            >
              <option value="">全部角色</option>
              <option value="caregiver">照護員</option>
              <option value="supervisor">主管</option>
              <option value="admin">管理員</option>
              <option value="sysadmin">系統管理員</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input sm:w-36"
              aria-label="依狀態篩選"
            >
              <option value="">全部狀態</option>
              <option value="active">啟用中</option>
              <option value="inactive">已停用</option>
            </select>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <UserAddIcon className="w-4 h-4" />
            新增使用者
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            使用者名冊 ({totalCount} 位)
          </h2>
          <span className="text-xs text-gray-500">每頁 20 筆</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" role="table">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">帳號</th>
                <th className="px-5 py-3">姓名</th>
                <th className="px-5 py-3">角色權限</th>
                <th className="px-5 py-3">國籍身分</th>
                <th className="px-5 py-3">帳號狀態</th>
                <th className="px-5 py-3">最後登入</th>
                <th className="px-5 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mb-2" />
                    <div>資料載入中...</div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    查無符合條件的使用者資料
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isActive = u.status ? u.status === 'active' : u.isActive !== false;
                  return (
                    <tr key={u.userId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-medium text-gray-900">
                        {u.username}
                      </td>
                      <td className="px-5 py-3.5 text-gray-900 font-medium">
                        {u.name}
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.userId, e.target.value as UserRole)}
                          className="input py-1 px-2 text-xs w-32 bg-white"
                          aria-label={`調整 ${u.name} 角色`}
                        >
                          <option value="caregiver">照護員</option>
                          <option value="supervisor">主管</option>
                          <option value="admin">管理員</option>
                          <option value="sysadmin">系統管理員</option>
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.isLocalStaff ? (
                          <span className="badge-success">本國籍</span>
                        ) : (
                          <span className="badge-gray">外籍人員</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(u.userId, isActive)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-success-50 text-success-700 hover:bg-success-100 border border-success-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                          }`}
                          aria-label={`切換 ${u.name} 帳號狀態`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-success-500' : 'bg-gray-400'}`} />
                          {isActive ? '啟用中' : '已停用'}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">
                        {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '尚未登入'}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.userId, u.name)}
                          className="btn-ghost text-danger-600 hover:text-danger-800 text-xs py-1 px-2"
                          aria-label={`刪除 ${u.name}`}
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="card-footer justify-between">
          <div className="text-xs text-gray-500">
            第 {page} / {totalPages} 頁，共 {totalCount} 筆記錄
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary text-xs py-1 px-3"
              aria-label="上一頁"
            >
              上一頁
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary text-xs py-1 px-3"
              aria-label="下一頁"
            >
              下一頁
            </button>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(created) => {
            setShowCreateModal(false);
            setAlertMessage({
              type: 'success',
              message: `使用者「${created.name}」建立成功！`,
            });
            fetchUsers();
          }}
          onSecurityError={(msg) => {
            setAlertMessage({
              type: 'security',
              message: msg,
            });
          }}
        />
      )}
    </div>
  );
}

interface CreateUserModalProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
  onSecurityError: (msg: string) => void;
}

function CreateUserModal({ onClose, onSuccess, onSecurityError }: CreateUserModalProps) {
  const [formData, setFormData] = useState<UserCreateInput>({
    username: '',
    password: '',
    name: '',
    role: 'caregiver',
    isLocalStaff: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setApiError(null);

    // Validate with Zod - if password is empty string, treat as undefined (optional)
    const payload = {
      ...formData,
      password: formData.password?.trim() ? formData.password.trim() : undefined,
    };

    const result = UserCreateSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post<User>('/users', payload);
      if (res.data) {
        onSuccess(res.data);
      }
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string } | null;
      const isCsrf = apiErr?.code === 'CSRF_INVALID' || apiErr?.message?.includes('CSRF');
      if (isCsrf) {
        onSecurityError('安全性警示：CSRF 驗證失敗 (403 Forbidden)，新增使用者操作已被拒絕');
        onClose();
      } else {
        setApiError(apiErr?.message || '建立使用者失敗，請檢查輸入資料');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
          <h3 className="text-lg font-bold text-gray-900">新增系統使用者</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold"
            aria-label="關閉視窗"
          >
            ✕
          </button>
        </div>

        {apiError && (
          <div className="mb-4 p-3 bg-danger-50 border border-danger-200 text-danger-700 text-xs rounded-lg">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">使用者帳號 (Username) *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className={`input ${errors.username ? 'border-danger-500 focus:ring-danger-500' : ''}`}
              placeholder="例如：john_caregiver"
              aria-label="使用者帳號"
            />
            {errors.username && <p className="text-danger-600 text-xs mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className="label">使用者姓名 (Full Name) *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`input ${errors.name ? 'border-danger-500 focus:ring-danger-500' : ''}`}
              placeholder="例如：王小明"
              aria-label="使用者姓名"
            />
            {errors.name && <p className="text-danger-600 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="label">初始密碼 (Password)</label>
            <input
              type="password"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`input ${errors.password ? 'border-danger-500 focus:ring-danger-500' : ''}`}
              placeholder="至少 6 碼（選填）"
              aria-label="初始密碼"
            />
            {errors.password && <p className="text-danger-600 text-xs mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="label">指派角色 (Role) *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="input"
              aria-label="指派角色"
            >
              <option value="caregiver">照護員 (Caregiver)</option>
              <option value="supervisor">主管 (Supervisor)</option>
              <option value="admin">管理員 (Admin)</option>
              <option value="sysadmin">系統管理員 (Sysadmin)</option>
            </select>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isLocalStaff}
                onChange={(e) => setFormData({ ...formData, isLocalStaff: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                aria-label="本國籍員工"
              />
              <span className="text-sm text-gray-700 font-medium">本國籍員工 (Local Staff)</span>
            </label>
            <p className="text-xs text-gray-400 ml-6 mt-0.5">未勾選將標記為外籍人員，適用於照護人員配比統計</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? '儲存中...' : '確認建立'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function UserAddIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ShieldWarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
