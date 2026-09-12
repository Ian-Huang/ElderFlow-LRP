import { useState, useEffect } from 'react';
import { onPwaUpdateAvailable, isFormEditingActive } from '@/utils/pwa';

export interface PwaUpdateToastProps {
  className?: string;
}

export function PwaUpdateToast({ className = '' }: PwaUpdateToastProps) {
  const [showToast, setShowToast] = useState<boolean>(false);
  const [reloadHandler, setReloadHandler] = useState<(() => Promise<void>) | null>(null);
  const [showEditingWarning, setShowEditingWarning] = useState<boolean>(false);
  const [isReloading, setIsReloading] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onPwaUpdateAvailable((reloadFn) => {
      setReloadHandler(() => reloadFn);
      setShowToast(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRefreshClick = async () => {
    // Check if user is actively typing in a form to prevent disruptive reloads
    if (isFormEditingActive()) {
      setShowEditingWarning(true);
      return;
    }

    await executeReload();
  };

  const executeReload = async () => {
    setIsReloading(true);
    try {
      if (reloadHandler) {
        await reloadHandler();
      } else if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.warn('Reload execution error:', error);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  const handleDismiss = () => {
    setShowToast(false);
    setShowEditingWarning(false);
  };

  if (!showToast) {
    return null;
  }

  return (
    <aside
      className={`fixed bottom-5 right-5 z-50 max-w-md w-full sm:w-auto bg-white border border-primary-200 rounded-2xl shadow-2xl p-4 transition-all duration-300 ease-in-out ${className}`}
      role="status"
      aria-live="polite"
      aria-label="系統更新提示"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">系統版本更新</h4>
          <p className="text-xs text-gray-600 mt-0.5">
            新版本已就緒，點擊重新整理即可套用最新功能
          </p>

          {showEditingWarning && (
            <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <p className="font-semibold">⚠️ 偵測到您目前正在編輯表單</p>
              <p className="mt-0.5">立即重新整理可能遺失未儲存的輸入內容。是否確定要強制更新？</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={executeReload}
                  disabled={isReloading}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-xs transition-colors"
                >
                  {isReloading ? '更新中...' : '仍要更新'}
                </button>
                <button
                  onClick={() => setShowEditingWarning(false)}
                  className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-medium rounded text-xs transition-colors"
                >
                  先去儲存
                </button>
              </div>
            </div>
          )}

          {!showEditingWarning && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleRefreshClick}
                disabled={isReloading}
                className="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-xs transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {isReloading ? '更新中...' : '重新整理'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-xs transition-colors"
              >
                稍後
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
          aria-label="關閉提示"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
