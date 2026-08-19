import { useAuthStore } from '@/stores/authStore';

export function ReportsPage() {
  const { hasRole } = useAuthStore();
  const canGenerate = hasRole(['supervisor', 'admin', 'sysadmin']);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">報表中心</h1>
          <p className="text-gray-500 mt-1">生成與查看各類照護報表</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { type: 'DailyCompletion', label: '每日照護完成報告', desc: '每日照護活動完成情況統計', icon: ClipboardIcon },
          { type: 'ResidentOverview', label: '住民狀態概覽', desc: '全體住民健康與照護需求總覽', icon: UsersIcon },
          { type: 'Alerts', label: '警示報表', desc: '異常事件、低庫存、合規違規彙整', icon: AlertIcon },
          { type: 'Audit', label: '稽核軌跡報表', desc: '所有資料異動完整追溯記錄', icon: ShieldIcon },
          { type: 'Compliance', label: '合規檢核報表', desc: '護理比例、夜班、工時、審閱期檢核', icon: CheckIcon },
          { type: 'KPI', label: '品質指標儀表板', desc: '跌倒率、壓傷率、非計畫性住院率', icon: ChartIcon },
        ].map((report) => (
          <div key={report.type} className="card hover:shadow-md transition-shadow cursor-pointer">
            <div className="card-body">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary-100 rounded-xl">
                  <report.icon className="w-6 h-6 text-primary-600" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900">{report.label}</h3>
                  <p className="text-sm text-gray-500 mt-1">{report.desc}</p>
                </div>
                {canGenerate && (
                  <button className="btn-primary text-sm py-1.5 px-3 self-start">
                    產生
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">最近生成的報表</h2>
        </div>
        <div className="card-body">
          <div className="text-center py-8 text-gray-500">
            <FileIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden="true" />
            <p>暫無報表記錄</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
}

function UsersIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}

function AlertIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
}

function ShieldIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}

function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}

function ChartIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}

function FileIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}