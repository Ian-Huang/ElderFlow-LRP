import { useAuthStore } from '@/stores/authStore';
import { Link } from 'react-router-dom';

export function CareRecordsPage() {
  const { hasRole } = useAuthStore();
  const canCreate = hasRole(['caregiver', 'supervisor', 'admin', 'sysadmin']);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">日常照護記錄</h1>
          <p className="text-gray-500 mt-1">記錄與查看住民的日常照護活動</p>
        </div>
        {canCreate && (
          <Link to="/care-records/new" className="btn-primary">
            <PlusIcon className="w-5 h-5" aria-hidden="true" />
            新增記錄
          </Link>
        )}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="text-center py-12">
            <ClipboardIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" aria-hidden="true" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">照護記錄功能待實作</h3>
            <p className="text-gray-500 mb-6">此頁面將包含：</p>
            <div className="text-left max-w-md mx-auto space-y-2 text-gray-600">
              <p>• 照護記錄列表（支援篩選、搜尋）</p>
              <p>• 新增/編輯照護記錄表單</p>
              <p>• 生命徵象輸入</p>
              <p>• 完成度評分顯示</p>
              <p>• 24小時鎖定狀態指示</p>
              <p>• 補充修正案功能</p>
              <p>• 離線建立與同步</p>
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

function ClipboardIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
}