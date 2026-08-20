import { create } from 'zustand';
import type { User, UserRole, SwitchableUser, AuthTokens } from '@lrp/shared';
import {
  saveAuthData,
  loadAuthData,
  clearAuthData,
  saveSwitchableUsers,
  loadSwitchableUsers,
  removeSwitchableUser,
  updateSwitchableUserLastUsed,
} from '@/utils/authDb';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  switchableUsers: SwitchableUser[];
  isInitialized: boolean;
  isAuthenticated: boolean;
  userRole: UserRole | null;

  // Actions
  setAuth: (tokens: AuthTokens, user: User, switchableUsers?: SwitchableUser[]) => void;
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  clearAuth: () => void;
  initializeAuth: () => Promise<void>;
  addSwitchableUser: (user: SwitchableUser) => void;
  removeSwitchableUser: (userId: string) => void;
  setSwitchableUsers: (users: SwitchableUser[]) => void;
  setAccessToken: (token: string) => void;
  hasRole: (roles: UserRole[]) => boolean;
  switchUser: (targetUserId: string) => Promise<void>;
}

const MAX_SWITCHABLE_USERS = 5;

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  switchableUsers: [],
  isInitialized: false,
  isAuthenticated: false,
  userRole: null,

  setAuth: async (tokens, user, switchableUsers = []) => {
    await saveAuthData({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      userRole: user.role,
      isAuthenticated: true,
    });
    if (switchableUsers.length > 0) {
      await saveSwitchableUsers(switchableUsers);
    }
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
      userRole: user.role,
      isAuthenticated: true,
      switchableUsers,
    });
  },

  setUser: (user) => set({ user, userRole: user.role }),

  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),

  clearAuth: async () => {
    await clearAuthData();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      userRole: null,
      switchableUsers: [],
    });
  },

  initializeAuth: async () => {
    const stored = await loadAuthData();
    if (stored && stored.isAuthenticated && stored.user) {
      const switchableUsers = await loadSwitchableUsers();
      set({
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        user: stored.user,
        userRole: stored.userRole,
        isAuthenticated: true,
        isInitialized: true,
        switchableUsers,
      });
    } else {
      set({ isInitialized: true });
    }
  },

  addSwitchableUser: async (switchableUser) => {
    const { switchableUsers } = get();
    const filtered = switchableUsers.filter((u) => u.userId !== switchableUser.userId);
    const updated = [switchableUser, ...filtered].slice(0, MAX_SWITCHABLE_USERS);
    await saveSwitchableUsers(updated);
    set({ switchableUsers: updated });
  },

  removeSwitchableUser: async (userId) => {
    const { switchableUsers } = get();
    const updated = switchableUsers.filter((u) => u.userId !== userId);
    await removeSwitchableUser(userId);
    set({ switchableUsers: updated });
  },

  setSwitchableUsers: async (users) => {
    await saveSwitchableUsers(users);
    set({ switchableUsers: users });
  },

  setAccessToken: async (token) => {
    await saveAuthData({
      user: get().user,
      accessToken: token,
      refreshToken: get().refreshToken,
      userRole: get().userRole,
      isAuthenticated: get().isAuthenticated,
    });
    set({ accessToken: token });
  },

  hasRole: (roles) => {
    const { userRole } = get();
    return userRole ? roles.includes(userRole) : false;
  },

  switchUser: async (targetUserId) => {
    // Update the lastUsedAt for the switchable user
    await updateSwitchableUserLastUsed(targetUserId);

    // Update the switchableUsers array to reflect the new order
    const { switchableUsers } = get();
    const filtered = switchableUsers.filter((u) => u.userId !== targetUserId);
    const targetUser = switchableUsers.find((u) => u.userId === targetUserId);
    if (targetUser) {
      const updated = [{ ...targetUser, lastUsedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_SWITCHABLE_USERS);
      await saveSwitchableUsers(updated);
      set({ switchableUsers: updated });
    }
  },
}));

// Listen for storage changes from other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', async (event) => {
    if (event.key === 'lrp-auth-storage') {
      const stored = await loadAuthData();
      if (stored && stored.isAuthenticated && stored.user) {
        const switchableUsers = await loadSwitchableUsers();
        useAuthStore.setState({
          accessToken: stored.accessToken,
          refreshToken: stored.refreshToken,
          user: stored.user,
          userRole: stored.userRole,
          isAuthenticated: true,
          isInitialized: true,
          switchableUsers,
        });
      } else {
        useAuthStore.setState({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          userRole: null,
          switchableUsers: [],
          isInitialized: true,
        });
      }
    }
  });
}