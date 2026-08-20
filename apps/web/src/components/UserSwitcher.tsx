import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/api/apiClient';
import type { SwitchableUser } from '@lrp/shared';
import { getRoleLabel, getRoleBadgeClass } from '@/utils/roles';

interface UserSwitcherProps {
  className?: string;
}

export function UserSwitcher({ className = '' }: UserSwitcherProps) {
  const { user, switchableUsers, setAuth, switchUser, clearAuth } = useAuthStore();
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
      const response = await apiClient.post<{
        accessToken: string;
        expiresIn: number;
        user: { userId: string; username: string; name: string; role: string; isLocalStaff: boolean };
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
          }
        );

        // Update switchable users order
        await switchUser(targetUser.userId);

        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to switch user:', error);
      alert('切換帳號失敗，請重試');
    } finally {
      setSwitching(null);
    }
  };

  // Filter out current user from switchable list
  const otherUsers = switchableUsers.filter((u) => u.userId !== user?.userId);

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
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-fade-in">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">切換帳號</p>
          </div>

          {otherUsers.length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-sm">
              尚無其他可切換帳號
            </div>
          ) : (
            <ul className="py-1" role="menu">
              {otherUsers.map((u) => (
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