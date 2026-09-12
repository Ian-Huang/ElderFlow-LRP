import { useState, useEffect } from 'react';
import type { PdfExportRequest } from '@lrp/shared';
import { useExportPdf } from './useReports';

export interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReportType?: PdfExportRequest['reportType'];
  initialParameters?: Record<string, unknown>;
}

export function PdfExportModal({
  isOpen,
  onClose,
  initialReportType = 'completion-report',
  initialParameters = {},
}: PdfExportModalProps) {
  const [reportType, setReportType] = useState<PdfExportRequest['reportType']>(initialReportType);
  const [selectedDate, setSelectedDate] = useState<string>(
    (initialParameters.date as string) || (new Date().toISOString().split('T')[0] ?? '')
  );
  const [dateFrom, setDateFrom] = useState<string>(
    (initialParameters.dateFrom as string) ||
      (new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '')
  );
  const [dateTo, setDateTo] = useState<string>(
    (initialParameters.dateTo as string) || (new Date().toISOString().split('T')[0] ?? '')
  );
  const [entityType, setEntityType] = useState<string>((initialParameters.entityType as string) || '');
  const [floor, setFloor] = useState<string>((initialParameters.floor as string) || '');
  const [residentFilter, setResidentFilter] = useState<string>(
    (initialParameters.residentId as string) || ''
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const exportMutation = useExportPdf();

  useEffect(() => {
    if (isOpen) {
      setReportType(initialReportType);
      if (initialParameters.date) setSelectedDate(initialParameters.date as string);
      if (initialParameters.dateFrom) setDateFrom(initialParameters.dateFrom as string);
      if (initialParameters.dateTo) setDateTo(initialParameters.dateTo as string);
      if (initialParameters.entityType) setEntityType(initialParameters.entityType as string);
      setPreviewUrl(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const buildParameters = (): Record<string, unknown> => {
    const params: Record<string, unknown> = {};
    if (reportType === 'completion-report') {
      params.date = selectedDate;
    } else if (reportType === 'audit-trail') {
      params.dateFrom = dateFrom;
      params.dateTo = dateTo;
      if (entityType) params.entityType = entityType;
    } else if (reportType === 'resident-list' || reportType === 'bed-map') {
      if (floor) params.floor = floor;
    }
    if (residentFilter) {
      params.residentId = residentFilter;
    }
    return params;
  };

  const handleDownload = async () => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      const params = buildParameters();
      const blob = await exportMutation.mutateAsync({
        reportType,
        parameters: params,
      });

      const fileName = `report-${reportType}-${selectedDate || Date.now()}.pdf`;
      if (typeof window !== 'undefined' && typeof window.URL?.createObjectURL === 'function') {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      }
      setSuccessMessage(`報表 ${fileName} 下載成功！`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '匯出報表失敗，請稍後再試');
    }
  };

  const handlePreview = async () => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      const params = buildParameters();
      const blob = await exportMutation.mutateAsync({
        reportType,
        parameters: params,
      });

      if (typeof window !== 'undefined' && typeof window.URL?.createObjectURL === 'function') {
        const url = window.URL.createObjectURL(blob);
        setPreviewUrl(url);
        if (typeof window.open === 'function') {
          window.open(url, '_blank');
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '預覽報表失敗，請稍後再試');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="card-header flex items-center justify-between border-b border-gray-200">
          <h2 id="pdf-modal-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            產生 PDF 報表
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
            aria-label="關閉彈窗"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="card-body space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg" role="alert">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg" role="status">
              {successMessage}
            </div>
          )}

          <div>
            <label htmlFor="report-type-select" className="label">
              選擇報表類型
            </label>
            <select
              id="report-type-select"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as PdfExportRequest['reportType'])}
              className="input"
            >
              <option value="completion-report">每日照護完成度報表 (Completion Report)</option>
              <option value="resident-list">住民名冊與健康狀態 (Resident List)</option>
              <option value="tube-statistics">管路與三管照護統計 (Tube Statistics)</option>
              <option value="bed-map">床位配置與佔床圖 (Bed Map)</option>
              <option value="audit-trail">合規稽核軌跡歷程 (Audit Trail)</option>
            </select>
          </div>

          {/* Conditional parameters */}
          {reportType === 'completion-report' && (
            <div>
              <label htmlFor="report-date-input" className="label">
                報表日期
              </label>
              <input
                id="report-date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input"
              />
            </div>
          )}

          {reportType === 'audit-trail' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="report-date-from" className="label">
                  起始日期
                </label>
                <input
                  id="report-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="report-date-to" className="label">
                  結束日期
                </label>
                <input
                  id="report-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="report-entity-filter" className="label">
                  實體類型篩選
                </label>
                <select
                  id="report-entity-filter"
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="input"
                >
                  <option value="">全部實體</option>
                  <option value="Resident">住民 (Resident)</option>
                  <option value="CareRecord">照護紀錄 (CareRecord)</option>
                  <option value="Medication">用藥紀錄 (Medication)</option>
                  <option value="CarePlan">照護計畫 (CarePlan)</option>
                </select>
              </div>
            </div>
          )}

          {(reportType === 'resident-list' || reportType === 'bed-map') && (
            <div>
              <label htmlFor="report-floor-select" className="label">
                樓層篩選
              </label>
              <select
                id="report-floor-select"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="input"
              >
                <option value="">全機構 (All Floors)</option>
                <option value="1F">1 樓 (1F)</option>
                <option value="2F">2 樓 (2F)</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="report-resident-filter" className="label">
              住民篩選 (選填)
            </label>
            <input
              id="report-resident-filter"
              type="text"
              placeholder="輸入住民姓名或住民代碼 (例如 RES-001)"
              value={residentFilter}
              onChange={(e) => setResidentFilter(e.target.value)}
              className="input"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">📄 匯出格式說明</p>
            <p>• 規格：標準 A4 直式／橫式排版，中文高解析度字體渲染</p>
            <p>• 機構驗證：具備自動數位防偽時間戳與系統稽核代碼</p>
          </div>

          {previewUrl && (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">PDF 預覽已就緒</span>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary-600 hover:underline"
                >
                  新分頁開啟
                </a>
              </div>
              <iframe
                src={previewUrl}
                title="PDF 報表預覽"
                className="w-full h-40 rounded border border-gray-300"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="card-footer border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary text-sm"
            disabled={exportMutation.isPending}
          >
            取消
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={exportMutation.isPending}
            className="btn btn-secondary text-sm"
          >
            {exportMutation.isPending ? '產生中...' : '預覽'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={exportMutation.isPending}
            className="btn btn-primary text-sm flex items-center gap-2"
          >
            {exportMutation.isPending ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                匯出中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                下載 PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
