import { Link } from 'react-router-dom';
import { reportRegistry } from './reportRegistry';
import type { AuditReportConfig } from './auditToolkitTypes';

/**
 * 評鑑報表工具箱總覽首頁 (AuditToolkitHub)
 *
 * 宣告式卡片藝廊 (Gallery)，自動從 reportRegistry 讀取所有已註冊的報表模組，
 * 展示直向/橫向紙張方向標籤、發布狀態、功能簡述與進入按鈕。
 * 未來新增更多報表模組時，無需修改本元件即可自動擴充展示。
 */
export function AuditToolkitHub() {
  const reports: AuditReportConfig[] = reportRegistry.getAll();

  return (
    <div className="audit-toolkit-hub max-w-7xl mx-auto space-y-8" data-testid="audit-toolkit-hub">
      {/* 頂部引導區域 */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-800 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold tracking-wider uppercase mb-3">
            <span>衛福部長照評鑑專區</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>離線可用</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            評鑑報表工具箱 <span className="text-primary-200 text-lg sm:text-xl font-normal">Audit Toolkit</span>
          </h1>
          <p className="text-primary-100 text-sm sm:text-base leading-relaxed mb-6">
            專為長照機構第一線打造之純前端、免伺服器 A4 評鑑專用表單產製中心。支援標準 CSV 範本下載、一鍵歷史資料匯入、畫面上機構抬頭即時自訂（contenteditable），以及符合衛福部查核規格之黑實線分頁自動列印。
          </p>

          {/* 三大保證標籤 */}
          <div className="flex flex-wrap gap-2 sm:gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20">
              <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>純前端本機解析・個資零外洩</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20">
              <svg className="w-4 h-4 text-primary-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>A4 粗黑實線防截斷・分頁表頭重現</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20">
              <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>斷網離線即開即用・免登入即印</span>
            </span>
          </div>
        </div>
      </div>

      {/* 報表模組卡片清單 (Gallery Grid) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">已註冊報表工具模組</h2>
            <p className="text-xs text-gray-500">點擊卡片即可開啟對應表單進行範本下載、匯入與列印</p>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full" data-testid="registered-count">
            共 {reports.length} 個工具
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="reports-grid">
          {reports.map((report) => {
            const isComingSoon = report.status === 'coming-soon';
            const isPortrait = report.orientation === 'portrait';

            return (
              <div
                key={report.id}
                className={`bg-white rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  isComingSoon
                    ? 'border-gray-200 opacity-80 hover:border-gray-300 shadow-sm'
                    : 'border-gray-200 hover:border-primary-400 hover:shadow-md'
                }`}
                data-testid={`toolkit-card-${report.id}`}
              >
                <div className="p-6">
                  {/* 標籤列：紙張方向 + 狀態 */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                        isPortrait
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                      data-testid={`badge-orientation-${report.id}`}
                    >
                      {isPortrait ? '直向 A4 (Portrait)' : '橫向 A4 (Landscape)'}
                    </span>

                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                        isComingSoon
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                      data-testid={`badge-status-${report.id}`}
                    >
                      {isComingSoon ? '即將推出 (Coming Soon)' : '現已可用 (Ready)'}
                    </span>
                  </div>

                  {/* 卡片標題 */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug">
                    {report.title}
                  </h3>

                  {/* 描述 */}
                  <p className="text-sm text-gray-600 leading-relaxed mb-4 min-h-[40px]">
                    {report.description || '標準長照評鑑格式追蹤報表模組。'}
                  </p>

                  {/* 欄位規格摘要 */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{report.columns.length} 欄位配置</span>
                    </div>

                    <span>
                      {report.sampleData.length > 0 ? `內建 ${report.sampleData.length} 筆範例` : '無預設範例'}
                    </span>
                  </div>
                </div>

                {/* 卡片底部操作按鈕 */}
                <div className="p-4 bg-gray-50/80 rounded-b-xl border-t border-gray-100">
                  {isComingSoon ? (
                    <button
                      type="button"
                      disabled
                      className="w-full btn btn-secondary text-xs justify-center opacity-60 cursor-not-allowed"
                      data-testid={`btn-enter-${report.id}`}
                    >
                      模組籌備中（敬請期待）
                    </button>
                  ) : (
                    <Link
                      to={`/audit-toolkit/${report.id}`}
                      className="w-full btn btn-primary text-xs justify-center flex items-center gap-1.5 group"
                      data-testid={`btn-enter-${report.id}`}
                    >
                      <span>開啟報表模組</span>
                      <svg
                        className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 快速使用說明 */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          使用三步驟指南
        </h3>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
          <li className="bg-white p-3 rounded-lg border border-gray-200">
            <span className="font-bold text-primary-700 block mb-1">1. 下載 UTF-8 CSV 範本</span>
            進入報表模組後點擊「下載 CSV 範本」，使用 Excel 或試算表將歷史紀錄整理填入。
          </li>
          <li className="bg-white p-3 rounded-lg border border-gray-200">
            <span className="font-bold text-primary-700 block mb-1">2. 一鍵匯入與自訂抬頭</span>
            點擊「匯入 CSV」，瞬間載入數十至上百筆紀錄。可直接點擊畫面修改機構全銜與年度。
          </li>
          <li className="bg-white p-3 rounded-lg border border-gray-200">
            <span className="font-bold text-primary-700 block mb-1">3. 原生列印輸出 A4 / PDF</span>
            點擊「立即列印 / PDF」，工具列自動隱藏，自動依頁面大小分頁並重複表頭。
          </li>
        </ol>
      </div>
    </div>
  );
}
