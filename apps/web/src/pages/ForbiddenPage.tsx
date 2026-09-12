import { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function ForbiddenPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole } = useAuthStore();

  const attemptedPath = (location.state as { from?: string } | null)?.from || '未知路徑';

  useEffect(() => {
    // Log security 403 event
    console.warn(
      `[RBAC Security] 403 Forbidden access attempted: path="${attemptedPath}", user="${user?.username || 'anonymous'}", role="${userRole || 'none'}"`
    );
  }, [attemptedPath, user?.username, userRole]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-danger-50 text-danger-600">
          <ShieldExclamationIcon className="h-10 w-10" aria-hidden="true" />
        </div>

        <div>
          <span className="text-sm font-semibold tracking-wider text-danger-600 uppercase">
            HTTP 403
          </span>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            403 - 存取被拒絕
          </h1>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            您目前的帳號身分無權存取此頁面或資源。若您需要管理權限或認為此判定有誤，請向機構系統管理員申請提權。
          </p>
        </div>

        {attemptedPath !== '未知路徑' && (
          <div className="p-3 bg-gray-50 rounded-lg text-xs font-mono text-gray-500 break-all border border-gray-100">
            嘗試存取的路徑：<span className="text-gray-800 font-semibold">{attemptedPath}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/dashboard"
            className="btn-primary flex items-center justify-center gap-2"
          >
            <HomeIcon className="w-4 h-4" aria-hidden="true" />
            返回儀表板
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            返回上一頁
          </button>
        </div>

        {user && (
          <div className="border-t border-gray-100 pt-4 text-xs text-gray-400">
            目前登入身分：<span className="font-medium text-gray-600">{user.name}</span> ({userRole})
          </div>
        )}
      </div>
    </div>
  );
}

function ShieldExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v4m0 4h.01"
      />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}
