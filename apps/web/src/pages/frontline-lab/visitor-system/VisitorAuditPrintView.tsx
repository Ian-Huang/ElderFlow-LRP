import { useState, useMemo } from 'react';
import { useSandboxCollection } from '@/hooks/useSandboxCollection';
import '@/styles/print.css';
import type { VisitorRecord } from './VisitorPublicKioskForm';

export function VisitorAuditPrintView() {
  const { data } = useSandboxCollection<VisitorRecord>('visitors');

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const filteredRecords = useMemo(() => {
    return data
      .filter((item) => {
        if (!selectedMonth) return true;
        return item.visitDate?.startsWith(selectedMonth);
      })
      .sort((a, b) => (a.visitDate + a.visitTime).localeCompare(b.visitDate + b.visitTime));
  }, [data, selectedMonth]);

  const [rocYear, monthNum] = useMemo(() => {
    if (!selectedMonth) return [115, 9];
    const parts = selectedMonth.split('-');
    const y = parts[0] ? parseInt(parts[0], 10) - 1911 : 115;
    const m = parts[1] ? parseInt(parts[1], 10) : 9;
    return [y, m];
  }, [selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  const pageStyle = `@page { size: A4 landscape; margin: 8mm 10mm; }`;

  return (
    <div className="space-y-6">
      {/* 注入 A4 橫向滿版列印樣式 */}
      <style>{pageStyle}</style>

      {/* 畫面控制列 (列印時完全隱藏) */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-bold text-slate-700">選擇報表月份：</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <span className="text-xs text-slate-500">
            該月共 {filteredRecords.length} 筆紀錄
          </span>
        </div>

        <button
          onClick={handlePrint}
          className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-lg shadow flex items-center transition-colors self-start sm:self-auto"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          列印 A4 評鑑專用報表
        </button>
      </div>

      {/* A4 實體列印紙張容器 (套用 a4-sheet a4-landscape 規範) */}
      <div className="a4-sheet a4-landscape bg-white font-serif text-black print:p-0 print:m-0 print:shadow-none print:border-none">
        {/* 表頭區塊 */}
        <div className="text-center pb-4 border-b-2 border-black mb-6">
          <div className="text-xs tracking-widest text-slate-600 mb-1 font-sans">
            表單編號：F-護品-022（長照機構感染管制暨評鑑專用）
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-wider mb-2">
            中山老人長期照顧養護中心
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold tracking-wide">
            訪客、家屬暨志工服務出入登記紀錄表
          </h2>
          <div className="flex justify-between items-center text-sm font-sans mt-4 px-2">
            <div>
              <span className="font-bold">統計月份：</span>
              <span>民國 {rocYear} 年 {monthNum} 月</span>
            </div>
            <div>
              <span className="font-bold">查核頻率：</span>
              <span>每日登記 / 每月歸檔</span>
            </div>
          </div>
        </div>

        {/* 核心資料表格 (高保真黑白線框) */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100 text-center font-bold">
                <th className="border border-black px-2 py-2 w-12">編號</th>
                <th className="border border-black px-2 py-2 w-24">日期 / 時間</th>
                <th className="border border-black px-2 py-2 w-20">身分類別</th>
                <th className="border border-black px-2 py-2 w-24">姓名 (代表)</th>
                <th className="border border-black px-2 py-2 w-28">聯絡電話</th>
                <th className="border border-black px-2 py-2 w-16">體溫 (°C)</th>
                <th className="border border-black px-2 py-2">對象 / 所屬單位 / 事由</th>
                <th className="border border-black px-2 py-2 w-20">初核簽章</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-black px-4 py-8 text-center text-slate-400">
                    民國 {rocYear} 年 {monthNum} 月無出入登記紀錄
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => (
                  <tr key={rec.id} className="text-center">
                    <td className="border border-black px-1 py-2 font-mono">{idx + 1}</td>
                    <td className="border border-black px-1 py-2 font-mono text-left whitespace-nowrap">
                      {rec.visitDate?.substring(5)} {rec.visitTime}
                    </td>
                    <td className="border border-black px-1 py-2 font-sans font-medium">
                      {rec.visitorType}
                    </td>
                    <td className="border border-black px-2 py-2 font-bold text-left">
                      {rec.name || '—'}
                      {rec.isGroup && <span className="font-normal text-[10px]"> (等同行)</span>}
                    </td>
                    <td className="border border-black px-1 py-2 font-mono">{rec.phone || '—'}</td>
                    <td className="border border-black px-1 py-2 font-bold font-mono">
                      {rec.temperature || '—'}
                    </td>
                    <td className="border border-black px-2 py-2 text-left">
                      {rec.visitorType === '志工服務' && (
                        <span>
                          [{rec.serviceUnit || '個人志工'}] {rec.servicePurpose || '陪伴服務'}
                          {rec.companionNames && ` (同行人員: ${rec.companionNames})`}
                          {rec.notes && ` [備註: ${rec.notes}]`}
                        </span>
                      )}
                      {rec.visitorType === '住民家屬' && (
                        <span>
                          探訪長者：{rec.residentName || '—'}
                          {rec.residentBed && ` (${rec.residentBed}床)`}
                          {rec.relationship && ` [${rec.relationship}]`}
                          {rec.notes && ` [備註: ${rec.notes}]`}
                        </span>
                      )}
                      {rec.visitorType === '機構洽公' && (
                        <span>
                          {rec.organization || '洽公單位'} - {rec.officialPurpose || '公務接洽'}
                          {rec.notes && ` [備註: ${rec.notes}]`}
                        </span>
                      )}
                    </td>
                    <td className="border border-black px-1 py-2">
                      {/* 依評鑑規定維持留白，供護理人員親簽 */}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 頁尾簽核欄位 */}
        <div className="mt-8 pt-4 border-t border-black flex justify-between text-xs font-sans" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div className="flex space-x-8">
            <div>
              <span className="font-bold">業務承辦人：</span>
              <span className="inline-block border-b border-black w-24"></span>
            </div>
            <div>
              <span className="font-bold">護理組長：</span>
              <span className="inline-block border-b border-black w-24"></span>
            </div>
            <div>
              <span className="font-bold">機構主管：</span>
              <span className="inline-block border-b border-black w-24"></span>
            </div>
          </div>
          <div className="text-slate-500 text-[10px]">
            評鑑佐證規範：本文件需留存機構 5 年備查
          </div>
        </div>
      </div>
    </div>
  );
}
