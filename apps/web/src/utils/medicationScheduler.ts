import type {
  MedicationFrequency,
  MedicationStockStatus,
  MedicationAdministration,
} from '@lrp/shared';

export const DEFAULT_SCHEDULES: Record<MedicationFrequency, string[]> = {
  OnceDaily: ['08:00'],
  TwiceDaily: ['08:00', '18:00'],
  ThreeTimesDaily: ['08:00', '12:00', '18:00'],
  FourTimesDaily: ['08:00', '12:00', '18:00', '21:00'],
  AsNeeded: [],
};

export const FREQUENCY_LABELS: Record<MedicationFrequency, string> = {
  OnceDaily: '每日一次 (QD)',
  TwiceDaily: '每日兩次 (BID)',
  ThreeTimesDaily: '每日三次 (TID)',
  FourTimesDaily: '每日四次 (QID)',
  AsNeeded: '需要時使用 (PRN)',
};

/**
 * 計算下一次給藥排程時間
 * @param schedule 給藥時間點陣列，如 ["08:00", "12:00", "18:00"]
 * @param fromDate 基準時間點（預設當前時間）
 * @returns ISO 8601 時間字串
 */
export function calculateNextScheduled(schedule: string[], fromDate = new Date()): string {
  if (!schedule || schedule.length === 0) {
    // 若為 PRN (需要時)，預設回傳 4 小時後
    const next = new Date(fromDate.getTime() + 4 * 60 * 60 * 1000);
    return next.toISOString();
  }

  // 排序時間表
  const sortedTimes = [...schedule].sort();

  const currentHours = fromDate.getHours();
  const currentMinutes = fromDate.getMinutes();
  const currentMinutesTotal = currentHours * 60 + currentMinutes;

  for (const timeStr of sortedTimes) {
    const parts = timeStr.split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    const slotMinutesTotal = h * 60 + m;

    if (slotMinutesTotal > currentMinutesTotal) {
      const nextDate = new Date(fromDate);
      nextDate.setHours(h, m, 0, 0);
      return nextDate.toISOString();
    }
  }

  // 若今日時段皆已過，取明日第一個時段
  const firstSlot = sortedTimes[0] || '08:00';
  const parts = firstSlot.split(':');
  const h = parseInt(parts[0] || '8', 10);
  const m = parseInt(parts[1] || '0', 10);

  const tomorrow = new Date(fromDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(h, m, 0, 0);
  return tomorrow.toISOString();
}

/**
 * 取得藥品庫存狀態等級 (Normal / RunningLow / OutOfStock)
 */
export function getMedicationStockStatus(
  stockLevel: number,
  reorderThreshold = 15
): MedicationStockStatus {
  if (stockLevel <= 0) return 'OutOfStock';
  if (stockLevel <= reorderThreshold) return 'RunningLow';
  return 'Normal';
}

/**
 * 判斷兩筆給藥紀錄是否為重複 (同住民 + 同藥品 + 時間相距 30 分鐘內)
 */
export function isDuplicateAdministration(
  a: Partial<MedicationAdministration>,
  b: Partial<MedicationAdministration>
): boolean {
  if (a.residentId !== b.residentId || a.medicationId !== b.medicationId) {
    return false;
  }

  const timeA = new Date(a.actualTime || a.scheduledTime || a.createdAt || '').getTime();
  const timeB = new Date(b.actualTime || b.scheduledTime || b.createdAt || '').getTime();

  if (isNaN(timeA) || isNaN(timeB)) return false;

  // 30 分鐘 (1800000 毫秒) 內視為重複
  return Math.abs(timeA - timeB) < 30 * 60 * 1000;
}
