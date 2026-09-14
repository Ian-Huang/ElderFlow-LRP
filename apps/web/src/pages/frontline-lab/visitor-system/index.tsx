import { useState } from 'react';
import { Link } from 'react-router-dom';
import { VisitorPublicKioskForm } from './VisitorPublicKioskForm';
import { VisitorDataManagerTable } from './VisitorDataManagerTable';
import { VisitorAuditPrintView } from './VisitorAuditPrintView';

export function VisitorSystemModule() {
  const [activeTab, setActiveTab] = useState<'kiosk' | 'database' | 'audit'>('database');

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* 頂部導航與標題 (列印時隱藏) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <nav className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <Link to="/frontline-lab" className="hover:text-emerald-700">
              現場工具箱
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">訪客與志工登記三件套</span>
          </nav>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-slate-900">訪客與志工線上登記模組</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              三合一工作台
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/public/visitor"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center transition-colors"
          >
            <svg className="w-4 h-4 mr-1.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            另開獨立訪客全螢幕端 (Kiosk)
          </a>
        </div>
      </div>

      {/* 三合一 Tab 選項卡 (列印時隱藏) */}
      <div className="no-print flex space-x-1 bg-slate-200/80 p-1 rounded-xl max-w-xl">
        <button
          onClick={() => setActiveTab('database')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'database'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7z" />
          </svg>
          <span>2. 內部資料庫即時清單</span>
        </button>

        <button
          onClick={() => setActiveTab('kiosk')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'kiosk'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span>1. 訪客端手機填寫預覽</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'audit'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>3. A4 評鑑報表列印</span>
        </button>
      </div>

      {/* Tab 內容渲染 */}
      <div className="mt-4">
        {activeTab === 'kiosk' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 flex justify-center">
              {/* 模擬手機框 */}
              <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-4 border-slate-700 overflow-hidden">
                <div className="bg-slate-700 text-white text-[10px] py-1 px-4 flex justify-between items-center font-mono">
                  <span>中山訪客現場端 (Kiosk)</span>
                  <span>9:41 AM</span>
                </div>
                <VisitorPublicKioskForm isEmbedded={true} />
              </div>
            </div>

            {/* 右側資訊與操作指引 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                現場使用與驗證說明
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                此處為模擬大門訪客或志工於現場手機/平板掃描 QR Code 後所見畫面。
              </p>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-2">
                <div className="font-bold">現場部署建議：</div>
                <div>1. 點擊右上角「另開獨立訪客全螢幕端」複製網址。</div>
                <div>2. 將該網址製作為大門實體立牌 QR Code，或設為櫃檯平板首頁。</div>
                <div>3. 訪客送出後，可即時切換至 Tab 2 檢查是否已成功寫入資料庫！</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'database' && <VisitorDataManagerTable />}

        {activeTab === 'audit' && <VisitorAuditPrintView />}
      </div>
    </div>
  );
}
