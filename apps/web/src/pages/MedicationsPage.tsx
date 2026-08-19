import { useAuthStore } from '@/stores/authStore';
import { Link } from 'react-router-dom';

export function MedicationsPage() {
  const { hasRole } = useAuthStore();
  const canCreate = hasRole(['caregiver', 'supervisor', 'admin', 'sysadmin']);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">藥物管理</h1>
          <p className="text-gray-500 mt-1">管理住民藥物資訊、給藥記錄與庫存</p>
        </div>
        {canCreate && (
          <Link to="/medications/new" className="btn-primary">
            <PlusIcon className="w-5 h-5" aria-hidden="true" />
            新增藥物
          </Link>
        )}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="text-center py-12">
            <PillIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" aria-hidden="true" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">藥物管理功能待實作</h3>
            <p className="text-gray-500 mb-6">此頁面將包含：</p>
            <div className="text-left max-w-md mx-auto space-y-2 text-gray-600">
              <p>• 藥物主檔列表（支援篩選、搜尋）</p>
              <p>• 新增/編輯藥物資訊</p>
              <p>• 給藥時間表與提醒</p>
              <p>• 庫存追蹤與低庫存警示 (≤15)</p>
              <p>• 給藥記錄與狀態記錄</p>
              <p>• 離線給藥與同步</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
}

function PillIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.734-.988-2.386l-.548-.547z" /></svg>;
}