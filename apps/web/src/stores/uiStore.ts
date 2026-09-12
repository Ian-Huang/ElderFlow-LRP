import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface WakeLockSentinelLike {
  release(): Promise<void>;
  addEventListener(type: string, listener: () => void): void;
}

interface NavigatorWithWakeLock {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinelLike>;
  };
}

let activeWakeLock: WakeLockSentinelLike | null = null;

export function checkUrlKioskParam(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('kiosk') === '1' || params.get('kiosk') === 'true';
  } catch {
    return false;
  }
}

interface UIState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  sidebarOpen: boolean;
  kioskMode: boolean;
  wakeLockActive: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setKioskMode: (enabled: boolean) => void;
  initializeTheme: () => void;
  requestWakeLock: () => Promise<boolean>;
  releaseWakeLock: () => Promise<void>;
  initKioskFromUrl: () => boolean;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      sidebarOpen: true,
      kioskMode: checkUrlKioskParam(),
      wakeLockActive: false,

      setTheme: (theme) => {
        set({ theme });
        get().initializeTheme();
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setKioskMode: (enabled) => {
        set({ kioskMode: enabled });
        if (enabled) {
          try {
            document.documentElement.requestFullscreen?.()?.catch?.(() => undefined);
          } catch {
            // ignore
          }
          void get().requestWakeLock();
        } else {
          try {
            if (document.fullscreenElement) {
              document.exitFullscreen?.()?.catch?.(() => undefined);
            }
          } catch {
            // ignore
          }
          void get().releaseWakeLock();
        }
      },

      requestWakeLock: async () => {
        const nav = typeof navigator !== 'undefined' ? (navigator as unknown as NavigatorWithWakeLock) : undefined;
        if (nav?.wakeLock) {
          try {
            const sentinel = await nav.wakeLock.request('screen');
            activeWakeLock = sentinel;
            set({ wakeLockActive: true });

            sentinel.addEventListener?.('release', () => {
              activeWakeLock = null;
              set({ wakeLockActive: false });
            });
            return true;
          } catch (err) {
            console.warn('Screen Wake Lock request failed:', err);
            set({ wakeLockActive: false });
            return false;
          }
        }
        return false;
      },

      releaseWakeLock: async () => {
        if (activeWakeLock) {
          try {
            await activeWakeLock.release();
          } catch {
            // ignore
          }
          activeWakeLock = null;
          set({ wakeLockActive: false });
        }
      },

      initKioskFromUrl: () => {
        const isKiosk = checkUrlKioskParam();
        if (isKiosk && !get().kioskMode) {
          get().setKioskMode(true);
          return true;
        }
        return false;
      },

      initializeTheme: () => {
        const { theme } = get();
        let resolved: 'light' | 'dark' = 'light';

        if (theme === 'system') {
          resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
          resolved = theme;
        }

        set({ resolvedTheme: resolved });
        document.documentElement.classList.toggle('dark', resolved === 'dark');
      },
    }),
    {
      name: 'lrp-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        kioskMode: state.kioskMode,
      }),
      onRehydrateStorage: () => (state) => {
        state?.initializeTheme();
        if (checkUrlKioskParam()) {
          state?.setKioskMode(true);
        } else if (state?.kioskMode) {
          // Re-request wake lock if kiosk mode was persisted
          void state?.requestWakeLock();
        }
      },
    }
  )
);

// Listen for visibility change to re-acquire wake lock if kioskMode is active
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const state = useUIStore.getState();
      if (state.kioskMode) {
        void state.requestWakeLock();
      }
    }
  });
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (_e) => {
    const { theme, initializeTheme } = useUIStore.getState();
    if (theme === 'system') {
      initializeTheme();
    }
  });
}