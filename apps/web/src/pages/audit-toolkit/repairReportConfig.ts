import type { AuditReportConfig } from './auditToolkitTypes';

/**
 * 8 欄黃金比例欄位定義：
 * 1. 日期 (11%, 置中)
 * 2. 時間 (7%, 置中)
 * 3. 通報人員 (10%, 置中)
 * 4. 事由 (35%, 置左留白 6px)
 * 5. 稽核 (9%, 置中)
 * 6. 修繕 (12%, 置中)
 * 7. 日期(完) (9%, 置中)
 * 8. 時間(完) (7%, 置中)
 * 寬度百分比總和剛好 100%。
 */
export const repairReportColumns = [
  { key: 'date', label: '日期', required: true, widthPercent: 11, align: 'center' as const },
  { key: 'time', label: '時間', required: true, widthPercent: 7, align: 'center' as const },
  { key: 'reporter', label: '通報人員', required: true, widthPercent: 10, align: 'center' as const },
  { key: 'reason', label: '事由', required: true, widthPercent: 35, align: 'left' as const },
  { key: 'auditor', label: '稽核', required: false, widthPercent: 9, align: 'center' as const },
  { key: 'action', label: '修繕', required: false, widthPercent: 12, align: 'center' as const },
  { key: 'completedDate', label: '日期(完)', required: false, widthPercent: 9, align: 'center' as const },
  { key: 'completedTime', label: '時間(完)', required: false, widthPercent: 7, align: 'center' as const },
];

/** 6 筆長照真實情境預設範例資料 */
export const defaultRepairSampleData: Record<string, string>[] = [
  {
    date: '2026/09/01',
    time: '11:00',
    reporter: '黃郁婷',
    reason: '護理站鍵盤無法使用',
    auditor: '趙芬蘭',
    action: '購新',
    completedDate: '2026/09/02',
    completedTime: '08:00',
  },
  {
    date: '2026/09/03',
    time: '09:15',
    reporter: '陳美玲',
    reason: '203房 2床 床頭緊急呼叫鈴按鈕接觸不良',
    auditor: '趙芬蘭',
    action: '更換微動開關',
    completedDate: '2026/09/03',
    completedTime: '11:30',
  },
  {
    date: '2026/09/05',
    time: '14:20',
    reporter: '張建志',
    reason: '106房 王奶奶輪椅右側煞車夾片鬆動，推行易滑動',
    auditor: '趙芬蘭',
    action: '調整鎖緊並實測煞車',
    completedDate: '2026/09/05',
    completedTime: '15:00',
  },
  {
    date: '2026/09/07',
    time: '16:40',
    reporter: '李秀英',
    reason: '2F多功能活動室冷氣室內機出風口凝結滴水',
    auditor: '趙芬蘭',
    action: '清通排水軟管管線',
    completedDate: '2026/09/08',
    completedTime: '10:20',
  },
  {
    date: '2026/09/10',
    time: '08:50',
    reporter: '黃郁婷',
    reason: '公用無障礙洗手間L型安全扶手固定膨脹螺絲鬆動',
    auditor: '趙芬蘭',
    action: '重新補膠固定螺栓',
    completedDate: '2026/09/10',
    completedTime: '14:00',
  },
  {
    date: '2026/09/11',
    time: '19:30',
    reporter: '王宗翰',
    reason: '1F 後側避難走道應急照明指示燈閃爍不亮',
    auditor: '趙芬蘭',
    action: '更換LED蓄電池燈組',
    completedDate: '2026/09/12',
    completedTime: '09:10',
  },
];

/**
 * 模擬新增用之動態資料池（循環注入）
 */
export const mockRepairPool: Record<string, string>[] = [
  {
    date: '2026/09/13',
    time: '10:10',
    reporter: '林秀玲',
    reason: '301房 洗手台冷熱水水龍頭滴漏',
    auditor: '趙芬蘭',
    action: '更換止水皮墊',
    completedDate: '2026/09/13',
    completedTime: '14:30',
  },
  {
    date: '2026/09/15',
    time: '15:45',
    reporter: '許雅婷',
    reason: '復健區 平行桿固定高度旋鈕滑牙鬆脫',
    auditor: '趙芬蘭',
    action: '重新攻牙並換裝星型旋鈕',
    completedDate: '2026/09/16',
    completedTime: '09:00',
  },
  {
    date: '2026/09/18',
    time: '08:30',
    reporter: '陳美玲',
    reason: '205房 電動護理床上升段微動開關感應延遲',
    auditor: '趙芬蘭',
    action: '校準馬達微動開關行程',
    completedDate: '2026/09/18',
    completedTime: '11:00',
  },
  {
    date: '2026/09/20',
    time: '17:20',
    reporter: '黃郁婷',
    reason: '廚房 靜電油煙處理機運轉有異常金屬摩擦音',
    auditor: '趙芬蘭',
    action: '軸承潤滑保養與扇葉除垢',
    completedDate: '2026/09/21',
    completedTime: '10:00',
  },
  {
    date: '2026/09/22',
    time: '09:00',
    reporter: '張建志',
    reason: '5F 護理推車後輪萬向輪軸承卡入棉絮轉向困難',
    auditor: '趙芬蘭',
    action: '清除異物並補高壓黃油',
    completedDate: '2026/09/22',
    completedTime: '10:15',
  },
  {
    date: '2026/09/25',
    time: '13:40',
    reporter: '王宗翰',
    reason: 'B1 避難走道排煙閘門手動拉把鋼索微卡頓',
    auditor: '趙芬蘭',
    action: '鋼索除鏽上油潤滑測試',
    completedDate: '2026/09/25',
    completedTime: '16:00',
  },
];

/**
 * 依索引自動態資料池循環取得下一筆資料
 */
export function getNextMockRepair(currentIndex: number): { item: Record<string, string>; nextIndex: number } {
  const poolSize = mockRepairPool.length;
  const index = ((currentIndex % poolSize) + poolSize) % poolSize;
  const item = mockRepairPool[index]!;
  return {
    item,
    nextIndex: (index + 1) % poolSize,
  };
}

/** 機構修繕通報追蹤記錄 報表宣告設定檔 */
export const repairReportConfig: AuditReportConfig = {
  id: 'repairs',
  title: '2026年度 機構修繕通報追蹤記錄',
  orgName: '臺北市私立中山老人長期照顧中心(養護型)',
  description: '機構內部設施損壞通報、修繕與評鑑稽核追蹤表記錄（8欄評鑑格式）',
  orientation: 'portrait',
  columns: repairReportColumns,
  sampleData: defaultRepairSampleData,
};
