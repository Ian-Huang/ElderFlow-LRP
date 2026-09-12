import { useState, useEffect, useCallback } from 'react';
import type { FeatureFlag } from '@lrp/shared';
import { apiClient } from '@/api/apiClient';

export function FeatureFlagsView() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'security'; message: string } | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<FeatureFlag[]>('/system/feature-flags');
      if (res.data) {
        setFlags(res.data);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '無法取得功能旗標清單';
      setNotification({
        type: 'error',
        message: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Handle Switch Toggle (enabled / disabled)
  const handleToggleEnabled = async (flagId: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    const originalFlags = [...flags];

    // Optimistic update
    setFlags((prev) =>
      prev.map((f) => (f.id === flagId ? { ...f, enabled: nextEnabled } : f))
    );

    try {
      const res = await apiClient.patch<FeatureFlag>(`/system/feature-flags/${flagId}`, {
        enabled: nextEnabled,
      });
      if (res.data) {
        setNotification({
          type: 'success',
          message: `功能旗標「${res.data.name}」已${nextEnabled ? '啟用' : '停用'}`,
        });
      }
    } catch (err: unknown) {
      setFlags(originalFlags);
      const apiErr = err as { code?: string; message?: string } | null;
      const isCsrf = apiErr?.code === 'CSRF_INVALID' || apiErr?.message?.includes('CSRF');
      setNotification({
        type: isCsrf ? 'security' : 'error',
        message: isCsrf
          ? '安全性警示：CSRF 驗證失敗 (403 Forbidden)，旗標狀態變更已被拒絕'
          : apiErr?.message || '更新功能旗標失敗',
      });
    }
  };

  // Handle Rollout Percentage Update
  const handleRolloutChange = async (flagId: string, percentage: number) => {
    const originalFlags = [...flags];

    // Optimistic update
    setFlags((prev) =>
      prev.map((f) => (f.id === flagId ? { ...f, rolloutPercentage: percentage } : f))
    );

    try {
      const res = await apiClient.patch<FeatureFlag>(`/system/feature-flags/${flagId}`, {
        rolloutPercentage: percentage,
      });
      if (res.data) {
        setNotification({
          type: 'success',
          message: `功能旗標「${res.data.name}」灰度發布比例已調整為 ${percentage}%`,
        });
      }
    } catch (err: unknown) {
      setFlags(originalFlags);
      const apiErr = err as { code?: string; message?: string } | null;
      const isCsrf = apiErr?.code === 'CSRF_INVALID' || apiErr?.message?.includes('CSRF');
      setNotification({
        type: isCsrf ? 'security' : 'error',
        message: isCsrf
          ? '安全性警示：CSRF 驗證失敗 (403 Forbidden)，灰度比例變更已被拒絕'
          : apiErr?.message || '更新灰度百分比失敗',
      });
    }
  };

  const getEnvBadge = (env: FeatureFlag['environment']) => {
    switch (env) {
      case 'production':
        return <span className="badge-danger">Production</span>;
      case 'staging':
        return <span className="badge-warning">Staging</span>;
      case 'development':
        return <span className="badge-primary">Development</span>;
      case 'all':
      default:
        return <span className="badge-gray">All Envs</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast / Alert Notification */}
      {notification && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-sm flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-success-50 border border-success-200 text-success-700'
              : notification.type === 'security'
              ? 'bg-danger-100 border-2 border-danger-500 text-danger-900 font-semibold'
              : 'bg-danger-50 border border-danger-200 text-danger-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckIcon className="w-5 h-5 text-success-600 flex-shrink-0" />}
            {notification.type === 'security' && <ShieldAlertIcon className="w-5 h-5 text-danger-600 flex-shrink-0" />}
            {notification.type === 'error' && <AlertCircleIcon className="w-5 h-5 text-danger-600 flex-shrink-0" />}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs underline hover:opacity-75 ml-4"
          >
            關閉
          </button>
        </div>
      )}

      {/* Description Card */}
      <div className="card">
        <div className="card-body">
          <h2 className="text-lg font-semibold text-gray-900">功能旗標與灰度發布 (Feature Flags)</h2>
          <p className="text-sm text-gray-500 mt-1">
            透過旗標動態開啟或關閉新版功能，支援 0-100% 漸進式金絲雀灰度發布與環境隔離，無需重新部署前端應用。
          </p>
        </div>
      </div>

      {/* Flags List */}
      <div className="space-y-4">
        {loading ? (
          <div className="card p-12 text-center text-gray-500">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mb-2" />
            <p>載入功能旗標中...</p>
          </div>
        ) : flags.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">
            目前未設定任何功能旗標
          </div>
        ) : (
          flags.map((flag) => (
            <div key={flag.id} className="card hover:border-gray-300 transition-colors">
              <div className="card-body">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Flag metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-gray-900">{flag.name}</h3>
                      <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {flag.id}
                      </span>
                      {getEnvBadge(flag.environment)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1.5">{flag.description}</p>
                  </div>

                  {/* Right: Toggle switch */}
                  <div className="flex items-center gap-3 self-start md:self-auto">
                    <span className="text-sm font-medium text-gray-700">
                      {flag.enabled ? '已啟用' : '已停用'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flag.enabled}
                        onChange={() => handleToggleEnabled(flag.id, flag.enabled)}
                        className="sr-only peer"
                        aria-label={`切換 ${flag.name} 狀態`}
                      />
                      <div
                        className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-500 transition-colors ${
                          flag.enabled ? 'bg-primary-600' : 'bg-gray-300'
                        }`}
                      />
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                    </label>
                  </div>
                </div>

                {/* Rollout percentage slider */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 max-w-md">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>灰度發布涵蓋比例</span>
                      <span className="font-bold text-gray-900">{flag.rolloutPercentage}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={flag.rolloutPercentage}
                      onChange={(e) => handleRolloutChange(flag.id, parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                      aria-label={`${flag.name} 灰度發布滑桿`}
                    />
                  </div>

                  <div className="text-xs text-gray-400">
                    {flag.rolloutPercentage === 100
                      ? '全量開放給所有適用對象'
                      : flag.rolloutPercentage === 0
                      ? '僅具備特權測試身分可見'
                      : `隨機雜湊分流約 ${flag.rolloutPercentage}% 裝置`}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Icons
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
