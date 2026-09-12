import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { getRoleLabel, getRoleBadgeClass } from '@/utils/roles';
import { setSimulateCsrfError } from '@/api/apiClient';

export function AdminLayout() {
  const { userRole } = useAuthStore();
  const location = useLocation();

  const [simulateCsrf, setSimulateCsrf] = useState<boolean>(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('SIMULATE_CSRF_ERROR') === 'true';
    } catch {
      return false;
    }
  });

  const [csrfAlert, setCsrfAlert] = useState<string | null>(null);

  const handleCsrfToggle = (checked: boolean) => {
    setSimulateCsrf(checked);
    setSimulateCsrfError(checked);
    if (checked) {
      setCsrfAlert('⚠️ CSRF 驗證失敗模擬已開啟：所有突變請求 (POST, PATCH, DELETE) 將會收到 HTTP 403 CSRF_INVALID。');
    } else {
      setCsrfAlert(null);
    }
  };

  // Compute current tab name for breadcrumbs
  const getSubpageName = () => {
    const pathname = location.pathname;
    if (pathname.includes('/admin/health')) return '系統健康監控';
    if (pathname.includes('/admin/flags')) return '功能旗標管理';
    if (pathname.includes('/admin/settings')) return '核心參數設定';
    if (pathname.includes('/admin/matrix')) return '角色權限矩陣';
    return '使用者管理';
  };

  const navItems = [
    { path: '/admin/users', label: '使用者管理', icon: UsersIcon },
    { path: '/admin/health', label: '系統健康監控', icon: ActivityIcon },
    { path: '/admin/flags', label: '功能旗標管理', icon: FlagIcon },
    { path: '/admin/settings', label: '核心參數設定', icon: SlidersIcon },
    { path: '/admin/matrix', label: '角色權限矩陣', icon: MatrixIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumbs & Badges */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            {/* Breadcrumb */}
            <nav className="flex items-center text-xs text-gray-500 mb-2 space-x-2" aria-label="麵包屑導航">
              <NavLink to="/dashboard" className="hover:text-primary-600 transition-colors">
                首頁
              </NavLink>
              <span>/</span>
              <NavLink to="/admin/users" className="hover:text-primary-600 transition-colors">
                系統管理
              </NavLink>
              <span>/</span>
              <span className="text-gray-800 font-medium">{getSubpageName()}</span>
            </nav>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">系統管理中心</h1>
              {userRole && (
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(userRole)}`}>
                  {getRoleLabel(userRole)}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              集中管理機構使用者、系統核心設定、模組發布旗標與服務運行健康狀態
            </p>
          </div>

          {/* CSRF Simulation Switch Toggle */}
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-lg self-start md:self-auto">
            <div className="text-right">
              <label htmlFor="csrf-simulate-toggle" className="text-xs font-semibold text-gray-800 block cursor-pointer">
                模擬 CSRF 驗證失敗
              </label>
              <span className="text-[11px] text-gray-500">
                {simulateCsrf ? '狀態：已啟用 (403)' : '狀態：未啟用 (正常)'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="csrf-simulate-toggle"
                type="checkbox"
                checked={simulateCsrf}
                onChange={(e) => handleCsrfToggle(e.target.checked)}
                className="sr-only peer"
                aria-label="模擬 CSRF 驗證失敗開關"
              />
              <div className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-danger-400 transition-colors ${
                simulateCsrf ? 'bg-danger-600' : 'bg-gray-300'
              }`} />
              <span className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </label>
          </div>
        </div>

        {/* CSRF Alert Banner */}
        {csrfAlert && (
          <div
            className="mt-4 p-3.5 bg-danger-50 border border-danger-200 text-danger-800 rounded-lg text-sm flex items-center justify-between"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <ShieldAlertIcon className="w-5 h-5 text-danger-600 flex-shrink-0" />
              <span>{csrfAlert}</span>
            </div>
            <button
              onClick={() => setCsrfAlert(null)}
              className="text-danger-600 hover:text-danger-800 text-xs font-bold ml-4"
              aria-label="關閉警示"
            >
              關閉
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto" aria-label="管理選單分頁">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      isActive
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Subpage Views */}
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}

// Icons
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  );
}

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );
}

function MatrixIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function ShieldAlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
