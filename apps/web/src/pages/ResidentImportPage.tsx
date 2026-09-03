import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/apiClient';
import type { Resident } from '@lrp/shared';

interface PreviewItem {
  row: number;
  isValid: boolean;
  errors: string[];
  resident: Partial<Resident> & Record<string, unknown>;
}

interface ImportPreviewResponse {
  dryRun: boolean;
  total: number;
  validCount: number;
  errorCount: number;
  items: PreviewItem[];
}

export function ResidentImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File parsing (JSON or CSV)
  const processFile = async (file: File) => {
    setSelectedFileName(file.name);
    setErrorMessage(null);
    setImportSuccessMessage(null);
    setIsLoadingPreview(true);

    try {
      const text = await file.text();
      let records: Array<Record<string, unknown>> = [];

      if (file.name.endsWith('.json')) {
        const json = JSON.parse(text);
        records = Array.isArray(json) ? json : [json];
      } else if (file.name.endsWith('.csv')) {
        records = parseCsv(text);
      } else {
        throw new Error('僅支援 .json 或 .csv 格式之檔案');
      }

      if (records.length === 0) {
        throw new Error('檔案內無資料紀錄');
      }

      // Perform dry-run preview call
      const res = await apiClient.post<ImportPreviewResponse>('/residents/import', {
        data: records,
        dryRun: true,
      });

      if (res.success && res.data) {
        setPreviewResult(res.data);
      } else {
        throw new Error(res.error?.message || '資料驗證失敗');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : '解析檔案失敗，請檢查檔案格式');
      setPreviewResult(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      void processFile(e.target.files[0]);
    }
  };

  // Re-run dry-run when inline changes are made
  const handleItemFieldChange = (index: number, field: string, value: string) => {
    if (!previewResult) return;
    const updatedItems = [...previewResult.items];
    const target = updatedItems[index];
    if (!target) return;

    target.resident[field] = value;
    setPreviewResult({
      ...previewResult,
      items: updatedItems,
    });
  };

  const handleRevalidate = async () => {
    if (!previewResult) return;
    setIsLoadingPreview(true);
    setErrorMessage(null);
    try {
      const dataToValidate = previewResult.items.map((i) => i.resident);
      const res = await apiClient.post<ImportPreviewResponse>('/residents/import', {
        data: dataToValidate,
        dryRun: true,
      });
      if (res.success && res.data) {
        setPreviewResult(res.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : '重新驗證發生錯誤');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Final confirmation import
  const handleConfirmImport = async () => {
    if (!previewResult) return;
    setIsImporting(true);
    setErrorMessage(null);

    try {
      const validRecords = previewResult.items
        .filter((item) => item.isValid)
        .map((item) => item.resident);

      if (validRecords.length === 0) {
        throw new Error('目前沒有通過檢核之住民資料可供匯入');
      }

      const res = await apiClient.post<{ success: boolean; importedCount: number }>('/residents/import', {
        data: validRecords,
        dryRun: false,
      });

      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['residents'] });
        setImportSuccessMessage(`成功匯入 ${validRecords.length} 筆住民資料！`);
        setPreviewResult(null);
      } else {
        throw new Error(res.error?.message || '匯入失敗');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : '匯入發生錯誤');
    } finally {
      setIsImporting(false);
    }
  };

  // Download template helpers
  const handleDownloadSampleJson = () => {
    const sample = [
      {
        序號: '1',
        姓名: '周吳綺緣',
        性別: '女',
        生日: '035/01/13',
        身分證號: 'A201529776',
        住民編號: '0040',
        床位: '1-1',
        第一聯絡姓名: '周士剛',
        第一聯絡關係: '母子',
        第一聯絡手機: '0955034033',
        入住日期: '111/01/21',
        管路: '尿管、鼻胃管',
        身份別: '一般戶',
        依賴程度: '完全依賴',
      },
    ];
    downloadBlob(JSON.stringify(sample, null, 2), 'resident_import_sample.json', 'application/json');
  };

  const handleDownloadSampleCsv = () => {
    const headers = '姓名,性別,生日,身分證號,住民編號,床位,入住日期,管路,身份別,依賴程度,第一聯絡姓名,第一聯絡手機\n';
    const row = '周吳綺緣,女,035/01/13,A201529776,0040,1-1,111/01/21,"尿管、鼻胃管",一般戶,完全依賴,周士剛,0955034033\n';
    downloadBlob('\uFEFF' + headers + row, 'resident_import_sample.csv', 'text/csv');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <Link to="/residents" className="btn-ghost text-xs mb-2 inline-flex items-center text-gray-500 hover:text-gray-900">
          <ArrowLeftIcon className="w-4 h-4 mr-1" aria-hidden="true" />
          返回住民列表
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">住民基本資料批次匯入</h1>
        <p className="text-gray-500 text-sm mt-1">
          支援長照機構 Excel/CSV/JSON 清冊匯入。自動進行民國年轉換、三管規則辨識與床位衝突驗證。
        </p>
      </div>

      {/* Success Notification */}
      {importSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            <span className="font-bold text-sm">{importSuccessMessage}</span>
          </div>
          <button
            onClick={() => navigate('/residents')}
            className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-1.5 px-3"
          >
            前往住民清單檢視
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-xl" role="alert">
          {errorMessage}
        </div>
      )}

      {/* Upload Box & Templates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="card-body p-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">上傳匯入檔案</h2>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <UploadCloudIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" aria-hidden="true" />
              <p className="text-sm font-semibold text-gray-800">
                點擊選取檔案 或 將檔案拖曳至此處
              </p>
              <p className="text-xs text-gray-500 mt-1">支援 JSON 或 CSV 格式清冊</p>
              {selectedFileName && (
                <p className="text-xs text-primary-700 font-mono font-bold mt-3">
                  已選取檔案：{selectedFileName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Templates and Guidance */}
        <div className="card">
          <div className="card-body p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900">匯入規則與範本下載</h2>
            <ul className="text-xs text-gray-600 space-y-2 list-disc list-inside">
              <li>生日與入住日支援民國年（如 035/01/13, 111/01/21）。</li>
              <li>留置管路填寫「尿管、鼻胃管」自動判定為三管住民。</li>
              <li>系統自動檢查住民編號與床位是否重複。</li>
            </ul>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleDownloadSampleJson}
                className="btn-secondary w-full text-xs py-2 justify-center"
              >
                下載 JSON 範例範本
              </button>
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="btn-secondary w-full text-xs py-2 justify-center"
              >
                下載 CSV 範例範本
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoadingPreview && (
        <div className="card p-12 text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" aria-label="載入中" />
          <p>正在分析驗證檔案內容與長照業務規則...</p>
        </div>
      )}

      {/* Dry Run Preview Section */}
      {previewResult && !isLoadingPreview && (
        <div className="card space-y-4">
          <div className="card-body p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">匯入預覽與資料檢核 (Dry-run)</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  共解析 {previewResult.total} 筆 · 通過檢核：
                  <span className="text-emerald-600 font-bold ml-1">{previewResult.validCount} 筆</span>
                  {previewResult.errorCount > 0 && (
                    <span className="text-danger-600 font-bold ml-2">· 待修正：{previewResult.errorCount} 筆</span>
                  )}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRevalidate}
                  className="btn-secondary text-xs py-1.5 px-3"
                  title="在線上修改後重新驗證"
                >
                  重新驗證
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting || previewResult.validCount === 0}
                  className="btn-primary text-xs py-1.5 px-4"
                >
                  {isImporting ? '匯入中...' : `確認匯入通過資料 (${previewResult.validCount} 筆)`}
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs" role="table">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500 font-semibold text-left">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">驗證狀態</th>
                    <th className="px-3 py-2">姓名</th>
                    <th className="px-3 py-2">住民編號</th>
                    <th className="px-3 py-2">身分證號</th>
                    <th className="px-3 py-2">床位</th>
                    <th className="px-3 py-2">生日 (民國)</th>
                    <th className="px-3 py-2">管路</th>
                    <th className="px-3 py-2">檢核錯誤訊息</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {previewResult.items.map((item, idx) => (
                    <tr
                      key={idx}
                      className={item.isValid ? 'hover:bg-gray-50' : 'bg-danger-50 hover:bg-danger-100'}
                    >
                      <td className="px-3 py-2 font-mono text-gray-500">{item.row}</td>
                      <td className="px-3 py-2">
                        {item.isValid ? (
                          <span className="badge-success text-[11px]">合格</span>
                        ) : (
                          <span className="badge-danger text-[11px]">異常</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={String(item.resident.name || '')}
                          onChange={(e) => handleItemFieldChange(idx, 'name', e.target.value)}
                          className="input text-xs py-1 px-2 w-28"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={String(item.resident.residentId || '')}
                          onChange={(e) => handleItemFieldChange(idx, 'residentId', e.target.value)}
                          className="input text-xs py-1 px-2 w-24 font-mono"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={String(item.resident.insuranceId || '')}
                          onChange={(e) => handleItemFieldChange(idx, 'insuranceId', e.target.value)}
                          className="input text-xs py-1 px-2 w-28 font-mono"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={String(item.resident.bedNumber || '')}
                          onChange={(e) => handleItemFieldChange(idx, 'bedNumber', e.target.value)}
                          className="input text-xs py-1 px-2 w-20 font-mono"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {item.resident.dateOfBirth}
                      </td>
                      <td className="px-3 py-2">
                        {Array.isArray(item.resident.pipes)
                          ? item.resident.pipes.join('、')
                          : String(item.resident.pipes || '—')}
                      </td>
                      <td className="px-3 py-2 text-danger-700 font-medium">
                        {item.errors.join('；')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function parseCsv(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0]!.split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
  const results: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i]!;
    const rowValues = rawLine.split(',').map((v) => v.replace(/^["']|["']$/g, '').trim());
    const obj: Record<string, string> = {};
    headers.forEach((header, colIdx) => {
      obj[header] = rowValues[colIdx] || '';
    });
    results.push(obj);
  }

  return results;
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
}

function UploadCloudIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>;
}

function CheckCircleIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
