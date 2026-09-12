import type { AuditReportConfig, AuditColumnDef } from './auditToolkitTypes';
import { repairReportConfig } from './repairReportConfig';
import { sanitationReportConfig, sanitationReportColumns } from './sanitationReportConfig';

/** 訪客與志工實名登記追蹤表欄位規格 (橫向 A4) */
export const visitorReportColumns: AuditColumnDef[] = [
  { key: 'date', label: '日期', required: true, widthPercent: 10, align: 'center' },
  { key: 'timeIn', label: '進入時間', required: true, widthPercent: 8, align: 'center' },
  { key: 'visitorName', label: '訪客/志工姓名', required: true, widthPercent: 12, align: 'center' },
  { key: 'relationship', label: '身分/關係', required: true, widthPercent: 10, align: 'center' },
  { key: 'residentName', label: '探訪住民/事由', required: true, widthPercent: 20, align: 'left' },
  { key: 'temperature', label: '體溫(℃)', required: true, widthPercent: 8, align: 'center' },
  { key: 'healthCheck', label: '健康聲明', required: false, widthPercent: 12, align: 'center' },
  { key: 'timeOut', label: '離開時間', required: false, widthPercent: 8, align: 'center' },
  { key: 'signature', label: '簽名/註記', required: false, widthPercent: 12, align: 'center' },
];

/** 預告模組：機構訪客與志工實名登記追蹤表 (Phase 2 擴充) */
export const visitorReportConfig: AuditReportConfig = {
  id: 'visitors',
  title: '2026年度 機構訪客與志工實名登記追蹤表',
  orgName: '臺北市私立中山老人長期照顧中心(養護型)',
  description: '訪客與志工出入體溫、關懷對象、健康聲明與出入時間追蹤表記錄（橫向 A4 評鑑規格）',
  orientation: 'landscape',
  status: 'coming-soon',
  columns: visitorReportColumns,
  sampleData: [],
};

class ReportRegistry {
  private reports = new Map<string, AuditReportConfig>();

  constructor() {
    this.reset();
  }

  /** 註冊報表設定 */
  register(config: AuditReportConfig): void {
    this.reports.set(config.id, config);
  }

  /** 依 ID 取得報表設定 */
  get(id: string): AuditReportConfig | undefined {
    return this.reports.get(id);
  }

  /** 取得所有已註冊之報表設定清單 */
  getAll(): AuditReportConfig[] {
    return Array.from(this.reports.values());
  }

  /** 清空註冊表（主要用於測試） */
  clear(): void {
    this.reports.clear();
  }

  /** 重置為預設狀態（保留修繕報表、環境清潔消毒記錄表與預告之訪客報表） */
  reset(): void {
    this.reports.clear();
    this.register(repairReportConfig);
    this.register(sanitationReportConfig);
    this.register(visitorReportConfig);
  }
}

export const reportRegistry = new ReportRegistry();
export { sanitationReportConfig, sanitationReportColumns };
