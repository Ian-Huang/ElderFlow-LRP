import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  sidebarOpen: boolean;
  kioskMode: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setKioskMode: (enabled: boolean) => void;
  initializeTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      sidebarOpen: true,
      kioskMode: false,

      setTheme: (theme) => {
        set({ theme });
        get().initializeTheme();
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setKioskMode: (enabled) => {
        set({ kioskMode: enabled });
        if (enabled) {
          document.documentElement.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
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
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (_e) => {
    const { theme, initializeTheme } = useUIStore.getState();
    if (theme === 'system') {
      initializeTheme();
    }
  });
}