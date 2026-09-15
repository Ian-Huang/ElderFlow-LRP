import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { SandboxItem } from '@/hooks/useSandboxCollection';

export interface DataGridColumn<T> {
  key: string;
  label: string;
  width?: string;
  editable?: boolean;
  type?: 'text' | 'number' | 'date' | 'select';
  selectOptions?: string[];
  defaultVisible?: boolean;
  render?: (value: any, item: SandboxItem<T>) => React.ReactNode;
}

export interface FrontlineDataGridProps<T extends Record<string, any>> {
  title?: string;
  data: SandboxItem<T>[];
  columns: DataGridColumn<T>[];
  onUpdate?: (id: string, patch: Partial<T>) => Promise<void>;
  onDelete?: (id: string, item: SandboxItem<T>) => Promise<void>;
  onBatchDelete?: (ids: string[]) => Promise<void>;
  onPasteImport?: (records: T[]) => Promise<void>;
  onExportCSV?: (filename?: string) => void;
  searchFields?: string[];
  searchPlaceholder?: string;
  categoryFilter?: {
    key: string;
    label: string;
    options: { label: string; value: string }[];
  };
  dateFilterKey?: string;
  extraActions?: React.ReactNode;
}

export function FrontlineDataGrid<T extends Record<string, any>>({
  title,
  data,
  columns,
  onUpdate,
  onDelete,
  onBatchDelete,
  onPasteImport,
  onExportCSV,
  searchFields = [],
  searchPlaceholder = '搜尋表格內容...',
  categoryFilter,
  dateFilterKey,
  extraActions,
}: FrontlineDataGridProps<T>) {
  // 1. 搜尋與篩選狀態
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');

  // 2. 多選狀態
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 3. 行內編輯狀態
  const [editingCell, setEditingCell] = useState<{ id: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // 4. 欄位自訂可見性
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(() => {
    return new Set(columns.filter((c) => c.defaultVisible !== false).map((c) => c.key));
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // 5. 貼上匯入 Modal 狀態
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Focus input when inline editing starts
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  // 過濾資料
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 分類篩選
      if (categoryFilter && selectedCategory !== 'ALL') {
        const itemCat = String(item[categoryFilter.key] || '');
        if (itemCat !== selectedCategory) return false;
      }
      // 日期篩選
      if (dateFilterKey && selectedDate) {
        const itemDate = String(item[dateFilterKey] || '');
        if (!itemDate.startsWith(selectedDate)) return false;
      }
      // 關鍵字搜尋
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const targets = searchFields.length > 0 ? searchFields : columns.map((c) => c.key);
        const match = targets.some((k) => {
          const val = item[k];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(query);
        });
        if (!match) return false;
      }
      return true;
    });
  }, [data, search, selectedCategory, selectedDate, categoryFilter, dateFilterKey, searchFields, columns]);

  // 目前顯示的欄位
  const activeColumns = useMemo(() => {
    return columns.filter((c) => visibleColumnKeys.has(c.key));
  }, [columns, visibleColumnKeys]);

  // 全選 / 反選
  const isAllSelected = filteredData.length > 0 && filteredData.every((item) => selectedIds.has(item.id));
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map((item) => item.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // 批次刪除
  const handleBatchDelete = async () => {
    if (!onBatchDelete || selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (window.confirm(`確定要一次刪除已選取的 ${count} 筆紀錄嗎？此操作將同步雲端並無法復原！`)) {
      await onBatchDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  // 行內編輯完成儲存
  const handleSaveCell = async (id: string, key: string) => {
    if (!onUpdate) {
      setEditingCell(null);
      return;
    }
    const currentItem = data.find((d) => d.id === id);
    if (currentItem && String(currentItem[key] ?? '') !== editValue) {
      await onUpdate(id, { [key]: editValue } as unknown as Partial<T>);
    }
    setEditingCell(null);
  };

  // Google Sheet / Excel 貼上解析器
  const parsedPasteRecords = useMemo(() => {
    if (!pasteRawText.trim()) return [];
    const lines = pasteRawText.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const matrix = lines.map((line) => line.split('\t').map((c) => c.trim()));
    if (matrix.length === 0) return [];

    // 檢查第 1 列是否為表頭
    const firstRow = matrix[0] || [];
    const matchedIndices: { [colIndex: number]: string } = {};

    firstRow.forEach((cellText, idx) => {
      const matchedCol = columns.find(
        (c) =>
          c.label.toLowerCase() === cellText.toLowerCase() ||
          c.key.toLowerCase() === cellText.toLowerCase() ||
          cellText.includes(c.label)
      );
      if (matchedCol) {
        matchedIndices[idx] = matchedCol.key;
      }
    });

    const isHeaderRowPresent = Object.keys(matchedIndices).length >= 2;
    const dataRows = isHeaderRowPresent ? matrix.slice(1) : matrix;

    return dataRows.map((row) => {
      const record: Record<string, any> = {};
      row.forEach((val, colIdx) => {
        const key = isHeaderRowPresent ? matchedIndices[colIdx] : columns[colIdx]?.key;
        if (key) {
          const colDef = columns.find((c) => c.key === key);
          if (colDef?.type === 'number' && !isNaN(Number(val)) && val.trim() !== '') {
            record[key] = Number(val);
          } else {
            record[key] = val;
          }
        }
      });
      return record as T;
    });
  }, [pasteRawText, columns]);

  const handleConfirmImport = async () => {
    if (!onPasteImport || parsedPasteRecords.length === 0) return;
    setIsImporting(true);
    try {
      await onPasteImport(parsedPasteRecords);
      setShowPasteModal(false);
      setPasteRawText('');
      alert(`🎉 成功匯入 ${parsedPasteRecords.length} 筆資料！`);
    } catch (err) {
      alert(`匯入失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center">
            <span className="w-2 h-4 bg-emerald-600 rounded-sm mr-2 inline-block"></span>
            {title}
          </h2>
        </div>
      )}

      {/* 頂部操作工具列 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* 左側搜尋與篩選 */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-48 sm:w-60 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />

          {categoryFilter && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">全部{categoryFilter.label}</option>
              {categoryFilter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {dateFilterKey && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="text-xs text-slate-500 hover:text-slate-800 underline ml-1"
                >
                  清除日期
                </button>
              )}
            </div>
          )}
        </div>

        {/* 右側批次工具與匯出 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 批次刪除按鈕 */}
          {selectedIds.size > 0 && onBatchDelete && (
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-300 flex items-center transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 mr-1 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              刪除已選 ({selectedIds.size})
            </button>
          )}

          {/* 從 Excel/Google Sheet 貼上匯入 */}
          {onPasteImport && (
            <button
              onClick={() => setShowPasteModal(true)}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-300 flex items-center transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 mr-1 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              貼上匯入 (Google Sheet / Excel)
            </button>
          )}

          {/* 欄位自訂下拉 */}
          <div className="relative">
            <button
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 flex items-center transition-colors"
            >
              <svg className="w-4 h-4 mr-1 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              自訂欄位 ({activeColumns.length})
            </button>

            {showColumnDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-30 p-3 max-h-72 overflow-y-auto">
                <div className="text-xs font-bold text-slate-500 mb-2 pb-1 border-b border-slate-100">
                  顯示/隱藏欄位
                </div>
                <div className="space-y-1.5">
                  {columns.map((col) => (
                    <label key={col.key} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumnKeys.has(col.key)}
                        onChange={(e) => {
                          const next = new Set(visibleColumnKeys);
                          if (e.target.checked) next.add(col.key);
                          else if (next.size > 1) next.delete(col.key);
                          setVisibleColumnKeys(next);
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 匯出 CSV */}
          {onExportCSV && (
            <button
              onClick={() => onExportCSV()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 flex items-center transition-colors"
            >
              <svg className="w-4 h-4 mr-1 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              匯出 CSV
            </button>
          )}

          {extraActions}
        </div>
      </div>

      {/* 資料量提示 */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          共 {filteredData.length} 筆資料
          {selectedIds.size > 0 && `（已選取 ${selectedIds.size} 筆）`}
        </span>
        <span className="text-slate-400">💡 提示：雙擊表格文字即可直接編輯儲存，支援 Excel 模式</span>
      </div>

      {/* 類 Excel 資料表格 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider sticky top-0 z-10">
            <tr>
              {/* 多選全選 Checkbox */}
              <th className="w-10 px-3 py-3 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </th>
              {activeColumns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length + 2} className="px-4 py-12 text-center text-slate-400">
                  尚無資料，可點選上方「貼上匯入」快速自 Google Sheet 匯入歷史紀錄！
                </td>
              </tr>
            ) : (
              filteredData.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* 單列選取 Checkbox */}
                    <td className="w-10 px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(item.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>

                    {/* 各欄位內容（支援雙擊行內編輯） */}
                    {activeColumns.map((col) => {
                      const isEditing = editingCell?.id === item.id && editingCell?.key === col.key;
                      const rawValue = item[col.key];

                      return (
                        <td
                          key={col.key}
                          className="px-4 py-2.5 text-xs text-slate-700 whitespace-nowrap cursor-pointer select-none"
                          onDoubleClick={() => {
                            if (col.editable !== false && onUpdate) {
                              setEditingCell({ id: item.id, key: col.key });
                              setEditValue(rawValue !== undefined && rawValue !== null ? String(rawValue) : '');
                            }
                          }}
                          title={col.editable !== false ? '雙擊直接修改' : undefined}
                        >
                          {isEditing ? (
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveCell(item.id, col.key)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveCell(item.id, col.key);
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                              className="px-2 py-1 border-2 border-emerald-500 rounded text-xs w-full bg-white shadow-sm focus:outline-none"
                            />
                          ) : col.render ? (
                            col.render(rawValue, item)
                          ) : (
                            <span className={rawValue === undefined || rawValue === null || rawValue === '' ? 'text-slate-300' : ''}>
                              {rawValue !== undefined && rawValue !== null && rawValue !== '' ? String(rawValue) : '—'}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* 單列刪除操作 */}
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item.id, item)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline ml-2"
                        >
                          刪除
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Google Sheet / Excel 貼上匯入彈出視窗 */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center">
                  📋 從 Excel / Google Sheet 貼上匯入
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  在試算表中選取整塊表格按 Ctrl+C 複製，接著在下方文字框按 Ctrl+V 貼上即可！
                </p>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="my-4 flex-1 flex flex-col min-h-0 space-y-3">
              <textarea
                value={pasteRawText}
                onChange={(e) => setPasteRawText(e.target.value)}
                placeholder="請在此按 Ctrl+V (或 Cmd+V) 貼上複製的表格內容...&#10;系統會自動辨識欄位（即使包含表頭也能自動對齊）"
                className="w-full h-36 p-3 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
              />

              {/* 即時解析預覽 */}
              {parsedPasteRecords.length > 0 && (
                <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 space-y-2 flex-1 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span>✅ 已辨識出 {parsedPasteRecords.length} 筆資料</span>
                    <span className="text-emerald-600 text-[11px]">前 3 筆即時預覽</span>
                  </div>
                  <div className="overflow-x-auto overflow-y-auto max-h-36 bg-white rounded-lg border border-emerald-100">
                    <table className="min-w-full text-[11px] divide-y divide-slate-100">
                      <thead className="bg-slate-50 text-slate-600 font-semibold">
                        <tr>
                          {Object.keys(parsedPasteRecords[0] || {}).map((k) => (
                            <th key={k} className="px-2 py-1 text-left whitespace-nowrap">
                              {columns.find((c) => c.key === k)?.label || k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedPasteRecords.slice(0, 3).map((r, i) => (
                          <tr key={i}>
                            {Object.keys(parsedPasteRecords[0] || {}).map((k) => (
                              <td key={k} className="px-2 py-1 whitespace-nowrap text-slate-700">
                                {String((r as any)[k] ?? '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={isImporting}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={parsedPasteRecords.length === 0 || isImporting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center"
              >
                {isImporting ? '匯入中...' : `確認匯入 ${parsedPasteRecords.length} 筆資料`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
