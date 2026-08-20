import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { offlineDb } from '@/utils/offlineDb';
import { resolveSyncConflict, triggerSyncNow } from '@/utils/syncEngine';
import { useSyncStore, type AppSyncConflict } from '@/stores/syncStore';

function conflictSeverityBadge(conflict: AppSyncConflict) {
  if (conflict.isCritical) {
    return 'badge-danger';
  }

  return 'badge-warning';
}

function formatJson(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

export function SyncConflictsPage() {
  const conflicts = useSyncStore((state) => state.conflicts);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const pendingConflicts = useMemo(
    () => conflicts.filter((conflict) => conflict.status === 'Pending'),
    [conflicts]
  );

  const selected = useMemo(
    () => pendingConflicts.find((conflict) => conflict.conflictId === selectedConflictId) || pendingConflicts[0],
    [pendingConflicts, selectedConflictId]
  );

  const handleResolve = async (action: 'accept-server' | 'keep-local' | 'manual-merge') => {
    if (!selected) return;

    setIsResolving(true);
    try {
      const mergedData =
        action === 'manual-merge'
          ? {
              ...selected.serverData,
              ...selected.localData,
              mergedAt: new Date().toISOString(),
            }
          : undefined;

      await resolveSyncConflict(selected.conflictId, action, mergedData);

      const nextPending = await offlineDb.SyncConflicts.where('status').equals('Pending').toArray();
      setSelectedConflictId(nextPending[0]?.conflictId ?? null);

      await triggerSyncNow();
    } finally {
      setIsResolving(false);
    }
  };

  if (pendingConflicts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">同步衝突中心</h1>
            <p className="text-gray-500 mt-1">管理雲端與本地離線資料衝突</p>
          </div>
          <button className="btn-secondary" onClick={() => void triggerSyncNow()}>
            重新同步
          </button>
        </div>

        <div className="card">
          <div className="card-body py-12 text-center">
            <p className="text-lg font-medium text-gray-900">目前沒有待處理衝突</p>
            <p className="text-gray-500 mt-2">所有本地資料已與雲端一致。</p>
            <div className="mt-6">
              <Link className="btn-primary" to="/settings">
                返回系統設定
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">同步衝突中心</h1>
          <p className="text-gray-500 mt-1">共 {pendingConflicts.length} 筆待處理衝突</p>
        </div>
        <div className="flex gap-2">
          <Link className="btn-secondary" to="/settings">
            返回設定
          </Link>
          <button className="btn-primary" onClick={() => void triggerSyncNow()}>
            手動同步
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <aside className="card lg:col-span-1">
          <div className="card-header">
            <h2 className="text-base font-semibold text-gray-900">衝突清單</h2>
          </div>
          <div className="card-body p-0">
            <ul className="divide-y divide-gray-200">
              {pendingConflicts.map((conflict) => {
                const active = selected?.conflictId === conflict.conflictId;
                return (
                  <li key={conflict.conflictId}>
                    <button
                      className={`w-full text-left p-4 transition-colors ${
                        active ? 'bg-primary-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedConflictId(conflict.conflictId)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-gray-900 truncate">{conflict.recordType} · {conflict.recordId}</p>
                        <span className={conflictSeverityBadge(conflict)}>
                          {conflict.isCritical ? '關鍵' : '一般'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">{conflict.conflictingFields.join(', ')}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <section className="card lg:col-span-2">
          {selected ? (
            <>
              <div className="card-header flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{selected.recordType} · {selected.recordId}</h2>
                  <p className="text-xs text-gray-500 mt-1">衝突欄位：{selected.conflictingFields.join(', ')}</p>
                </div>
                <span className={conflictSeverityBadge(selected)}>
                  {selected.isCritical ? '需立即處理' : '可稍後處理'}
                </span>
              </div>

              <div className="card-body space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">雲端版本</h3>
                    <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-3 overflow-auto max-h-72">
                      {formatJson(selected.serverData)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">本地版本</h3>
                    <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-3 overflow-auto max-h-72">
                      {formatJson(selected.localData)}
                    </pre>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                  <button
                    className="btn-secondary"
                    onClick={() => void handleResolve('accept-server')}
                    disabled={isResolving}
                  >
                    接受雲端
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => void handleResolve('keep-local')}
                    disabled={isResolving}
                  >
                    保留本地
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => void handleResolve('manual-merge')}
                    disabled={isResolving}
                  >
                    手動合併
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="card-body py-10 text-center text-gray-500">請先選擇一筆衝突</div>
          )}
        </section>
      </div>
    </div>
  );
}
