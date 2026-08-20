import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '@/App';
import { useAuthStore } from '@/stores/authStore';
import type { User, AuthTokens, SwitchableUser } from '@lrp/shared';

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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
}

describe('Auth Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Pre-initialize the auth store to avoid loading spinner
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      switchableUsers: [],
      isInitialized: true,
      isAuthenticated: false,
      userRole: null,
    });
  });

  describe('Login Page', () => {
    it('should show login page initially', async () => {
      render(<App />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByLabelText('載入中')).not.toBeInTheDocument();
      });

      expect(screen.getByText('長照管理系統')).toBeInTheDocument();
      expect(screen.getByLabelText('帳號')).toBeInTheDocument();
      expect(screen.getByLabelText('密碼')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();
    });

    it('should show validation errors for empty fields', async () => {
      render(<App />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByLabelText('載入中')).not.toBeInTheDocument();
      });

      const loginButton = screen.getByRole('button', { name: '登入' });
      await userEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('請輸入帳號')).toBeInTheDocument();
        expect(screen.getByText('請輸入密碼')).toBeInTheDocument();
      });
    });

    it('should fill demo credentials when clicking demo buttons', async () => {
      render(<App />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByLabelText('載入中')).not.toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: '照護員' }));

      expect(screen.getByLabelText('帳號')).toHaveValue('caregiver1');
      expect(screen.getByLabelText('密碼')).toHaveValue('password123');
    });
  });

  describe('Auth Store', () => {
    it('should login and set auth state', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser, mockSwitchableUsers);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.accessToken).toBe(mockTokens.accessToken);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.userRole).toBe('caregiver');
      expect(result.current.switchableUsers).toHaveLength(2);
    });

    it('should logout and clear auth state', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser, mockSwitchableUsers);
      });

      await act(async () => {
        await result.current.clearAuth();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.switchableUsers).toHaveLength(0);
    });

    it('should switch user order in switchableUsers', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser, mockSwitchableUsers);
      });

      // user-001 should be first initially
      expect(result.current.switchableUsers[0]?.userId).toBe('user-001');

      await act(async () => {
        await result.current.switchUser('user-002');
      });

      // user-002 should now be first
      expect(result.current.switchableUsers[0]?.userId).toBe('user-002');
    });

    it('should check roles correctly', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser, mockSwitchableUsers);
      });

      expect(result.current.hasRole(['caregiver'])).toBe(true);
      expect(result.current.hasRole(['supervisor'])).toBe(false);
      expect(result.current.hasRole(['caregiver', 'supervisor'])).toBe(true);
    });
  });

  describe('RBAC Hooks', () => {
    it('should check user role', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.setAuth(mockTokens, mockUser, mockSwitchableUsers);
      });

      // Test the useHasRole hook indirectly
      const hasCaregiverRole = result.current.hasRole(['caregiver']);
      const hasSupervisorRole = result.current.hasRole(['supervisor']);

      expect(hasCaregiverRole).toBe(true);
      expect(hasSupervisorRole).toBe(false);
    });
  });
});