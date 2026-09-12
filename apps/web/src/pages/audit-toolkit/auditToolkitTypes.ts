/**
 * 評鑑報表工具箱領域型別契約
 *
 * 這些型別是工具箱的核心抽象接縫，與 CsvParserEngine 及 AuditReportShell 共用。
 * AuditReportConfig 同時作為 Registry 的宣告單元，使每個表單隨插即用。
 */

/** 紙張方向 */
export type ReportOrientation = 'portrait' | 'landscape';

/** 欄位定義（對應 CsvParserEngine 的 ColumnSpec） */
export interface AuditColumnDef {
  /** 映射至資料物件的 key */
  key: string;
  /** CSV 標頭文字（用於標頭比對與範本生成） */
  label: string;
  /** 必填欄位：若 CSV 標頭列中缺少此欄位，解析回報錯誤 */
  required: boolean;
  /** 欄位寬度百分比（可選，供列印排版使用） */
  widthPercent?: number;
  /** 對齊方式（可選） */
  align?: 'left' | 'center' | 'right';
}

/** 報表設定契約（Registry 的宣告單元） */
export interface AuditReportConfig {
  /** 報表唯一識別碼（對應路由 /audit-toolkit/:reportId） */
  id: string;
  /** 報表顯示名稱（作為預設頁首標題） */
  title: string;
  /** 紙張方向 */
  orientation: ReportOrientation;
  /** 欄位定義清單（決定 CSV 解析與列印欄位） */
  columns: AuditColumnDef[];
  /** 範本 CSV 附帶的示範資料列（可為空陣列） */
  sampleData: Record<string, string>[];
  /** 機構全銜（可選，預設頁首機構名稱） */
  orgName?: string;
  /** 報表功能簡述（可選，供總覽卡片與導覽展示使用） */
  description?: string;
  /** 報表發布狀態（可選，預設為 'available'） */
  status?: 'available' | 'coming-soon';
}
