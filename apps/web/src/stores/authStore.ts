import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, UserRole, SwitchableUser, AuthTokens } from '@lrp/shared';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  switchableUsers: SwitchableUser[];
  isInitialized: boolean;
  isAuthenticated: boolean;
  userRole: UserRole | null;

  // Actions
  setAuth: (tokens: AuthTokens, user: User) => void;
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  clearAuth: () => void;
  initializeAuth: () => Promise<void>;
  addSwitchableUser: (user: SwitchableUser) => void;
  removeSwitchableUser: (userId: string) => void;
  setSwitchableUsers: (users: SwitchableUser[]) => void;
  setAccessToken: (token: string) => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const MAX_SWITCHABLE_USERS = 5;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      switchableUsers: [],
      isInitialized: false,
      isAuthenticated: false,
      userRole: null,

      setAuth: (tokens, user) => {
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user,
          userRole: user.role,
          isAuthenticated: true,
        });
      },

      setUser: (user) => set({ user, userRole: user.role }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          userRole: null,
        });
      },

      initializeAuth: async () => {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const storedUser = localStorage.getItem('user');

        if (accessToken && storedUser) {
          try {
            const user = JSON.parse(storedUser);
            set({
              accessToken,
              refreshToken,
              user,
              userRole: user.role,
              isAuthenticated: true,
              isInitialized: true,
            });
          } catch {
            get().clearAuth();
            set({ isInitialized: true });
          }
        } else {
          set({ isInitialized: true });
        }
      },

      addSwitchableUser: (switchableUser) =>
        set((state) => {
          const filtered = state.switchableUsers.filter((u) => u.userId !== switchableUser.userId);
          const updated = [switchableUser, ...filtered].slice(0, MAX_SWITCHABLE_USERS);
          localStorage.setItem('switchableUsers', JSON.stringify(updated));
          return { switchableUsers: updated };
        }),

      removeSwitchableUser: (userId) =>
        set((state) => {
          const updated = state.switchableUsers.filter((u) => u.userId !== userId);
          localStorage.setItem('switchableUsers', JSON.stringify(updated));
          return { switchableUsers: updated };
        }),

      setSwitchableUsers: (users) => {
        localStorage.setItem('switchableUsers', JSON.stringify(users));
        set({ switchableUsers: users });
      },

      setAccessToken: (token) => {
        localStorage.setItem('accessToken', token);
        set({ accessToken: token });
      },

      hasRole: (roles) => {
        const { userRole } = get();
        return userRole ? roles.includes(userRole) : false;
      },
    }),
    {
      name: 'lrp-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        switchableUsers: state.switchableUsers,
      }),
    }
  )
);