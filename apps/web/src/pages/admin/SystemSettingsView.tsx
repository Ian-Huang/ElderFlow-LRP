import { useState, useEffect, useCallback } from 'react';
import type { SystemSettings } from '@lrp/shared';
import { apiClient } from '@/api/apiClient';

export function SystemSettingsView() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'security'; message: string } | null>(null);

  // Form local state
  const [syncIntervalSeconds, setSyncIntervalSeconds] = useState<number>(30);
  const [lockDurationHours, setLockDurationHours] = useState<number>(24);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(15);
  const [pdfFont, setPdfFont] = useState<string>('Noto Sans TC');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<SystemSettings>('/system/settings');
      if (res.data) {
        setSettings(res.data);
        setSyncIntervalSeconds(res.data.syncIntervalSeconds);
        setLockDurationHours(res.data.lockDurationHours);
        setLowStockThreshold(res.data.lowStockThreshold);
        setPdfFont(res.data.pdfFont || 'Noto Sans TC');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '無法載入系統參數設定';
      setAlert({
        type: 'error',
        message: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (isNaN(syncIntervalSeconds) || syncIntervalSeconds < 10 || syncIntervalSeconds > 300) {
      errors.syncIntervalSeconds = '背景同步間隔必須介於 10 至 300 秒之間';
    }

    if (isNaN(lockDurationHours) || lockDurationHours < 1 || lockDurationHours > 72) {
      errors.lockDurationHours = '記錄鎖定時長必須介於 1 至 72 小時之間';
    }

    if (isNaN(lowStockThreshold) || lowStockThreshold < 1 || lowStockThreshold > 100) {
      errors.lowStockThreshold = '低庫存警示閾值必須介於 1 至 100 之間';
    }

    if (!pdfFont || !pdfFont.trim()) {
      errors.pdfFont = '請選擇或指定 PDF 輸出字體';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<SystemSettings> = {
        syncIntervalSeconds,
        lockDurationHours,
        lowStockThreshold,
        pdfFont,
      };

      const res = await apiClient.patch<SystemSettings>('/system/settings', payload);
      if (res.data) {
        setSettings(res.data);
        setAlert({
          type: 'success',
          message: '系統核心參數已成功更新並儲存！',
        });
      }
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string } | null;
      const isCsrf = apiErr?.code === 'CSRF_INVALID' || apiErr?.message?.includes('CSRF');
      setAlert({
        type: isCsrf ? 'security' : 'error',
        message: isCsrf
          ? '安全性警示：CSRF 驗證失敗 (403 Forbidden)，設定儲存已被拒絕'
          : apiErr?.message || '儲存系統設定時發生錯誤',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setSyncIntervalSeconds(settings.syncIntervalSeconds);
      setLockDurationHours(settings.lockDurationHours);
      setLowStockThreshold(settings.lowStockThreshold);
      setPdfFont(settings.pdfFont || 'Noto Sans TC');
      setFormErrors({});
      setAlert(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {alert && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-sm flex items-center justify-between ${
            alert.type === 'success'
              ? 'bg-success-50 border border-success-200 text-success-700'
              : alert.type === 'security'
              ? 'bg-danger-100 border-2 border-danger-500 text-danger-900 font-semibold'
              : 'bg-danger-50 border border-danger-200 text-danger-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-success-600 flex-shrink-0" />}
            {alert.type === 'security' && <ShieldWarningIcon className="w-5 h-5 text-danger-600 flex-shrink-0" />}
            {alert.type === 'error' && <XCircleIcon className="w-5 h-5 text-danger-600 flex-shrink-0" />}
            <span>{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-xs underline hover:opacity-75 ml-4">
            關閉
          </button>
        </div>
      )}

      {/* Main Form */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">核心參數設定</h2>
            <p className="text-xs text-gray-500 mt-0.5">控制離線同步週期、資料鎖定視窗與全機構報表字體標準</p>
          </div>
          {settings && (
            <div className="text-right text-xs text-gray-400">
              <div>最後變更：{formatDateTime(settings.updatedAt)}</div>
              <div>維護人員：{settings.updatedBy}</div>
            </div>
          )}
        </div>

        <div className="card-body">
          {loading ? (
            <div className="py-12 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mb-2" />
              <p>載入系統參數中...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} noValidate className="space-y-6 max-w-2xl">
              {/* Field 1: Sync Interval */}
              <div>
                <label className="label">
                  背景同步間隔 (秒) *
                  <span className="text-xs font-normal text-gray-400 ml-2">有效範圍：10 ~ 300 秒</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={isNaN(syncIntervalSeconds) ? '' : syncIntervalSeconds}
                    onChange={(e) => setSyncIntervalSeconds(e.target.value === '' ? Number.NaN : parseInt(e.target.value, 10))}
                    className={`input max-w-xs ${formErrors.syncIntervalSeconds ? 'border-danger-500' : ''}`}
                    aria-label="背景同步間隔"
                  />
                  <span className="text-sm text-gray-500">秒</span>
                </div>
                {formErrors.syncIntervalSeconds ? (
                  <p className="text-danger-600 text-xs mt-1">{formErrors.syncIntervalSeconds}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">前端離線同步引擎排程檢查後端更新的時間間隔</p>
                )}
              </div>

              {/* Field 2: Lock Duration */}
              <div>
                <label className="label">
                  24hr 記錄鎖定時長 (小時) *
                  <span className="text-xs font-normal text-gray-400 ml-2">有效範圍：1 ~ 72 小時</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={72}
                    value={isNaN(lockDurationHours) ? '' : lockDurationHours}
                    onChange={(e) => setLockDurationHours(e.target.value === '' ? Number.NaN : parseInt(e.target.value, 10))}
                    className={`input max-w-xs ${formErrors.lockDurationHours ? 'border-danger-500' : ''}`}
                    aria-label="記錄鎖定時長"
                  />
                  <span className="text-sm text-gray-500">小時</span>
                </div>
                {formErrors.lockDurationHours ? (
                  <p className="text-danger-600 text-xs mt-1">{formErrors.lockDurationHours}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">照護與用藥記錄提交超過此時限後將自動凍結，僅主管與管理員可解鎖</p>
                )}
              </div>

              {/* Field 3: Low Stock Threshold */}
              <div>
                <label className="label">
                  低庫存警示閾值 (低於此數值觸發警示) *
                  <span className="text-xs font-normal text-gray-400 ml-2">有效範圍：1 ~ 100 單位 (預設 15)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={isNaN(lowStockThreshold) ? '' : lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value === '' ? Number.NaN : parseInt(e.target.value, 10))}
                    className={`input max-w-xs ${formErrors.lowStockThreshold ? 'border-danger-500' : ''}`}
                    aria-label="低庫存警示閾值"
                  />
                  <span className="text-sm text-gray-500">劑 / 份</span>
                </div>
                {formErrors.lowStockThreshold ? (
                  <p className="text-danger-600 text-xs mt-1">{formErrors.lowStockThreshold}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">藥物或耗材存量低於此閾值時，報表中心與儀表板將標示黃標預警</p>
                )}
              </div>

              {/* Field 4: PDF Font */}
              <div>
                <label className="label">
                  PDF 匯出字體設定 *
                  <span className="text-xs font-normal text-gray-400 ml-2">指定繁體中文排版預設字型</span>
                </label>
                <select
                  value={pdfFont}
                  onChange={(e) => setPdfFont(e.target.value)}
                  className={`input max-w-xs ${formErrors.pdfFont ? 'border-danger-500' : ''}`}
                  aria-label="PDF 字體設定"
                >
                  <option value="Noto Sans TC">思源黑體 (Noto Sans TC)</option>
                  <option value="Microsoft JhengHei">微軟正黑體 (Microsoft JhengHei)</option>
                  <option value="PingFang TC">蘋方繁體 (PingFang TC)</option>
                  <option value="Noto Serif TC">思源宋體 (Noto Serif TC)</option>
                </select>
                {formErrors.pdfFont ? (
                  <p className="text-danger-600 text-xs mt-1">{formErrors.pdfFont}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">PDF 統一匯出引擎生成報表時嵌入的開源中文字體</p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                  aria-label="儲存設定"
                >
                  {saving ? '儲存中...' : '儲存變更'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="btn-secondary"
                  aria-label="重設設定"
                >
                  復原
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// Icons
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ShieldWarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
