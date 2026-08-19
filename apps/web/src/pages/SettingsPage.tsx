import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { useUIStore } from '@/stores/uiStore';

/// <reference types="../vite-env" />

export function SettingsPage() {
  const { hasRole, switchableUsers, clearAuth, removeSwitchableUser } = useAuthStore();
  const { conflicts, removeConflict } = useSyncStore();
  const { theme, setTheme, kioskMode, setKioskMode } = useUIStore();

  const canManageUsers = hasRole(['admin', 'sysadmin']);
  const canManageSystem = hasRole(['admin', 'sysadmin']);

  const pendingConflicts = conflicts.filter((c) => c.status === 'Pending');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">系統設定</h1>
        <p className="text-gray-500 mt-1">管理系統偏好、使用者帳號與同步設定</p>
      </div>

      {/* Appearance */}
      <section className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">外觀設定</h2>
        </div>
        <div className="card-body space-y-6">
          <div>
            <label className="label">主題模式</label>
            <div className="flex gap-3">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                    theme === t
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t === 'light' && <SunIcon className="w-5 h-5" aria-hidden="true" />}
                  {t === 'dark' && <MoonIcon className="w-5 h-5" aria-hidden="true" />}
                  {t === 'system' && <MonitorIcon className="w-5 h-5" aria-hidden="true" />}
                  <span className="capitalize">{t}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Kiosk 模式</label>
            <div className="flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={kioskMode}
                  onChange={(e) => setKioskMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-500 transition-colors ${
                  kioskMode ? 'bg-primary-600' : 'bg-gray-300'
                }`} />
                <span className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
              </label>
              <div>
                <p className="text-sm font-medium text-gray-900">單一應用程式模式</p>
                <p className="text-sm text-gray-500">啟用後將進入全螢幕模式，隱藏導覽列，適用於專用裝置</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sync & Offline */}
      <section className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">同步與離線</h2>
        </div>
        <div className="card-body space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-900">{conflicts.length}</p>
              <p className="text-sm text-gray-500">總衝突數</p>
            </div>
            <div className="p-4 bg-warning-50 rounded-lg">
              <p className="text-3xl font-bold text-warning-700">{pendingConflicts.length}</p>
              <p className="text-sm text-gray-500">待處理</p>
            </div>
            <div className="p-4 bg-success-50 rounded-lg">
              <p className="text-3xl font-bold text-success-700">{conflicts.filter((c) => c.status === 'Resolved').length}</p>
              <p className="text-sm text-gray-500">已解決</p>
            </div>
          </div>

          {pendingConflicts.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-medium text-gray-900 mb-3">待處理衝突</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pendingConflicts.map((conflict) => (
                  <div key={conflict.conflictId} className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{conflict.recordType} - {conflict.recordId}</p>
                        <p className="text-xs text-gray-500">類型: {conflict.conflictType} · 欄位: {conflict.conflictingFields.join(', ')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-secondary text-xs py-1 px-2">使用本地</button>
                        <button className="btn-secondary text-xs py-1 px-2">使用伺服器</button>
                        <button className="btn-danger text-xs py-1 px-2" onClick={() => removeConflict(conflict.conflictId)}>
                          刪除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* User Switching */}
      <section className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">快速切換帳號</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-gray-500 mb-4">記住最近 5 組已登入帳號，支援離線切換</p>
          {switchableUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">尚無可切換帳號</p>
          ) : (
            <div className="space-y-2">
              {switchableUsers.map((u) => (
                <div key={u.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-medium text-sm">{u.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">@{u.username} · {u.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSwitchableUser(u.userId)}
                    className="text-danger-600 hover:text-danger-700 text-sm"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* User Management (Admin only) */}
      {canManageUsers && (
        <section className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">使用者管理</h2>
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">帳號</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">本國籍</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最後登入</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { userId: 'user-001', username: 'caregiver1', name: '陳照護', role: 'caregiver', isLocalStaff: true, lastLoginAt: '2024-01-15T08:00:00Z' },
                    { userId: 'user-002', username: 'supervisor1', name: '林主管', role: 'supervisor', isLocalStaff: true, lastLoginAt: '2024-01-15T07:30:00Z' },
                    { userId: 'user-003', username: 'admin1', name: '張管理員', role: 'admin', isLocalStaff: false, lastLoginAt: '2024-01-14T18:00:00Z' },
                  ].map((u) => (
                    <tr key={u.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{u.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{u.name}</td>
                      <td className="px-4 py-3">
                        <span className="badge-primary">{u.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.isLocalStaff ? (
                          <span className="badge-success">是</span>
                        ) : (
                          <span className="badge-gray">否</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(u.lastLoginAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="btn-ghost text-xs py-1.5 px-3">編輯</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="btn-primary">新增使用者</button>
            </div>
          </div>
        </section>
      )}

      {/* System Info */}
      {canManageSystem && (
        <section className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">系統資訊</h2>
          </div>
          <div className="card-body">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><dt className="text-gray-500">應用程式版本</dt><dd className="font-mono text-gray-900">0.1.0 (MVP)</dd></div>
              <div><dt className="text-gray-500">建構時間</dt><dd className="font-mono text-gray-900">{new Date().toLocaleString('zh-TW')}</dd></div>
              <div><dt className="text-gray-500">Node 版本</dt><dd className="font-mono text-gray-900">{typeof process !== 'undefined' ? process.version : 'N/A'}</dd></div>
              <div><dt className="text-gray-500">環境模式</dt><dd className="font-mono text-gray-900">{import.meta.env.MODE}</dd></div>
              <div><dt className="text-gray-500">API 基礎路徑</dt><dd className="font-mono text-gray-900">{import.meta.env.VITE_API_BASE_URL || '/api/v1'}</dd></div>
              <div><dt className="text-gray-500">Mock API</dt><dd className="font-mono text-gray-900">{import.meta.env.VITE_MOCK_API === 'true' ? '啟用' : '停用'}</dd></div>
              <div><dt className="text-gray-500">PWA 支援</dt><dd className="font-mono text-gray-900">啟用 (Workbox)</dd></div>
              <div><dt className="text-gray-500">資料儲存</dt><dd className="font-mono text-gray-900">IndexedDB + localStorage</dd></div>
            </dl>
          </div>
        </section>
      )}

      {/* Danger Zone */}
      <section className="card border-danger-200">
        <div className="card-header border-danger-200">
          <h2 className="text-lg font-semibold text-danger-700">危險區域</h2>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">登出並清除所有本地資料</p>
              <p className="text-sm text-gray-500">將清除認證 Token、切換帳號記錄、同步狀態與 UI 偏好設定</p>
            </div>
            <button
              onClick={() => {
                if (confirm('確定要登出並清除所有本地資料嗎？此動作無法復原。')) {
                  clearAuth();
                  localStorage.clear();
                  sessionStorage.clear();
                }
              }}
              className="btn-danger"
            >
              <TrashIcon className="w-4 h-4 mr-1" aria-hidden="true" />
              清除並登出
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Icons
function SunIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}

function MoonIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
}

function MonitorIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
}

function TrashIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
}