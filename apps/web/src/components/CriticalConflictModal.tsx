import { useMemo } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { resolveSyncConflict } from '@/utils/syncEngine';

export function CriticalConflictModal() {
  const conflicts = useSyncStore((state) => state.conflicts);

  const criticalConflict = useMemo(
    () =>
      conflicts.find(
        (conflict) =>
          conflict.status === 'Pending' &&
          'isCritical' in conflict &&
          Boolean((conflict as { isCritical?: boolean }).isCritical)
      ),
    [conflicts]
  );

  if (!criticalConflict) {
    return null;
  }

  const handleResolve = async (action: 'accept-server' | 'keep-local' | 'manual-merge') => {
    const mergedData =
      action === 'manual-merge'
        ? {
            ...criticalConflict.serverData,
            ...criticalConflict.localData,
            mergedAt: new Date().toISOString(),
          }
        : undefined;

    await resolveSyncConflict(criticalConflict.conflictId, action, mergedData);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl card border-danger-200">
        <div className="card-header border-danger-200 bg-danger-50">
          <h2 className="text-lg font-semibold text-danger-700">關鍵衝突必須先處理</h2>
          <p className="text-sm text-danger-600 mt-1">
            {criticalConflict.recordType} · {criticalConflict.recordId} 發生關鍵欄位衝突，處理前無法繼續操作。
          </p>
        </div>

        <div className="card-body space-y-4">
          <div className="text-sm text-gray-700">
            <p>衝突欄位：{criticalConflict.conflictingFields.join(', ')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">雲端版本</p>
              <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-3 overflow-auto max-h-56">
                {JSON.stringify(criticalConflict.serverData, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">本地版本</p>
              <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-3 overflow-auto max-h-56">
                {JSON.stringify(criticalConflict.localData, null, 2)}
              </pre>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
            <button className="btn-secondary" onClick={() => void handleResolve('accept-server')}>
              接受雲端
            </button>
            <button className="btn-secondary" onClick={() => void handleResolve('keep-local')}>
              保留本地
            </button>
            <button className="btn-primary" onClick={() => void handleResolve('manual-merge')}>
              手動合併
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
