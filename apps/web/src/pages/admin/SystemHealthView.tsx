import { useState, useEffect, useCallback } from 'react';
import type { SystemHealthReport } from '@lrp/shared';
import { apiClient } from '@/api/apiClient';

export function SystemHealthView() {
  const [healthData, setHealthData] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<SystemHealthReport>('/system/health');
      if (res.data) {
        setHealthData(res.data);
        setLastUpdated(new Date().toLocaleTimeString('zh-TW'));
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '無法取得系統健康報告';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days} 天 ${hours} 小時 ${minutes} 分鐘`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusBadge = (status?: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-success-50 text-success-700 border border-success-200">
            <span className="w-2.5 h-2.5 rounded-full bg-success-500 animate-pulse" />
            系統健康 (Healthy)
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-warning-50 text-warning-700 border border-warning-200">
            <span className="w-2.5 h-2.5 rounded-full bg-warning-500 animate-pulse" />
            服務降級 (Degraded)
          </span>
        );
      case 'unhealthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-danger-50 text-danger-700 border border-danger-200">
            <span className="w-2.5 h-2.5 rounded-full bg-danger-500 animate-pulse" />
            系統異常 (Unhealthy)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Overview */}
      <div className="card">
        <div className="card-body flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">即時運作狀態</p>
              {healthData && getStatusBadge(healthData.status)}
            </div>
            {lastUpdated && (
              <div className="border-l border-gray-200 pl-4 text-xs text-gray-500">
                最後更新：{lastUpdated}
              </div>
            )}
          </div>

          <button
            onClick={fetchHealth}
            disabled={loading}
            className="btn-primary flex items-center justify-center gap-2 text-sm self-start sm:self-auto"
            aria-label="立即檢測"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '檢測中...' : '立即檢測'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 text-danger-700 rounded-xl text-sm" role="alert">
          {error}
        </div>
      )}

      {loading && !healthData ? (
        <div className="card p-12 text-center text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-3" />
          <p>正在收集各項系統與底層服務指標...</p>
        </div>
      ) : healthData ? (
        <>
          {/* Services Grid */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">核心服務與底層模組狀態</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* API Server */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">後端 API 伺服器</span>
                  <span
                    className={`badge ${
                      healthData.services.api.status === 'up' ? 'badge-success' : 'badge-danger'
                    }`}
                  >
                    {healthData.services.api.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {healthData.services.api.latencyMs} <span className="text-sm font-normal text-gray-500">ms</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">回應延遲 (Latency)</p>
              </div>

              {/* Database */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">主要資料庫 (PostgreSQL)</span>
                  <span
                    className={`badge ${
                      healthData.services.database.status === 'up' ? 'badge-success' : 'badge-danger'
                    }`}
                  >
                    {healthData.services.database.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {healthData.services.database.latencyMs} <span className="text-sm font-normal text-gray-500">ms</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">查詢往返時間 (Roundtrip)</p>
              </div>

              {/* Service Worker */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Service Worker (PWA)</span>
                  <span
                    className={`badge ${
                      healthData.services.serviceWorker.status === 'active' ? 'badge-success' : 'badge-warning'
                    }`}
                  >
                    {healthData.services.serviceWorker.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <p className="text-lg font-bold font-mono text-gray-900">
                  {healthData.services.serviceWorker.version}
                </p>
                <p className="text-xs text-gray-400 mt-1">離線快取控制版本</p>
              </div>

              {/* IndexedDB */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">本地 IndexedDB</span>
                  <span
                    className={`badge ${
                      healthData.services.indexedDb.status === 'connected' ? 'badge-success' : 'badge-danger'
                    }`}
                  >
                    {healthData.services.indexedDb.status === 'connected' ? 'CONNECTED' : 'ERROR'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatBytes(healthData.services.indexedDb.sizeEstimateBytes)}
                </p>
                <p className="text-xs text-gray-400 mt-1">預估本機儲存佔用</p>
              </div>
            </div>
          </div>

          {/* Metrics Section */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">運算資源負載與持續時間</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CPU Load */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">CPU 負載使用率</span>
                  <span className="text-sm font-bold text-gray-900">{healthData.metrics.cpuLoadPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mt-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      healthData.metrics.cpuLoadPercentage >= 80
                        ? 'bg-danger-500'
                        : healthData.metrics.cpuLoadPercentage >= 60
                        ? 'bg-warning-500'
                        : 'bg-primary-600'
                    }`}
                    style={{ width: `${Math.min(100, healthData.metrics.cpuLoadPercentage)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">目前伺服器工作負載情況</p>
              </div>

              {/* Memory Usage */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">記憶體使用量</span>
                  <span className="text-sm font-bold text-gray-900">{healthData.metrics.memoryUsageMb} MB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mt-3">
                  <div
                    className="h-3 rounded-full bg-primary-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (healthData.metrics.memoryUsageMb / 1024) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">Node.js 程序記憶體分派量</p>
              </div>

              {/* Uptime */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">系統連續運行時間 (Uptime)</span>
                </div>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatUptime(healthData.uptimeSeconds)}
                </p>
                <p className="text-xs text-gray-400 mt-2">自上次重啟至今累積時間</p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
