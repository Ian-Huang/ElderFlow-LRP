import type { UserRole } from '@lrp/shared';

/**
 * Get role display label in Chinese
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    caregiver: '照護員',
    supervisor: '主管',
    admin: '管理員',
    sysadmin: '系統管理員',
  };
  return labels[role] || role;
}

/**
 * Get role badge CSS class
 */
export function getRoleBadgeClass(role: UserRole): string {
  const classes: Record<UserRole, string> = {
    caregiver: 'badge-primary',
    supervisor: 'badge-warning',
    admin: 'badge-danger',
    sysadmin: 'badge-gray',
  };
  return classes[role] || 'badge-gray';
}

/**
 * Role hierarchy for checking minimum role level
 * caregiver < supervisor < admin < sysadmin
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  caregiver: 1,
  supervisor: 2,
  admin: 3,
  sysadmin: 4,
};

/**
 * Check if user has at least the specified role level
 */
export function hasMinRole(userRole: UserRole | null, minRole: UserRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Check if user is admin or above
 */
export function isAdmin(userRole: UserRole | null): boolean {
  return hasMinRole(userRole, 'admin');
}

/**
 * Check if user is supervisor or above
 */
export function isSupervisor(userRole: UserRole | null): boolean {
  return hasMinRole(userRole, 'supervisor');
}