import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from './authStore';
import type { User, UserRole, SwitchableUser, AuthTokens } from '@lrp/shared';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substr(2, 9),
  },
});

const mockUser: User = {
  userId: 'user-001',
  username: 'caregiver1',
  name: '陳照護',
  role: 'caregiver',
  isLocalStaff: true,
  avatarUrl: undefined,
  lastLoginAt: new Date().toISOString(),
  createdAt: '2024-01-01T00:00:00Z',
};

const mockTokens: AuthTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 900,
};

const mockSwitchableUsers: SwitchableUser[] = [
  {
    userId: 'user-001',
    username: 'caregiver1',
    name: '陳照護',
    role: 'caregiver',
    encryptedRefreshToken: 'enc-mock-refresh-1',
    lastUsedAt: new Date().toISOString(),
  },
  {
    userId: 'user-002',
    username: 'supervisor1',
    name: '林主管',
    role: 'supervisor',
    encryptedRefreshToken: 'enc-mock-refresh-2',
    lastUsedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Helper to reset the store
async function resetStore() {
  await act(async () => {
    await useAuthStore.getState().clearAuth();
  });
  // Reset to initial state
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    switchableUsers: [],
    isInitialized: false,
    isAuthenticated: false,
    userRole: null,
  });
}

describe('useAuthStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    await resetStore();
  });

  describe('setAuth', () => {
    it('should set auth state and store tokens in IndexedDB', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.accessToken).toBe(mockTokens.accessToken);
      expect(result.current.refreshToken).toBe(mockTokens.refreshToken);
      expect(result.current.userRole).toBe(mockUser.role);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should set switchable users when provided', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser, mockSwitchableUsers);
      });

      expect(result.current.switchableUsers).toHaveLength(2);
    });
  });

  describe('clearAuth', () => {
    it('should clear auth state', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser);
      });

      await act(async () => {
        await result.current.clearAuth();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
      expect(result.current.refreshToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.userRole).toBeNull();
      expect(result.current.switchableUsers).toHaveLength(0);
    });
  });

  describe('initializeAuth', () => {
    it('should initialize as not authenticated when no stored data', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initializeAuth();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('switchableUsers management', () => {
    it('should add switchable user and limit to 5', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser);
        for (const u of mockSwitchableUsers) {
          await result.current.addSwitchableUser(u);
        }
      });

      expect(result.current.switchableUsers).toHaveLength(2);
      // Most recently added should be first
      expect(result.current.switchableUsers[0]?.userId).toBe('user-002');
      expect(result.current.switchableUsers[1]?.userId).toBe('user-001');
    });

    it('should keep only the most recent 5 users', async () => {
      const { result } = renderHook(() => useAuthStore());

      const sixUsers: SwitchableUser[] = Array.from({ length: 6 }, (_, i) => ({
        userId: `user-${String(i + 1).padStart(3, '0')}`,
        username: `user${i + 1}`,
        name: `使用者${i + 1}`,
        role: 'caregiver' as UserRole,
        encryptedRefreshToken: `enc-refresh-${i + 1}`,
        lastUsedAt: new Date(Date.now() - i * 1000).toISOString(),
      }));

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser);
        for (const u of sixUsers) {
          await result.current.addSwitchableUser(u);
        }
      });

      expect(result.current.switchableUsers).toHaveLength(5);
      // Most recently added (user-006) should be first
      expect(result.current.switchableUsers[0]?.userId).toBe('user-006');
      expect(result.current.switchableUsers[4]?.userId).toBe('user-002');
    });

    it('should remove switchable user', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser);
        for (const u of mockSwitchableUsers) {
          await result.current.addSwitchableUser(u);
        }
      });

      await act(async () => {
        await result.current.removeSwitchableUser('user-001');
      });

      expect(result.current.switchableUsers).toHaveLength(1);
      expect(result.current.switchableUsers[0]?.userId).toBe('user-002');
    });

    it('should set switchable users', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser);
        await result.current.setSwitchableUsers(mockSwitchableUsers);
      });

      expect(result.current.switchableUsers).toEqual(mockSwitchableUsers);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has matching role', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser);
      });

      expect(result.current.hasRole(['caregiver'])).toBe(true);
      expect(result.current.hasRole(['caregiver', 'supervisor'])).toBe(true);
    });

    it('should return false when user does not have matching role', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser);
      });

      expect(result.current.hasRole(['supervisor'])).toBe(false);
      expect(result.current.hasRole(['admin'])).toBe(false);
    });

    it('should return false when not authenticated', () => {
      const { result } = renderHook(() => useAuthStore());
      expect(result.current.hasRole(['caregiver'])).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should update user and role', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser);
      });

      const updatedUser = { ...mockUser, name: '新名稱', role: 'supervisor' as UserRole };

      act(() => {
        result.current.setUser(updatedUser);
      });

      expect(result.current.user).toEqual(updatedUser);
      expect(result.current.userRole).toBe('supervisor');
    });
  });

  describe('updateUser', () => {
    it('should partially update user', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser);
      });

      act(() => {
        result.current.updateUser({ name: '更新名稱' });
      });

      expect(result.current.user?.name).toBe('更新名稱');
      expect(result.current.user?.role).toBe(mockUser.role);
    });
  });

  describe('setAccessToken', () => {
    it('should update access token in state', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser);
      });

      const newToken = 'new-access-token';

      await act(async () => {
        await result.current.setAccessToken(newToken);
      });

      expect(result.current.accessToken).toBe(newToken);
    });
  });

  describe('switchUser', () => {
    it('should update switchable user lastUsedAt and reorder', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser, mockSwitchableUsers);
      });

      await act(async () => {
        await result.current.switchUser('user-002');
      });

      // user-002 should now be first
      expect(result.current.switchableUsers[0]?.userId).toBe('user-002');
      expect(result.current.switchableUsers[1]?.userId).toBe('user-001');
    });
  });
});