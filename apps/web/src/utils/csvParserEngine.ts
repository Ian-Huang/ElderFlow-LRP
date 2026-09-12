/**
 * CsvParserEngine
 *
 * 純 TypeScript 無副作用深模組，負責：
 * 1. 解析 CSV 字串並映射至報表欄位結構（含 BOM 剝除、引號轉義、CRLF 容錯）
 * 2. 依欄位規格動態產出 Excel 相容 UTF-8 BOM CSV 範本
 *
 * 完全不依賴瀏覽器 DOM 或 React，可在 Node / Vitest 環境下直接測試。
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 欄位規格 */
export interface ColumnSpec {
  /** 映射至結果物件的 key */
  key: string;
  /** CSV 標頭文字（用於標頭比對與範本生成） */
  label: string;
  /** 必填欄位：若標頭列中缺少此欄位，解析即回報錯誤 */
  required: boolean;
}

/** 報表設定契約 */
export interface AuditReportConfig {
  id: string;
  title: string;
  orientation: 'portrait' | 'landscape';
  columns: ColumnSpec[];
  /** 範本生成時寫入的示範資料列（可為空陣列） */
  sampleData: Record<string, string>[];
}

/** 解析錯誤 */
export interface ParseError {
  type: 'MISSING_REQUIRED_COLUMNS';
  missingColumns: string[];
}

/** Result 型別（tag-union，無 thrown exceptions） */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// ---------------------------------------------------------------------------
// Internal: RFC 4180 compliant tokenizer
// ---------------------------------------------------------------------------

/**
 * 將一整份 CSV 文字切分為二維陣列（rows → cells）。
 * 支援：
 * - CRLF / LF 混合換行
 * - 雙引號包裹（含內部逗號、換行、`""` 跳脫）
 * - 前置 UTF-8 BOM 自動剝除
 */
function tokenize(raw: string): string[][] {
  // 剝除 BOM
  const text = raw.startsWith('\uFEFF') ? raw.slice(1) : raw;

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // 可能是 "" 逃逸或結束引號
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        cell += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
        i++;
      } else if (ch === '\r' && text[i + 1] === '\n') {
        // CRLF
        row.push(cell);
        cell = '';
        rows.push(row);
        row = [];
        i += 2;
      } else if (ch === '\n') {
        row.push(cell);
        cell = '';
        rows.push(row);
        row = [];
        i++;
      } else {
        cell += ch;
        i++;
      }
    }
  }

  // 處理最後一個 cell / row（無尾部換行情形）
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Internal: CSV cell escaping (RFC 4180)
// ---------------------------------------------------------------------------

function escapeCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * 解析 CSV 字串並將每列映射至泛型物件 `T`。
 *
 * @param csvText  原始 CSV 文字（可含 UTF-8 BOM、CRLF/LF、引號轉義）
 * @param config   報表設定（提供欄位規格與必填規則）
 * @returns        Result<T[], ParseError>
 */
export function parseRecordsCsv<T extends Record<string, string>>(
  csvText: string,
  config: AuditReportConfig,
): Result<T[], ParseError> {
  // 完全空白輸入 → 空陣列
  if (!csvText.trim()) {
    return { ok: true, value: [] };
  }

  const allRows = tokenize(csvText);

  // 過濾全空行（所有 cell 皆為空字串的列）
  const nonEmptyRows = allRows.filter((row) => row.some((c) => c.trim() !== ''));

  if (nonEmptyRows.length === 0) {
    return { ok: true, value: [] };
  }

  // 第一列為標頭（nonEmptyRows.length > 0 已在上方確認）
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const headerRow = nonEmptyRows[0]!;
  const dataRows = nonEmptyRows.slice(1);

  // 建立 label → 索引的映射
  const labelToIndex = new Map<string, number>();
  headerRow.forEach((label, idx) => {
    labelToIndex.set(label.trim(), idx);
  });

  // 檢查必填欄位
  const missingColumns = config.columns
    .filter((col) => col.required && !labelToIndex.has(col.label))
    .map((col) => col.label);

  if (missingColumns.length > 0) {
    return {
      ok: false,
      error: { type: 'MISSING_REQUIRED_COLUMNS', missingColumns },
    };
  }

  // 映射資料列
  const records = dataRows.map((row) => {
    const record: Record<string, string> = {};
    for (const col of config.columns) {
      const idx = labelToIndex.get(col.label);
      record[col.key] = idx !== undefined ? (row[idx] ?? '').trim() : '';
    }
    return record as T;
  });

  return { ok: true, value: records };
}

/**
 * 依欄位規格動態產出 CSV 範本文字。
 * - 以 `\uFEFF` (UTF-8 BOM) 開頭，確保 Excel 正確識別繁體中文
 * - 標頭列後若 `config.sampleData` 非空則附加示範資料列
 *
 * @param config   報表設定
 * @returns        含 BOM 之 CSV 字串
 */
export function generateTemplate(config: AuditReportConfig): string {
  const BOM = '\uFEFF';

  // 標頭列
  const headerLine = config.columns.map((col) => escapeCell(col.label)).join(',');

  // 示範資料列
  const dataLines = config.sampleData.map((row) =>
    config.columns.map((col) => escapeCell(row[col.key] ?? '')).join(','),
  );

  const allLines = [headerLine, ...dataLines];
  return BOM + allLines.join('\n');
}
