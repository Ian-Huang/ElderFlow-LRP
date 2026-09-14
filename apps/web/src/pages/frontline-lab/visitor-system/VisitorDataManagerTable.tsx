import { useState, useMemo } from 'react';
import { useSandboxCollection, type SandboxItem } from '@/hooks/useSandboxCollection';
import type { VisitorRecord } from './VisitorPublicKioskForm';

export function VisitorDataManagerTable() {
  const { data, isLoading, error, update, remove, exportCSV } =
    useSandboxCollection<VisitorRecord>('visitors');

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [editingItem, setEditingItem] = useState<SandboxItem<VisitorRecord> | null>(null);
  const [editTemp, setEditTemp] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filterType !== 'ALL' && item.visitorType !== filterType) {
        return false;
      }
      if (selectedDate && item.visitDate !== selectedDate) {
        return false;
      }
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchName = item.name?.toLowerCase().includes(query);
        const matchPhone = item.phone?.toLowerCase().includes(query);
        const matchUnit = item.serviceUnit?.toLowerCase().includes(query);
        const matchOrg = item.organization?.toLowerCase().includes(query);
        const matchRes = item.residentName?.toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchUnit && !matchOrg && !matchRes) {
          return false;
        }
      }
      return true;
    });
  }, [data, filterType, selectedDate, search]);

  const handleOpenEdit = (item: SandboxItem<VisitorRecord>) => {
    setEditingItem(item);
    setEditName(item.name || '');
    setEditPhone(item.phone || '');
    setEditTemp(item.temperature || '36.5');
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    await update(editingItem.id, {
      name: editName,
      phone: editPhone,
      temperature: editTemp,
    });
    setEditingItem(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`確定要刪除訪客「${name}」的這筆登記嗎？（刪除後無法復原）`)) {
      await remove(id);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">載入訪客資料庫中...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-rose-500">資料讀取發生錯誤：{error.message}</div>;
  }

  return (
    <div className="space-y-4">
      {/* 工具列 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="搜尋姓名、電話、單位、長輩..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-48 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">全部身分</option>
            <option value="志工服務">志工服務</option>
            <option value="住民家屬">住民家屬</option>
            <option value="機構洽公">機構洽公</option>
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              清除日期
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500">共 {filteredData.length} 筆資料</span>
          <button
            onClick={() => exportCSV('中山訪客與志工紀錄.csv')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 flex items-center transition-colors"
          >
            <svg className="w-4 h-4 mr-1 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            匯出 Excel (CSV)
          </button>
        </div>
      </div>

      {/* 資料表格 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">日期/時間</th>
              <th className="px-4 py-3 text-left">身分/類別</th>
              <th className="px-4 py-3 text-left">姓名</th>
              <th className="px-4 py-3 text-left">電話</th>
              <th className="px-4 py-3 text-left">體溫</th>
              <th className="px-4 py-3 text-left">事由 / 單位 / 長輩</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  尚無訪客紀錄，請由訪客端進行登記！
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-mono text-xs">
                    {item.visitDate} {item.visitTime}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        item.visitorType === '志工服務'
                          ? 'bg-purple-100 text-purple-800'
                          : item.visitorType === '住民家屬'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.visitorType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                    {item.name}
                    {item.isGroup && (
                      <span className="ml-1 text-xs text-emerald-600 font-normal">
                        (團體同行)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 text-xs whitespace-nowrap">
                    {item.phone}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        parseFloat(item.temperature) >= 37.5
                          ? 'text-rose-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {item.temperature}°C
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate text-xs">
                    {item.visitorType === '志工服務' && (
                      <span>
                        [{item.serviceUnit}] {item.servicePurpose}
                        {item.companionNames && ` (同行: ${item.companionNames})`}
                      </span>
                    )}
                    {item.visitorType === '住民家屬' && (
                      <span>
                        探視: {item.residentName} ({item.relationship})
                      </span>
                    )}
                    {item.visitorType === '機構洽公' && (
                      <span>
                        {item.organization} - {item.officialPurpose}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      修改
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="text-xs text-rose-600 hover:text-rose-800 hover:underline"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 編輯彈窗 */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">修改訪客紀錄</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">電話</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">體溫 (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editTemp}
                  onChange={(e) => setEditTemp(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors"
              >
                儲存更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
