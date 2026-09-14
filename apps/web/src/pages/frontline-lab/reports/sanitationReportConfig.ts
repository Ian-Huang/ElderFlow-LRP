import type { AuditReportConfig, AuditColumnDef } from './auditToolkitTypes';

/**
 * 環境清潔消毒紀錄表 查核項目定義 (參考最新 F-環安-004 長照評鑑制式規格)
 */
export interface SanitationItemDef {
  id: string;
  label: string;
}

export const SANITATION_ITEMS: SanitationItemDef[] = [
  { id: 'floor', label: '地 面' },
  { id: 'tableChair', label: '桌 椅' },
  { id: 'supplies', label: '一般用品' },
  { id: 'window', label: '窗 戶' },
  { id: 'wardrobeBed', label: '衣櫃.床' },
  { id: 'laundry', label: '衣物清潔' },
  { id: 'toilet1', label: '廁所1' },
  { id: 'toilet2', label: '廁所2' },
];

/**
 * 環境清潔消毒紀錄表欄位規格 (直向 A4 一頁制式規格)
 */
export const sanitationReportColumns: AuditColumnDef[] = [
  { key: 'date', label: '日期', required: true, widthPercent: 8, align: 'center' },
  { key: 'shift', label: '班別', required: true, widthPercent: 8, align: 'center' },
  { key: 'floor', label: '地面', required: true, widthPercent: 10, align: 'center' },
  { key: 'tableChair', label: '桌椅', required: true, widthPercent: 10, align: 'center' },
  { key: 'supplies', label: '一般用品', required: true, widthPercent: 10, align: 'center' },
  { key: 'window', label: '窗戶', required: true, widthPercent: 10, align: 'center' },
  { key: 'wardrobeBed', label: '衣櫃.床', required: true, widthPercent: 10, align: 'center' },
  { key: 'laundry', label: '衣物清潔', required: true, widthPercent: 10, align: 'center' },
  { key: 'toilet1', label: '廁所1', required: true, widthPercent: 10, align: 'center' },
  { key: 'toilet2', label: '廁所2', required: true, widthPercent: 10, align: 'center' },
  { key: 'signature', label: '清潔簽名', required: false, widthPercent: 10, align: 'center' },
  { key: 'auditor', label: '查核', required: false, widthPercent: 10, align: 'center' },
];

/** 向下相容別名 */
export const DAILY_TWICE_KEYS = [
  'floor',
  'tableChair',
  'supplies',
  'window',
  'wardrobeBed',
  'laundry',
  'toilet1',
  'toilet2',
] as const;

export const DAILY_FOUR_TIMES_KEYS = DAILY_TWICE_KEYS;

/**
 * 判斷指定年、月、日是否為未來日期
 * 長照評鑑明確規範：未來的時間絕對不可預先打勾或簽核！
 */
export function isFutureDate(
  year: number,
  month: number,
  day: number,
  referenceDate: Date = new Date(),
): boolean {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;
  const currentDay = referenceDate.getDate();

  if (year > currentYear) return true;
  if (year < currentYear) return false;

  if (month > currentMonth) return true;
  if (month < currentMonth) return false;

  return day > currentDay;
}

/**
 * 依據 年、月、日、項目、班別 計算隨機種子
 * 保證不同月份的同一天、不同項目、不同班別均呈現不同的手感筆跡、角度與大小，杜絕千篇一律
 */
export function getHandwrittenSeed(
  year: number,
  month: number,
  day: number,
  itemIdx: number,
  shift: string,
): number {
  const shiftVal = shift === '日' ? 1013 : 2017;
  let h = 2166136261;
  h = Math.imul(h ^ year, 16777619);
  h = Math.imul(h ^ (month * 89), 16777619);
  h = Math.imul(h ^ (day * 389), 16777619);
  h = Math.imul(h ^ (itemIdx * 73), 16777619);
  h = Math.imul(h ^ shiftVal, 16777619);
  return Math.abs(h);
}

/**
 * 依年份與月份動態生成該月每日清潔消毒紀錄資料（供 CSV 匯出與預設資料）
 * 自動防呆：未來的時間欄位保持空白，絕不預先勾選
 *
 * @param year 西元年份（如 2026）
 * @param month 月份（1 ~ 12）
 * @param cleanerName 清潔人員名稱（預設為空字串，留白簽名）
 * @param referenceDate 參照基準時間（預設當前時間）
 */
export function generateMonthSanitationData(
  year: number,
  month: number,
  cleanerName: string = '',
  referenceDate: Date = new Date(),
): Record<string, string>[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const rows: Record<string, string>[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const isFuture = isFutureDate(year, month, d, referenceDate);
    const checkVal = isFuture ? '' : '✔';

    ['日', '夜'].forEach((shift) => {
      const row: Record<string, string> = {
        date: String(d),
        shift,
        floor: checkVal,
        tableChair: checkVal,
        supplies: checkVal,
        window: checkVal,
        wardrobeBed: checkVal,
        laundry: checkVal,
        toilet1: checkVal,
        toilet2: checkVal,
        signature: isFuture ? '' : cleanerName,
        auditor: '',
      };
      rows.push(row);
    });
  }

  return rows;
}

/** 預設範例資料：2026 年 9 月份完整雙班次日常清潔消毒紀錄（遵循未來時間不勾） */
export const defaultSanitationSampleData = generateMonthSanitationData(2026, 9, '');

/** 環境清潔消毒紀錄表宣告設定檔（F-環安-004 直向 A4 一頁式） */
export const sanitationReportConfig: AuditReportConfig = {
  id: 'sanitation',
  title: '環境清潔消毒紀錄表',
  orgName: '臺北市私立中山老人長期照顧中心(養護型)',
  description: '長照評鑑 F-環安-004 制式三旬分期排版（1~31日）、日夜雙班次、未來防呆不預勾、月份隨機多變打勾、直向 A4 滿版零空白',
  orientation: 'portrait',
  status: 'available',
  columns: sanitationReportColumns,
  sampleData: defaultSanitationSampleData,
};
