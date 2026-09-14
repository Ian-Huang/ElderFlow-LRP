import { Link } from 'react-router-dom';

export function FrontlineLabHub() {
  const auditReports = [
    {
      id: 'repairs',
      title: '機構修繕通報追蹤記錄表',
      badge: '評鑑制式 A4 橫向',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      description: '總務工務專用，支援修繕即時登記、處理進度追蹤、水電安全評鑑查核與 CSV 批次匯入匯出。',
      url: '/frontline-lab/repairs',
      icon: (
        <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      id: 'sanitation',
      title: '環境清潔消毒自主檢查表',
      badge: '評鑑制式 A4 直向',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      description: '照護與清潔專用，支援三旬制式滿版排版、14種擬真人手寫打勾、未來日期嚴禁預打勾合規防呆。',
      url: '/frontline-lab/sanitation',
      icon: (
        <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const frontlineApps = [
    {
      id: 'visitor',
      title: '訪客與志工線上登記系統',
      badge: '三合一完整運作',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      description:
        '大門訪客/志工/公務洽公免登入登記，支援體溫防呆、團體同行、內部資料庫即時查改、與 A4 評鑑專用紀錄表滿版列印。',
      internalUrl: '/frontline-lab/visitor',
      publicUrl: '/public/visitor',
      icon: (
        <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'daily-metrics',
      title: '品質指標每日登記工具',
      badge: '規劃中',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      description:
        '每日機構在院人數、導尿管、鼻胃管、約束人數快速登記，支援自動帶入前日數字與本機衝突檢核。',
      internalUrl: '#',
      publicUrl: null,
      icon: (
        <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'supplies-fifo',
      title: '感管耗材與庫存盤點 (FIFO)',
      badge: '規劃中',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
      description:
        '42項臨床耗材批次效期追蹤、15天定期盤點、洗手乳秤重月結倒推、自動計算損耗與效期預警。',
      internalUrl: '#',
      publicUrl: null,
      icon: (
        <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-10">
      {/* 頂部橫幅 */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-emerald-900 rounded-2xl shadow-lg p-6 sm:p-8 text-white">
        <div className="max-w-3xl">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700/80 text-emerald-100 mb-3 border border-emerald-500/40">
            全院現場協作 · 實用主義工作台 (Frontline Toolkit & Lab)
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            現場工具箱與實驗室
          </h1>
          <p className="mt-2 text-slate-200 text-sm sm:text-base leading-relaxed">
            專為長照第一線跨職類同仁（護理、照護、社工、總務、行政主管）打造的自製工具與評鑑報表專區。
            現場同仁可直接與 AI 溝通調整表單與報表，享有動態資料儲存自由與 A4 高保真滿版輸出。
          </p>
        </div>
      </div>

      {/* 專區 A：評鑑稽核專用報表 */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 mr-2.5"></span>
            專區 A：評鑑稽核專用報表 (A4 制式即印即用)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            符合衛福部規範，具備 A4 滿版排版、防未來日期預打勾、擬真人手寫劃記、支援 CSV 匯入匯出。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {auditReports.map((rep) => (
            <div
              key={rep.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between p-6"
              data-testid={`toolkit-card-${rep.id}`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                    {rep.icon}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${rep.badgeColor}`}>
                    {rep.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{rep.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">{rep.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Link
                  to={rep.url}
                  className="text-xs font-bold px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors"
                  data-testid={`btn-enter-${rep.id}`}
                >
                  開啟報表視圖 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 專區 B：現場自製登記工具 */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2.5"></span>
            專區 B：現場自製登記工具 (三件套：手機填寫 ➔ 資料庫 ➔ A4 列印)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            現場同仁與 AI 共同孵化之登記小工具，資料直接存入本機與雲端資料庫，即時查改、即時輸出。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {frontlineApps.map((mod) => (
            <div
              key={mod.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                    {mod.icon}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${mod.badgeColor}`}>
                    {mod.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{mod.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">{mod.description}</p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                {mod.publicUrl && (
                  <a
                    href={mod.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:underline inline-flex items-center"
                  >
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    訪客手機填寫端
                  </a>
                )}
                <Link
                  to={mod.internalUrl}
                  className={`ml-auto text-xs font-bold px-4 py-2 rounded-lg transition-colors ${
                    mod.internalUrl === '#'
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                  onClick={(e) => mod.internalUrl === '#' && e.preventDefault()}
                >
                  {mod.internalUrl === '#' ? '規劃中' : '進入三合一工作台 →'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
