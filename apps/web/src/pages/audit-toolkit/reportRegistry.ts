import type { AuditReportConfig } from './auditToolkitTypes';
import { repairReportConfig } from './repairReportConfig';

class ReportRegistry {
  private reports = new Map<string, AuditReportConfig>();

  constructor() {
    // 預設註冊修繕報表
    this.register(repairReportConfig);
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

  /** 重置為預設狀態（保留修繕報表） */
  reset(): void {
    this.reports.clear();
    this.register(repairReportConfig);
  }
}

export const reportRegistry = new ReportRegistry();
