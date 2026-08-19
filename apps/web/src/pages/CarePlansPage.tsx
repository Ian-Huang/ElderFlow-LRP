import { useAuthStore } from '@/stores/authStore';
import { Link } from 'react-router-dom';

export function CarePlansPage() {
  const { hasRole } = useAuthStore();
  const canCreate = hasRole(['supervisor', 'admin', 'sysadmin']);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">照護計畫</h1>
          <p className="text-gray-500 mt-1">建立與管理住民的個人化照護計畫</p>
        </div>
        {canCreate && (
          <Link to="/care-plans/new" className="btn-primary">
            <PlusIcon className="w-5 h-5" aria-hidden="true" />
            新增計畫
          </Link>
        )}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="text-center py-12">
            <DocumentIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" aria-hidden="true" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">照護計畫功能待實作</h3>
            <p className="text-gray-500 mb-6">此頁面將包含：</p>
            <div className="text-left max-w-md mx-auto space-y-2 text-gray-600">
              <p>• 照護計畫列表（支援篩選、搜尋）</p>
              <p>• 新增/編輯照護計畫表單</p>
              <p>• 目標設定與進度追蹤</p>
              <p>• 服務項目與負責角色指派</p>
              <p>• 計畫狀態流轉 (草稿/執行中/完成/歸檔)</p>
              <p>• 複審日期提醒</p>
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

function DocumentIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}