import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';

export function DashboardPage() {
  const { user } = useAuthStore();
  const { isOnline, conflicts } = useSyncStore();
  const pendingConflicts = conflicts.filter((c) => c.status === 'Pending').length;

  const stats = [
    { label: '住民總數', value: '26', icon: UsersIcon, color: 'primary' },
    { label: '今日照護記錄', value: '18', icon: ClipboardIcon, color: 'success' },
    { label: '藥物低庫存警示', value: '3', icon: AlertIcon, color: 'warning' },
    { label: '待處理衝突', value: pendingConflicts.toString(), icon: AlertCircleIcon, color: pendingConflicts > 0 ? 'danger' : 'success' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">儀表板</h1>
          <p className="text-gray-500 mt-1">歡迎回來，{user?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${isOnline ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'}`}>
            {isOnline ? '線上' : '離線'}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-${stat.color}-100`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">快速操作</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <a href="/residents" className="btn-secondary w-full justify-start gap-3 p-4 hover:bg-gray-50">
              <UsersIcon className="w-6 h-6 text-gray-500" aria-hidden="true" />
              <span className="font-medium">新增住民</span>
            </a>
            <a href="/care-records" className="btn-secondary w-full justify-start gap-3 p-4 hover:bg-gray-50">
              <ClipboardIcon className="w-6 h-6 text-gray-500" aria-hidden="true" />
              <span className="font-medium">記錄照護</span>
            </a>
            <a href="/medications" className="btn-secondary w-full justify-start gap-3 p-4 hover:bg-gray-50">
              <PillIcon className="w-6 h-6 text-gray-500" aria-hidden="true" />
              <span className="font-medium">給藥記錄</span>
            </a>
            <a href="/care-plans" className="btn-secondary w-full justify-start gap-3 p-4 hover:bg-gray-50">
              <DocumentIcon className="w-6 h-6 text-gray-500" aria-hidden="true" />
              <span className="font-medium">照護計畫</span>
            </a>
          </div>
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">近期活動</h2>
          <a href="/care-records" className="text-sm text-primary-600 hover:underline">查看全部</a>
        </div>
        <div className="card-body">
          <div className="text-center py-8 text-gray-500">
            <ClipboardIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden="true" />
            <p>暫無近期活動記錄</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}

function ClipboardIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
}

function PillIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.734-.988-2.386l-.548-.547z" /></svg>;
}

function DocumentIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}

function AlertIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
}

function AlertCircleIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
}