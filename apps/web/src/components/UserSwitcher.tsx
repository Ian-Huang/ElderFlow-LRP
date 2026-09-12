import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/api/apiClient';
import type { SwitchableUser } from '@lrp/shared';
import { getRoleLabel, getRoleBadgeClass } from '@/utils/roles';
import { saveFormDraft, getFormDraft, type OfflineDraft } from '@/utils/offlineDb';

/**
 * Automatically inspect DOM for active form elements and persist draft into IndexedDB
 */
export async function captureAndSaveActiveDraft(userId: string): Promise<OfflineDraft | null> {
  if (typeof document === 'undefined') return null;

  const forms = Array.from(document.querySelectorAll('form'));
  if (forms.length === 0) return null;

  // Find active form (focused or first form)
  const activeForm =
    forms.find((f) => f.contains(document.activeElement)) || forms[0];

  if (!activeForm) return null;

  const elements = Array.from(
    activeForm.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select'
    )
  );

  const formData: Record<string, unknown> = {};
  let hasContent = false;

  for (const el of elements) {
    const name = el.name || el.id;
    if (!name) continue;
    if (el instanceof HTMLInputElement && el.type === 'password') continue;

    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      formData[name] = el.checked;
    } else {
      formData[name] = el.value;
      if (el.value && el.value.trim().length > 0) {
        hasContent = true;
      }
    }
  }

  if (!hasContent) return null;

  let entity: string | null | undefined = activeForm.getAttribute('data-entity');
  let entityId: string | null | undefined = activeForm.getAttribute('data-entity-id');

  if (!entity && typeof window !== 'undefined') {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 1) {
      entity = pathParts[0];
      entityId = pathParts[1] || 'new';
    }
  }

  const finalEntity = entity || 'form';
  const finalEntityId = entityId || 'active';

  return await saveFormDraft(finalEntity, finalEntityId, userId, formData);
}

/**
 * Attempt to restore saved draft from IndexedDB back to active DOM form
 */
export async function restoreActiveDraftToDom(userId: string): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  const forms = Array.from(document.querySelectorAll('form'));
  if (forms.length === 0) return false;

  let expectedEntity: string | undefined;
  if (typeof window !== 'undefined') {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 1) {
      expectedEntity = pathParts[0];
    }
  }

  // Robust form resolution:
  // 1. Prefer form matching current URL path entity via data-entity
  // 2. Otherwise prefer form with data-entity attribute
  // 3. Fallback to first form
  const targetForm =
    (expectedEntity ? forms.find((f) => f.getAttribute('data-entity') === expectedEntity) : undefined) ||
    forms.find((f) => f.hasAttribute('data-entity')) ||
    forms[0];

  if (!targetForm) return false;

  let entity: string | null | undefined = targetForm.getAttribute('data-entity');
  let entityId: string | null | undefined = targetForm.getAttribute('data-entity-id');

  if (!entity && typeof window !== 'undefined') {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 1) {
      entity = pathParts[0];
      entityId = pathParts[1] || 'new';
    }
  }

  const finalEntity = entity || 'form';
  const finalEntityId = entityId || 'active';

  const draft = await getFormDraft(finalEntity, finalEntityId, userId);
  if (!draft || !draft.formData) return false;

  let restoredCount = 0;
  for (const [key, val] of Object.entries(draft.formData)) {
    const el = targetForm.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[name="${key}"], #${key}`
    );
    if (el) {
      if (el instanceof HTMLInputElement && el.type === 'checkbox') {
        el.checked = Boolean(val);
      } else {
        el.value = String(val ?? '');
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      restoredCount++;
    }
  }

  return restoredCount > 0;
}

interface UserSwitcherProps {
  className?: string;
}

export function UserSwitcher({ className = '' }: UserSwitcherProps) {
  const { user, switchableUsers, setAuth, clearAuth } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSwitchUser = async (targetUser: SwitchableUser) => {
    if (targetUser.userId === user?.userId) return;

    setSwitching(targetUser.userId);

    try {
      // 1. Preserve active form draft before switching
      if (user?.userId) {
        try {
          await captureAndSaveActiveDraft(user.userId);
        } catch (err) {
          console.warn('Draft auto-preservation warning:', err);
        }
      }

      // 2. Perform switch API call
      const response = await apiClient.post<{
        accessToken: string;
        expiresIn: number;
        user: { userId: string; username: string; name: string; role: string; isLocalStaff: boolean };
        switchableUsers: SwitchableUser[];
      }>('/auth/switch', {
        targetUserId: targetUser.userId,
        refreshToken: targetUser.encryptedRefreshToken,
      });

      if (response.success && response.data) {
        // Update the auth store with new user and token
        await setAuth(
          { accessToken: response.data.accessToken, refreshToken: targetUser.encryptedRefreshToken, expiresIn: response.data.expiresIn },
          {
            userId: response.data.user.userId,
            username: response.data.user.username,
            name: response.data.user.name,
            role: response.data.user.role as 'caregiver' | 'supervisor' | 'admin' | 'sysadmin',
            isLocalStaff: response.data.user.isLocalStaff,
            avatarUrl: undefined,
            lastLoginAt: new Date().toISOString(),
            createdAt: '',
          },
          response.data.switchableUsers
        );

        // 3. Restore draft if available for newly switched user
        try {
          await restoreActiveDraftToDom(response.data.user.userId);
        } catch {
          // ignore
        }

        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to switch user:', error);
      alert('切換帳號失敗，請重試');
    } finally {
      setSwitching(null);
    }
  };

  // Filter out current user from switchable list, showing up to recent 5 users
  const recentUsers = switchableUsers
    .filter((u) => u.userId !== user?.userId)
    .slice(0, 5);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
        aria-label="切換使用者"
        aria-expanded={isOpen}
        aria-haspopup="true"
        disabled={switching !== null}
      >
        <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-primary-700 font-medium text-sm">
            {user?.name?.charAt(0) || 'U'}
          </span>
        </div>
        <span className="font-medium text-gray-900 hidden sm:block truncate max-w-[120px]">
          {user?.name}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 transition-all duration-200 ease-in-out transform origin-top-right">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">切換帳號 (最多5組)</p>
          </div>

          {recentUsers.length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-sm">
              尚無其他可切換帳號
            </div>
          ) : (
            <ul className="py-1" role="menu">
              {recentUsers.map((u) => (
                <li key={u.userId} role="none">
                  <button
                    onClick={() => handleSwitchUser(u)}
                    disabled={switching === u.userId}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                      switching === u.userId
                        ? 'bg-gray-50 cursor-wait'
                        : 'hover:bg-gray-50'
                    }`}
                    role="menuitem"
                  >
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-700 font-medium text-sm">{u.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{u.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">@{u.username}</span>
                        <span className={`text-xs ${getRoleBadgeClass(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      </div>
                    </div>
                    {switching === u.userId && (
                      <svg className="animate-spin h-4 w-4 text-primary-600" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-gray-100 pt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                clearAuth();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
              role="menuitem"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>登出</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}