import { apiClient } from '@/api/apiClient';
import type {
  DailyCompletionReport,
  ResidentSummaryReport,
  AlertReportItem,
  AuditEntry,
  PaginatedResponse,
  PdfExportRequest,
} from '@lrp/shared';

export interface AuditTrailQueryParams {
  page?: number;
  pageSize?: number;
  entityType?: string;
  entityId?: string;
  actionType?: string;
  changedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const reportsApi = {
  async getDailyCompletion(date?: string): Promise<DailyCompletionReport> {
    const res = await apiClient.get<DailyCompletionReport>('/reports/daily-completion', { date });
    if (!res.data) throw new Error('無法取得每日照護完成度報表');
    return res.data;
  },

  async getResidentSummary(): Promise<ResidentSummaryReport> {
    const res = await apiClient.get<ResidentSummaryReport>('/reports/resident-summary');
    if (!res.data) throw new Error('無法取得住民狀態概覽報表');
    return res.data;
  },

  async getAlerts(params?: { severity?: string; status?: string }): Promise<AlertReportItem[]> {
    const res = await apiClient.get<AlertReportItem[]>('/reports/alerts', params);
    return res.data || [];
  },

  async updateAlertStatus(
    id: string,
    status: 'open' | 'acknowledged' | 'resolved'
  ): Promise<AlertReportItem> {
    const res = await apiClient.patch<AlertReportItem>(`/reports/alerts/${id}`, { status });
    if (!res.data) throw new Error('更新警示狀態失敗');
    return res.data;
  },

  async getAuditTrail(params: AuditTrailQueryParams = {}): Promise<PaginatedResponse<AuditEntry>> {
    const res = await apiClient.get<PaginatedResponse<AuditEntry>>('/reports/audit-trail', params as Record<string, unknown>);
    if (!res.data) throw new Error('無法取得稽核軌跡資料');
    return res.data;
  },

  async exportPdf(request: PdfExportRequest): Promise<Blob> {
    return apiClient.postBlob('/reports/pdf', request);
  },
};
