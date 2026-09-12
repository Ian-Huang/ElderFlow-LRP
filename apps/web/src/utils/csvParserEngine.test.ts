import { describe, it, expect } from 'vitest';
import {
  CsvParserEngine,
  type AuditReportConfig,
  type ColumnSpec,
} from './csvParserEngine';

// 8-column repair record config used across all tests
const repairColumns: ColumnSpec[] = [
  { key: 'date',          label: '日期',         required: true },
  { key: 'time',          label: '時間',         required: true },
  { key: 'reporter',      label: '通報人員',     required: true },
  { key: 'reason',        label: '通報事由',     required: true },
  { key: 'auditor',       label: '主管稽核',     required: false },
  { key: 'repairAction',  label: '修繕處理狀況', required: false },
  { key: 'completedDate', label: '完成日期',     required: false },
  { key: 'completedTime', label: '完成時間',     required: false },
];

const repairConfig: AuditReportConfig = {
  id: 'repairs',
  title: '機構修繕通報追蹤記錄',
  orientation: 'portrait',
  columns: repairColumns,
  sampleData: [],
};

/** 剝除 BOM、以 LF 分割、過濾空行（用於 generateTemplate 斷言） */
function parseLines(template: string): string[] {
  return template.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
}

// ---------------------------------------------------------------------------
// CsvParserEngine.parse
// ---------------------------------------------------------------------------

describe('CsvParserEngine.parse', () => {
  describe('正常 8 欄 CSV 解析', () => {
    it('解析標準 CSV 字串並映射至指定欄位結構', () => {
      const csv = [
        '日期,時間,通報人員,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間',
        '2024/01/15,09:30,王大明,203房浴室燈泡損壞,李主任,已更換燈泡,2024/01/16,14:00',
      ].join('\n');

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!).toMatchObject({
        date: '2024/01/15',
        time: '09:30',
        reporter: '王大明',
        reason: '203房浴室燈泡損壞',
        auditor: '李主任',
        repairAction: '已更換燈泡',
        completedDate: '2024/01/16',
        completedTime: '14:00',
      });
    });

    it('解析多列資料並全部回傳', () => {
      const csv = [
        '日期,時間,通報人員,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間',
        '2024/01/15,09:30,王大明,203房燈泡損壞,李主任,已更換,2024/01/16,14:00',
        '2024/02/10,11:00,陳美玲,走廊地磚鬆脫,張督導,已修補,2024/02/12,10:30',
      ].join('\n');

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(2);
      expect(result.value[1]!).toMatchObject({ reporter: '陳美玲' });
    });
  });

  describe('BOM 剝除', () => {
    it('自動剝除 UTF-8 BOM 標頭 (\\uFEFF)', () => {
      const csv =
        '\uFEFF日期,時間,通報人員,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間\n' +
        '2024/01/15,09:30,王大明,燈泡損壞,李主任,已更換,2024/01/16,14:00';

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(1);
    });

    it('無 BOM 時仍可正常解析', () => {
      const csv =
        '日期,時間,通報人員,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間\n' +
        '2024/01/15,09:30,王大明,燈泡損壞,,,,';

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(1);
    });
  });

  describe('引號轉義處理', () => {
    it('解析含逗號的文字欄位（雙引號包裹）', () => {
      const csv = [
        '日期,時間,通報人員,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間',
        '2024/01/15,09:30,王大明,"203房, 呼叫鈴故障",李主任,已修繕,2024/01/16,14:00',
      ].join('\n');

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value[0]!.reason).toBe('203房, 呼叫鈴故障');
    });

    it('解析欄位內含雙引號（RFC 4180 "" 轉義）', () => {
      const csv = [
        '日期,時間,通報人員,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間',
        '2024/01/15,09:30,王大明,"說明含""引號""的事由",李主任,已修繕,2024/01/16,14:00',
      ].join('\n');

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value[0]!.reason).toBe('說明含"引號"的事由');
    });

    it('解析欄位內含換行的文字（雙引號包裹）', () => {
      const csv =
        '日期,時間,通報人員,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間\n' +
        '2024/01/15,09:30,王大明,"第一行\n第二行",李主任,已修繕,2024/01/16,14:00';

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value[0]!.reason).toBe('第一行\n第二行');
    });

    it('引號包裹欄位保留前後空白（RFC 4180 不自動 trim 引號內容）', () => {
      const csv = [
        '日期,時間,通報人員,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間',
        '2024/01/15,09:30,王大明,"  有意義的前導空白  ",李主任,已修繕,2024/01/16,14:00',
      ].join('\n');

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value[0]!.reason).toBe('  有意義的前導空白  ');
    });
  });

  describe('空行與換行容錯', () => {
    it('自動過濾空行', () => {
      const csv = [
        '日期,時間,通報人員,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間',
        '',
        '2024/01/15,09:30,王大明,燈泡損壞,李主任,已更換,2024/01/16,14:00',
        '',
      ].join('\n');

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(1);
    });

    it('容錯相容 CRLF 換行格式', () => {
      const csv =
        '日期,時間,通報人員,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間\r\n' +
        '2024/01/15,09:30,王大明,燈泡損壞,李主任,已更換,2024/01/16,14:00\r\n';

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(1);
    });

    it('容錯相容 LF 與 CRLF 混合換行格式', () => {
      const csv =
        '日期,時間,通報人員,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間\r\n' +
        '2024/01/15,09:30,王大明,燈泡損壞,李主任,已更換,2024/01/16,14:00\n' +
        '2024/02/10,11:00,陳美玲,地磚鬆脫,張督導,已修補,2024/02/12,10:30\r\n';

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(2);
    });
  });

  describe('必填欄位防呆', () => {
    it('缺少必填欄位時回傳錯誤並指出缺失欄位', () => {
      const csv = [
        '日期,時間,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間',
        // 標頭少了「通報人員」(required)
        '2024/01/15,09:30,燈泡損壞,李主任,已更換,2024/01/16,14:00',
      ].join('\n');

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.type).toBe('MISSING_REQUIRED_COLUMNS');
      expect(result.error.missingColumns).toContain('通報人員');
    });

    it('僅缺少非必填欄位時仍成功解析，缺失欄位填入空字串', () => {
      const csv = [
        '日期,時間,通報人員,通報事由',
        // 沒有 auditor, repairAction, completedDate, completedTime (all non-required)
        '2024/01/15,09:30,王大明,燈泡損壞',
      ].join('\n');

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(1);
      const [row] = result.value;
      expect(row!.auditor).toBe('');
      expect(row!.repairAction).toBe('');
    });
  });

  describe('畸形資料邊界案例', () => {
    it('僅有標頭列時回傳空陣列', () => {
      const csv = '日期,時間,通報人員,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間';

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(0);
    });

    it('欄位數少於標頭時將缺失欄位視為空字串', () => {
      const csv = [
        '日期,時間,通報人員,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間',
        '2024/01/15,09:30,王大明', // 只有 3 個值
      ].join('\n');

      const result = CsvParserEngine.parse(csv, repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const [row] = result.value;
      expect(row!.reason).toBe('');
    });

    it('完全空字串輸入時回傳空陣列', () => {
      const result = CsvParserEngine.parse('', repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(0);
    });

    it('僅含空白字元的輸入回傳空陣列', () => {
      const result = CsvParserEngine.parse('   \n  \n  ', repairConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// CsvParserEngine.generateTemplate
// ---------------------------------------------------------------------------

describe('CsvParserEngine.generateTemplate', () => {
  it('依據欄位清單產出 CSV 範本文字，以標籤名稱作為標頭', () => {
    const lines = parseLines(CsvParserEngine.generateTemplate(repairConfig));

    expect(lines[0]!).toBe(
      '日期,時間,通報人員,通報事由,主管稽核,修繕處理狀況,完成日期,完成時間',
    );
  });

  it('產出的範本以 UTF-8 BOM (\\uFEFF) 開頭（相容 Excel）', () => {
    const template = CsvParserEngine.generateTemplate(repairConfig);

    expect(template.startsWith('\uFEFF')).toBe(true);
  });

  it('行分隔符採 CRLF（RFC 4180 / Excel 跨平台相容）', () => {
    const configWithSample: AuditReportConfig = {
      ...repairConfig,
      sampleData: [
        {
          date: '2024/01/15', time: '09:30', reporter: '王大明',
          reason: '燈泡', auditor: '', repairAction: '',
          completedDate: '', completedTime: '',
        },
      ],
    };

    const raw = CsvParserEngine.generateTemplate(configWithSample).replace(/^\uFEFF/, '');

    expect(raw).toContain('\r\n');
    // joining 2 lines with CRLF → split gives exactly 2 segments (header + data)
    expect(raw.split('\r\n')).toHaveLength(2);
  });

  it('標頭之後包含一行示範資料列，欄位值正確對應', () => {
    const sampleRow = {
      date: '2024/01/15', time: '09:30', reporter: '王大明',
      reason: '203房燈泡損壞', auditor: '李主任',
      repairAction: '已更換燈泡', completedDate: '2024/01/16', completedTime: '14:00',
    };
    const configWithSample: AuditReportConfig = {
      ...repairConfig,
      sampleData: [sampleRow],
    };

    const lines = parseLines(CsvParserEngine.generateTemplate(configWithSample));

    expect(lines).toHaveLength(2); // 標頭 + 1 筆示範資料
    expect(lines[1]!).toBe(
      '2024/01/15,09:30,王大明,203房燈泡損壞,李主任,已更換燈泡,2024/01/16,14:00',
    );
  });

  it('欄位值含逗號時自動加雙引號包裹', () => {
    const configWithComma: AuditReportConfig = {
      ...repairConfig,
      sampleData: [
        {
          date: '2024/01/15', time: '09:30', reporter: '王大明',
          reason: '203房, 呼叫鈴故障', auditor: '',
          repairAction: '', completedDate: '', completedTime: '',
        },
      ],
    };

    const lines = parseLines(CsvParserEngine.generateTemplate(configWithComma));

    expect(lines[1]!).toContain('"203房, 呼叫鈴故障"');
  });

  it('無 sampleData 時僅輸出標頭列', () => {
    const lines = parseLines(CsvParserEngine.generateTemplate(repairConfig));

    expect(lines).toHaveLength(1);
  });
});
