import { useState, useEffect } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function isIosSafari(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
  const isStandalone =
    (navigator as unknown as { standalone?: boolean }).standalone ||
    Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches);

  return Boolean(isIos && isSafari && !isStandalone);
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches) ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export interface PwaInstallPromptProps {
  className?: string;
  buttonClassName?: string;
  showText?: boolean;
}

export function PwaInstallPrompt({
  className = '',
  buttonClassName = '',
  showText = true,
}: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosModal, setShowIosModal] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check standalone mode or previous install marker
    if (isStandaloneDisplay() || localStorage.getItem('pwa-installed') === 'true') {
      setIsInstalled(true);
      return;
    }

    // 2. Check iOS Safari environment
    if (isIosSafari()) {
      setIsIos(true);
    }

    // 3. Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem('pwa-installed', 'true');
      } catch {
        // ignore
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        try {
          localStorage.setItem('pwa-installed', 'true');
        } catch {
          // ignore
        }
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.warn('Install prompt error:', error);
    }
  };

  // If installed or cannot install (neither Android/Desktop prompt nor iOS), do not render
  if (isInstalled || (!deferredPrompt && !isIos)) {
    return null;
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${buttonClassName}`}
        aria-label="安裝應用程式"
        title="安裝為桌面/行動端應用程式"
      >
        <svg
          className="w-4 h-4 flex-shrink-0 text-primary-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        {showText && <span>安裝應用程式</span>}
      </button>

      {/* iOS Safari Installation Guide Modal */}
      {showIosModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>

            <h3 id="ios-install-title" className="text-lg font-bold text-gray-900 mb-2">
              在 iOS 安裝 LRP 應用程式
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              iOS Safari 尚未支援自動彈窗，請透過下列簡單步驟加入主畫面：
            </p>

            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6 text-sm text-gray-700">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  點擊 Safari 底部工具列的<strong>「分享」按鈕</strong> (
                  <svg className="inline w-4 h-4 text-primary-600 align-text-bottom" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  )
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  向下滾動並選擇<strong>「加入主畫面」</strong> (Add to Home Screen)
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  點擊右上角的<strong>「新增」</strong>即可完成安裝
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-sm"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
