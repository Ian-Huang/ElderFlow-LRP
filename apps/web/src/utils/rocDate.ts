/**
 * ROC (民國年) 與西元日期轉換與長照輔助工具函式
 */

/**
 * 將民國年字串（如 "035/01/13"、"111/01/21"、"97/04/12"、"111-01-21"）或西元字串轉換為 ISO 格式 "YYYY-MM-DD"
 */
export function rocToIso(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // 若已經是西元格式 YYYY-MM-DD 或 YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
    const y = isoMatch[1];
    const m = isoMatch[2];
    const d = isoMatch[3];
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 民國年格式：YYY/MM/DD 或 YY/MM/DD
  const rocMatch = trimmed.match(/^(\d{1,3})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (rocMatch && rocMatch[1] && rocMatch[2] && rocMatch[3]) {
    const rocYearStr = rocMatch[1];
    const m = rocMatch[2];
    const d = rocMatch[3];
    const rocYear = parseInt(rocYearStr, 10);
    const adYear = 1911 + rocYear;
    return `${adYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return trimmed;
}

/**
 * 將西元日期字串 "YYYY-MM-DD" 轉換為標準民國年字串 "YYY/MM/DD" (例如 "1946-01-13" -> "035/01/13")
 */
export function isoToRoc(isoStr: string): string {
  if (!isoStr || typeof isoStr !== 'string') return '';
  const isoDate = rocToIso(isoStr);
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !match[1] || !match[2] || !match[3]) return '';

  const y = match[1];
  const m = match[2];
  const d = match[3];
  const adYear = parseInt(y, 10);
  const rocYear = adYear - 1911;
  if (rocYear <= 0) return isoStr;

  const rocYearFormatted = rocYear < 100 ? String(rocYear).padStart(3, '0') : String(rocYear);
  return `${rocYearFormatted}/${m}/${d}`;
}

/**
 * 格式化顯示民國年與西元對照
 * 例如: "民國 111 年 01 月 21 日 (2022/01/21)"
 */
export function formatRocDateDisplay(dateStr: string): string {
  const iso = rocToIso(dateStr);
  if (!iso) return '—';
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !match[1] || !match[2] || !match[3]) return dateStr;

  const y = match[1];
  const m = match[2];
  const d = match[3];
  const adYear = parseInt(y, 10);
  const rocYear = adYear - 1911;
  return `民國 ${rocYear} 年 ${m} 月 ${d} 日 (${y}/${m}/${d})`;
}

/**
 * 計算年齡
 */
export function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;
  const iso = rocToIso(dateOfBirth);
  const birth = new Date(iso);
  if (isNaN(birth.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * 判斷是否為三管住民（鼻胃管、尿管/導尿管、氣切管）
 */
export function isThreePipe(pipes: string[] | string | undefined | null): boolean {
  if (!pipes) return false;
  const pipeList = Array.isArray(pipes) ? pipes : parsePipesString(pipes);
  if (pipeList.length === 0) return false;

  const threePipeKeywords = ['鼻胃管', '胃管', '尿管', '導尿管', '氣切管', '氣切'];
  return pipeList.some((p) => threePipeKeywords.some((k) => p.includes(k)));
}

/**
 * 解析管路字串為陣列
 */
export function parsePipesString(pipesStr: string | undefined | null): string[] {
  if (!pipesStr) return [];
  return pipesStr
    .split(/[,、，;\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * 格式化西元日期為 YYYY/MM/DD
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const iso = rocToIso(dateStr);
  if (!iso) return dateStr;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}/${match[2]}/${match[3]}`;
  }
  return dateStr;
}

/**
 * 格式化日期時間為 YYYY/MM/DD HH:mm
 */
export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
