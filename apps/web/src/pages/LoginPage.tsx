import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/api/apiClient';
import type { User, AuthTokens, SwitchableUser } from '@lrp/shared';

interface LoginResponse {
  tokens: AuthTokens;
  user: User;
  switchableUsers: SwitchableUser[];
}

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', { username, password });

      if (response.success && response.data) {
        setAuth(response.data.tokens, response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('switchableUsers', JSON.stringify(response.data.switchableUsers));
        navigate('/dashboard');
      } else {
        setError(response.error?.message || '登入失敗');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '登入失敗，請稍後再試';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Demo credentials helper
  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">LRP</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">長照管理系統</h1>
          <p className="text-gray-500 mt-1">請登入以繼續</p>
        </div>

        <div className="card">
          <div className="card-body">
            {error && (
              <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="label">帳號</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="請輸入帳號"
                  required
                  autoComplete="username"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="label">密碼</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="請輸入密碼"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? '登入中...' : '登入'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center mb-3">測試帳號 (密碼皆為 password123)</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('caregiver1', 'password123')}
                  className="btn-secondary text-xs py-1.5"
                  disabled={loading}
                >
                  照護員
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('supervisor1', 'password123')}
                  className="btn-secondary text-xs py-1.5"
                  disabled={loading}
                >
                  主管
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('admin1', 'password123')}
                  className="btn-secondary text-xs py-1.5"
                  disabled={loading}
                >
                  管理員
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          MVP 測試環境 · 離線優先 PWA
        </p>
      </div>
    </div>
  );
}