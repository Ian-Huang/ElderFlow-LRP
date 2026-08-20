import { useAuthStore } from '@/stores/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import type { UserRole } from '@lrp/shared';
import { hasMinRole as hasMinRoleUtil } from '@/utils/roles';

/**
 * Hook to check if current user has required roles
 */
export function useRequireRole(allowedRoles: UserRole[], redirectTo: string = '/dashboard') {
  const { isAuthenticated, isInitialized, userRole, hasRole } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait for auth to be initialized
    if (!isInitialized) return;

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      navigate('/login', { replace: true, state: { from: location.pathname } });
      return;
    }

    // Check role permissions
    if (userRole && !hasRole(allowedRoles)) {
      navigate(redirectTo, { replace: true });
    }
  }, [isInitialized, isAuthenticated, userRole, allowedRoles, hasRole, navigate, location, redirectTo]);

  // Return current permission state for conditional rendering
  return {
    isAllowed: isAuthenticated && isInitialized && (userRole ? hasRole(allowedRoles) : false),
    isLoading: !isInitialized,
    userRole,
  };
}

/**
 * Hook to get current user's role
 */
export function useUserRole() {
  const { userRole, isAuthenticated, isInitialized } = useAuthStore();
  return { userRole, isAuthenticated, isInitialized };
}

/**
 * Check if user has any of the specified roles (synchronous version for conditional rendering)
 */
export function useHasRole() {
  const { hasRole, isAuthenticated } = useAuthStore();
  return (roles: UserRole[]) => isAuthenticated && hasRole(roles);
}

/**
 * Higher-order component for role-based route protection
 * Usage: const ProtectedComponent = requireRole(['admin', 'sysadmin'])(MyComponent);
 */
export function requireRole<P extends object>(
  allowedRoles: UserRole[],
  WrappedComponent: React.ComponentType<P>,
  redirectTo: string = '/dashboard'
) {
  return function RequireRoleWrapper(props: P) {
    const { isAllowed, isLoading } = useRequireRole(allowedRoles, redirectTo);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" aria-label="載入中" />
        </div>
      );
    }

    if (!isAllowed) {
      return null; // Redirect handled by useRequireRole
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * Check if user has at least the specified role level
 */
export function useMinRole(minRole: UserRole) {
  const { userRole, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !userRole) return false;

  return hasMinRoleUtil(userRole, minRole);
}

/**
 * Check if user is admin or above
 */
export function useIsAdmin() {
  return useMinRole('admin');
}

/**
 * Check if user is supervisor or above
 */
export function useIsSupervisor() {
  return useMinRole('supervisor');
}

// Re-export shared role utilities
export { getRoleLabel, getRoleBadgeClass, ROLE_HIERARCHY, isAdmin, isSupervisor, hasMinRole } from '@/utils/roles';