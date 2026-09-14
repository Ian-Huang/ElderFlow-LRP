import { Outlet } from 'react-router-dom';

export function KioskLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 antialiased font-sans">
      <header className="bg-emerald-700 text-white shadow-md py-4 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl">
            中
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">中山老人長照養護中心</h1>
            <p className="text-xs text-emerald-100">訪客暨現場公共登記系統</p>
          </div>
        </div>
        <div className="text-right text-xs text-emerald-100 hidden sm:block">
          <div>即時防護 · 數位簽到</div>
          <div>防疫體溫守護長輩健康</div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <Outlet />
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400">
        © 2026 中山老人長照養護中心 · 資料受個資法保護，僅供機構防疫與評鑑查核使用
      </footer>
    </div>
  );
}
