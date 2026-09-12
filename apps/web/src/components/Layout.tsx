import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { useUIStore } from '@/stores/uiStore';
import { UserSwitcher } from '@/components/UserSwitcher';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { PwaInstallPrompt, OfflineReadyBadge, PwaUpdateToast } from '@/components/pwa';
import type { UserRole } from '@lrp/shared';

export function Layout() {
  const navigate = useNavigate();
  const { user, clearAuth, hasRole } = useAuthStore();
  const { isOnline, isSyncing, pendingChanges, conflicts } = useSyncStore();
  const { sidebarOpen, toggleSidebar, resolvedTheme, kioskMode } = useUIStore();
  const [unlockClicks, setUnlockClicks] = useState<number>(0);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check URL param ?kiosk=1 on mount and handle beforeunload when in kiosk mode
  useEffect(() => {
    useUIStore.getState().initKioskFromUrl();
  }, []);

  useEffect(() => {
    if (!kioskMode) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '系統正處於 Kiosk 鎖定模式，確定要離開嗎？';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [kioskMode]);

  const handleEmergencyUnlock = () => {
    const nextClicks = unlockClicks + 1;
    setUnlockClicks(nextClicks);

    if (unlockTimerRef.current) {
      clearTimeout(unlockTimerRef.current);
    }

    unlockTimerRef.current = setTimeout(() => {
      setUnlockClicks(0);
    }, 3000);

    if (nextClicks >= 5) {
      setUnlockClicks(0);
      useUIStore.getState().setKioskMode(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const navigation: {
    path: string;
    label: string;
    icon: React.FC<{ className?: string }>;
    roles: UserRole[];
    isPublic?: boolean;
  }[] = [
    { path: '/dashboard', label: '儀表板', icon: HomeIcon, roles: ['caregiver', 'supervisor', 'admin', 'sysadmin'] },
    { path: '/residents', label: '住民管理', icon: UsersIcon, roles: ['caregiver', 'supervisor', 'admin', 'sysadmin'] },
    { path: '/care-records', label: '照護記錄', icon: ClipboardIcon, roles: ['caregiver', 'supervisor', 'admin', 'sysadmin'] },
    { path: '/medications', label: '藥物管理', icon: PillIcon, roles: ['caregiver', 'supervisor', 'admin', 'sysadmin'] },
    { path: '/care-plans', label: '照護計畫', icon: DocumentIcon, roles: ['supervisor', 'admin', 'sysadmin'] },
    { path: '/reports', label: '報表中心', icon: ChartIcon, roles: ['supervisor', 'admin', 'sysadmin'] },
    { path: '/audit-toolkit', label: '評鑑工具箱', icon: BriefcaseIcon, roles: ['caregiver', 'supervisor', 'admin', 'sysadmin'], isPublic: true },
    { path: '/settings', label: '系統設定', icon: SettingsIcon, roles: ['admin', 'sysadmin'] },
  ];

  const filteredNav = navigation.filter((item) => item.isPublic || hasRole(item.roles));
  const pendingConflicts = conflicts.filter((c) => c.status === 'Pending').length;

  if (kioskMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col" data-testid="kiosk-layout">
        {/* Minimal Locked Kiosk Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between select-none shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={handleEmergencyUnlock}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 active:scale-95 transition-all text-left"
              aria-label="Kiosk 模式圖示 (點擊5次解除鎖定)"
              title="緊急解除：連續點擊 5 次"
              data-testid="kiosk-logo-btn"
            >
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">LRP</span>
              </div>
              <div className="hidden sm:block">
                <span className="font-semibold text-gray-900 text-sm block">Kiosk 照護模式</span>
                <span className="text-xs text-gray-500">鎖定導航中</span>
              </div>
            </button>

            <span className="text-xs px-2 py-0.5 bg-primary-50 text-primary-700 font-medium rounded border border-primary-200 hidden md:inline-block">
              螢幕常亮保持中
            </span>

            {unlockClicks > 0 && unlockClicks < 5 && (
              <span className="text-xs text-amber-600 font-semibold animate-pulse" data-testid="unlock-click-hint">
                再點擊 {5 - unlockClicks} 次解除鎖定
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <OfflineReadyBadge />
            <SyncStatusIndicator />
            <UserSwitcher />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
        <PwaUpdateToast />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto`}
        aria-label="主導覽選單"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">LRP</span>
              </div>
              <span className="font-semibold text-gray-900 text-lg hidden sm:block">長照管理</span>
            </div>
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label={sidebarOpen ? '收合選單' : '展開選單'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="主要導覽">
            {filteredNav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="p-3 border-t border-gray-200 space-y-3">
            {/* Status indicators */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success-500' : 'bg-danger-500'}`} />
              <span>{isOnline ? '線上' : '離線'}</span>
              {isSyncing && (
                <>
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                  <span>同步中...</span>
                </>
              )}
              {pendingChanges > 0 && (
                <>
                  <span className="w-2 h-2 rounded-full bg-warning-500" />
                  <span>{pendingChanges} 筆待同步</span>
                </>
              )}
            </div>

            {/* Conflict indicator */}
            {pendingConflicts > 0 && (
              <div className="p-2 bg-warning-50 border border-warning-200 rounded-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-warning-800 font-medium">{pendingConflicts} 個同步衝突</span>
                  <NavLink to="/sync/conflicts" className="text-primary-600 hover:underline">
                    處理
                  </NavLink>
                </div>
              </div>
            )}

            {/* User menu */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 font-medium text-sm">
                    {user?.name?.charAt(0) || 'G'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name || '訪客模式'}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role || '免登入'}</p>
                </div>
              </div>
              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <LogoutIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  <span>登出</span>
                </button>
              ) : (
                <NavLink
                  to="/login"
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium"
                >
                  <LogoutIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  <span>前往登入</span>
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="no-print fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Top bar */}
        <header className="no-print sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label={sidebarOpen ? '收合選單' : '展開選單'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900 hidden sm:block">
                長照管理系統
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* PWA Install Button */}
              <PwaInstallPrompt />

              {/* Offline Readiness Badge */}
              <OfflineReadyBadge />

              {/* Sync status */}
              <SyncStatusIndicator />

              {/* User Switcher */}
              <UserSwitcher />

              {/* Theme toggle */}
              <button
                onClick={() => useUIStore.getState().setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label={resolvedTheme === 'dark' ? '切換至淺色模式' : '切換至深色模式'}
              >
                {resolvedTheme === 'dark' ? (
                  <SunIcon className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <MoonIcon className="w-5 h-5" aria-hidden="true" />
                )}
              </button>

              {/* Kiosk mode toggle */}
              {hasRole(['admin', 'sysadmin']) && (
                <button
                  onClick={() => useUIStore.getState().setKioskMode(!kioskMode)}
                  className={`p-2 rounded-lg transition-colors ${
                    kioskMode ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  aria-label={kioskMode ? '退出 Kiosk 模式' : '進入 Kiosk 模式'}
                  aria-pressed={kioskMode}
                >
                  <MonitorIcon className="w-5 h-5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto print:p-0 print:overflow-visible">
          <Outlet />
        </main>
        <PwaUpdateToast />
      </div>
    </div>
  );
}

// Icon components
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function PillIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.734-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}