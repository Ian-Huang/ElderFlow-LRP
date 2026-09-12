import { useState, useEffect, useCallback } from 'react';
import { checkOfflineDbReady } from '@/utils/offlineDb';
import { onPwaOfflineReady } from '@/utils/pwa';

export interface OfflineReadinessResult {
  isReady: boolean;
  swActive: boolean;
  cacheReady: boolean;
  idbReady: boolean;
}

/**
 * Perform comprehensive offline readiness audit:
 * 1. Service Worker active
 * 2. Static assets cache initialized
 * 3. IndexedDB initialized and responsive
 */
export async function checkOfflineReadiness(): Promise<OfflineReadinessResult> {
  let swActive = false;
  let cacheReady = false;
  let idbReady = false;

  // 1. Check Service Worker
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    if (navigator.serviceWorker.controller !== null) {
      swActive = true;
    } else {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.active) {
          swActive = true;
        }
      } catch {
        swActive = false;
      }
    }
  }

  // 2. Check Static Assets Cache
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await window.caches.keys();
      // Any cache exists (e.g. static-cache, workbox-precache, etc.)
      cacheReady = keys.length > 0;
    } catch {
      cacheReady = false;
    }
  } else {
    // If caches API is not supported in current environment, fallback to true if in browser
    cacheReady = typeof window !== 'undefined';
  }

  // 3. Check IndexedDB
  idbReady = await checkOfflineDbReady();

  // If SW hasn't activated yet in dev or test mode, check if flagged as offline ready previously
  if (!swActive && typeof window !== 'undefined' && window.localStorage) {
    if (window.localStorage.getItem('pwa-offline-ready') === 'true') {
      swActive = true;
    }
  }

  const isReady = swActive && cacheReady && idbReady;

  return {
    isReady,
    swActive,
    cacheReady,
    idbReady,
  };
}

export interface OfflineReadyBadgeProps {
  className?: string;
  showWhenNotReady?: boolean;
}

export function OfflineReadyBadge({
  className = '',
  showWhenNotReady = false,
}: OfflineReadyBadgeProps) {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [readiness, setReadiness] = useState<OfflineReadinessResult>({
    isReady: false,
    swActive: false,
    cacheReady: false,
    idbReady: false,
  });

  const evaluateReadiness = useCallback(async () => {
    const result = await checkOfflineReadiness();
    setReadiness(result);
    if (result.isReady && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('pwa-offline-ready', 'true');
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    void evaluateReadiness();

    const handleOnline = () => {
      setIsOnline(true);
      void evaluateReadiness();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = onPwaOfflineReady(() => {
      void evaluateReadiness();
    });

    // Check periodically in case SW or cache finished initial precaching
    const timer = setInterval(() => {
      void evaluateReadiness();
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      clearInterval(timer);
    };
  }, [evaluateReadiness]);

  // When device is offline
  if (!isOnline) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 shadow-sm ${className}`}
        role="status"
        aria-label="離線模式中 (可正常作業)"
        title="目前處於離線狀態，本系統支援離線優先，所有操作已儲存於本地並將於重新連線後自動同步"
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span>離線模式中 (可正常作業)</span>
      </div>
    );
  }

  // When device is online and fully offline ready
  if (readiness.isReady) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm ${className}`}
        role="status"
        aria-label="離線就緒"
        title="離線就緒：Service Worker 運作中、靜態快取完成、本地資料庫已連線"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>離線就緒</span>
      </div>
    );
  }

  // Not yet ready
  if (showWhenNotReady) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200 ${className}`}
        role="status"
        aria-label="離線準備中"
        title="離線資源準備中..."
      >
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-ping" />
        <span>離線準備中</span>
      </div>
    );
  }

  return null;
}
