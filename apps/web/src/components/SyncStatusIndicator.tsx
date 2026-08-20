import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSyncStore } from '@/stores/syncStore';

function statusClasses({
  hasConflict,
  isSyncing,
  pendingChanges,
}: {
  hasConflict: boolean;
  isSyncing: boolean;
  pendingChanges: number;
}) {
  if (hasConflict) {
    return {
      dot: 'bg-danger-500',
      badge: 'bg-danger-50 text-danger-700',
      text: '衝突中',
      detail: `衝突 ${pendingChanges} 筆`,
    };
  }

  if (isSyncing || pendingChanges > 0) {
    return {
      dot: 'bg-warning-500',
      badge: 'bg-warning-50 text-warning-700',
      text: isSyncing ? '同步中' : '待同步',
      detail: pendingChanges > 0 ? `${pendingChanges} 筆待同步` : '同步處理中',
    };
  }

  return {
    dot: 'bg-success-500',
    badge: 'bg-success-50 text-success-700',
    text: '已同步',
    detail: '資料最新',
  };
}

export function SyncStatusIndicator() {
  const [expanded, setExpanded] = useState(false);
  const { isOnline, isSyncing, pendingChanges, conflicts, lastSyncedAt } = useSyncStore();

  const pendingConflicts = useMemo(
    () => conflicts.filter((conflict) => conflict.status === 'Pending'),
    [conflicts]
  );

  const hasConflict = pendingConflicts.length > 0;

  const visual = statusClasses({
    hasConflict,
    isSyncing,
    pendingChanges: hasConflict ? pendingConflicts.length : pendingChanges,
  });

  return (
    <div className="relative">
      <button
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${visual.badge}`}
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-label="同步狀態"
      >
        <span className={`w-2 h-2 rounded-full ${visual.dot} ${isSyncing ? 'animate-pulse' : ''}`} />
        <span className="text-xs font-medium">{isOnline ? visual.text : '離線'}</span>
      </button>

      {expanded && (
        <div className="absolute right-0 mt-2 w-72 card z-30">
          <div className="card-body space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">同步狀態</p>
              <span className={`badge ${isOnline ? 'badge-success' : 'badge-danger'}`}>
                {isOnline ? '線上' : '離線'}
              </span>
            </div>

            <div className="text-sm text-gray-600">
              <p>{visual.detail}</p>
              <p className="text-xs text-gray-500 mt-1">
                最後同步：{lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('zh-TW') : '尚未同步'}
              </p>
            </div>

            {hasConflict && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger-700 font-medium">有 {pendingConflicts.length} 筆衝突待處理</p>
                <div className="mt-2">
                  <Link to="/sync/conflicts" className="text-sm text-primary-600 hover:underline" onClick={() => setExpanded(false)}>
                    前往衝突中心 →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
