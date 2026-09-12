# 規格：評鑑報表工具箱 (Audit Toolkit)

Status: ready-for-agent
Triage-Label: ready-for-agent

## Problem Statement

長照機構目前面臨雙重夾擊的營運與數位化困境：
1. **現有舊系統僵化且難用**：機構現有套裝系統的修繕通報與行政表單介面繁瑣，僅適用於傳統桌機，第一線護理與照服人員無法在手機上即時操作；且其系統匯出的列印報表格式死板、跑版嚴重，難以直接作為衛福部長照評鑑的高品質佐證文件。
2. **影子 IT (Shadow IT) 與資料孤島危機**：由於無法委請原廠工程師修改，機構同仁被迫自力救濟，各自利用 Google Apps Script (GAS) 與 Google Sheet 刻出訪客表單或各自整理修繕檔案。這造成資料散落各處、無單一事實來源 (Single Source of Truth)，且訪客個資與健康資料存於個人雲端，存在評鑑與個資法規查核的重大資安合規風險。
3. **主系統開發期與評鑑急迫性的時間差**：LRP 主系統（包含權限、完整資料庫與審核流）尚在推進中，無法在一夕之間全面取代所有日常行政流程；若等待全套系統開發完畢才交付，機構將持續飽受評鑑整備的紙本折磨。

## Solution

在 LRP 系統中設立**「評鑑報表工具箱 (Audit Toolkit)」**專區，作為實用主義的過渡橋樑 (Pragmatic Bridge)：
- **短期應急（解救評鑑）**：提供純前端、無伺服器依賴的 A4 評鑑報表產製引擎。第一線人員可直接下載標準 CSV 範本、整理既有歷史資料後一鍵匯入，並在螢幕上以「模擬實體 A4 紙張」預覽，支援畫面上直接修改標題字樣（`contenteditable`），並透過瀏覽器原生列印引擎一鍵輸出極具規範、自動換頁表頭重現的標準 A4 評鑑追蹤文件。首發模組為「機構修繕通報追蹤記錄」（8 欄標準規格）。
- **中期整合（無痛接軌）**：該專區架構預先保留標準資料型別與接縫，未來資料庫 (DB) 建置完成後，工具箱的操作介面保持不變，背後資料來源將由「讀取本機 CSV」平滑升級為「直接讀取 LRP 機構資料庫歷史資料」，達成真正的單一事實來源。

## User Stories

1. As a 機構主任 / 負責人, I want a 能夠輸出符合衛福部評鑑標準排版的 A4 機構修繕通報追蹤記錄, so that 評鑑委員查核時能迅速檢視清楚完整的通報、稽核與修繕結案軌跡。
2. As a 行政 / 總務人員, I want a 能夠一鍵下載標準 UTF-8 CSV 匯入範本, so that 我能用習慣的 Excel 或試算表快速整理過往累積的修繕歷史紀錄。
3. As a 行政 / 總務人員, I want a 能夠將準備好的 CSV 檔直接拖曳或選取匯入系統, so that 系統能在瞬間將數十筆至上百筆歷史紀錄載入表格，無需手動逐筆重新輸入。
4. As a 行政人員, I want a 在網頁畫面上直接點擊並微調機構抬頭名稱與年度文字 (contenteditable), so that 面對不同評鑑年度或臨時調整名稱時能即時自訂而不受程式限制。
5. As a 第一線工作人員, I want a 能夠在畫面上直接點擊「＋ 模擬新增一筆資料」, so that 我在尚未準備 CSV 時也能快速測試排版與預覽列印效果。
6. As a 操作人員, I want a 點擊「立即列印 / PDF」時能自動隱藏螢幕工具列與控制按鈕, so that 輸出的紙本或 PDF 僅包含純粹嚴謹的制式評鑑報表。
7. As a 評鑑受評人員, I want a 匯入大量資料導致文件多頁時，每一頁底部表格行都不會被文字截斷，且每一頁頂部都會自動重複標題列 (thead), so that 跨頁列印的文件整齊美觀且符合公文標準。
8. As a 護理長 / 督導, I want a 表格欄位嚴格遵循去蕪存菁的 8 欄配置（日期、時間、通報人員、事由、稽核、修繕、日期(完)、時間(完)）, so that 留出足夠空間完整展示「事由」與「修繕」詳細文字，避免擁擠換行。
9. As a 機構資安專責人員, I want a 所有的 CSV 檔案解析完全於本機瀏覽器端執行，不向不可信的外部雲端上傳任何資料, so that 機構內部的設備狀況與通報人員資料獲得充分保護。
10. As a 終端使用者, I want a 在沒有網路連線（離線環境）或本地雙擊打開 HTML 檔案時依然能正常匯入 CSV 與預覽列印, so that 系統不受網路偶發斷線之干擾。
11. As a 系統管理員, I want a 在 LRP 系統主導覽列中看見「評鑑報表工具箱」專區入口, so that 我能將各種評鑑相關的快速報表產製工具集中管理。
12. As a 開發工程師, I want a CSV 解析與欄位映射邏輯為無副作用的純 TypeScript 模組, so that 該邏輯能以極高速度進行自動化單元測試，涵蓋空值、逗號與引號跳脫等邊界案例。
13. As a 開發工程師, I want a 工具箱設計為可擴充的多工具架構, so that 未來能輕鬆加入第二個工具模組（如訪客與志工紀錄單）。
14. As a 系統架構師, I want a 修繕記錄的資料模型與未來的資料庫 Entity Schema 保持高度一致, so that 中期從 CSV 模式升級為 DB 模式時無需推翻重寫。
15. As a 機構同仁, I want a 匯入錯誤或格式不符時系統能給予明確防呆提示, so that 我能及時修正試算表內的缺漏欄位。

## Implementation Decisions

### 1. 模組架構與註冊中心接縫 (Registry & Seam Architecture)
- **宣告式報表註冊中心 (Audit Report Registry)**：
  - 工具箱不為每張報表寫死硬編碼頁面，而是採「核心引擎 + 註冊表 (Registry Pattern)」架構。
  - 定義通用的報表設定契約 `AuditReportConfig`：包含報表代碼 (`id`)、名稱 (`title`)、紙張方向 (`orientation: 'portrait' | 'landscape'`)、欄位規格清單 (`columns`)、預設範例資料 (`sampleData`)。
  - 未來新增第 2 個（如訪客紀錄單）、第 3 個突發表單時，開發者僅需撰寫並註冊一份宣告式 Config，即可自動獲得工具箱入口、CSV 範本產生、本機匯入與 A4 自動分頁列印能力。
- **最高測試接縫：`CsvParserEngine`**
  - 將 CSV 解析、引號轉義處理、UTF-8 BOM 清理與欄位驗證封裝為獨立的純 TypeScript 深模組。
  - 對外介面提供：
    - `parseRecordsCsv<T>(csvText: string, config: AuditReportConfig): Result<T[], ParseError>`
    - `generateTemplate(config: AuditReportConfig): string`
  - 完全不依賴瀏覽器 DOM 或 React，具備極佳的 Locality 與可測試性。
- **UI 與列印視圖接縫：`AuditToolkit / ReportView`**
  - 核心外殼 `AuditReportShell` 統一負責模擬 A4 紙張、工具列、筆數統計與 `contenteditable` 標題編輯。
  - 系統主路由 `/audit-toolkit` 提供工具箱總覽首頁（Gallery），子路由 `/audit-toolkit/:reportId` 依註冊資料動態渲染對應報表。
  - 首發註冊模組為 `repairs`（機構修繕通報追蹤記錄）。
  - 同時保留獨立靜態檔案 `apps/web/public/preview-repair-report.html`，以備離線應急與獨立單檔分發之需。

### 2. 資料結構規範 (Type Shape)
從原型中驗證確立之修繕紀錄實體型別：
```typescript
export interface RepairRecord {
  id: string;
  date: string;          // YYYY/MM/DD
  time: string;          // HH:mm
  reporter: string;      // 通報人員
  reason: string;        // 通報事由
  auditor: string;       // 主管稽核
  repairAction: string;  // 修繕處理狀況
  completedDate: string; // 完成日期 YYYY/MM/DD
  completedTime: string; // 完成時間 HH:mm
}
```

### 3. A4 列印引擎標準規範 (A4 Paged Media Standard)
經原型實證之關鍵 CSS 規則（編碼進 React 元件與共用 Print 樣式）：
```css
@page {
  size: A4 portrait;
  margin: 14mm 10mm 14mm 10mm;
}

@media print {
  body { background: transparent !important; }
  .no-print { display: none !important; }
  .a4-sheet {
    width: 100% !important;
    min-height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
  }
  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  thead {
    display: table-header-group;
  }
}
```

### 4. 8 欄位黃金比例配置
- 日期：11% (置中)
- 時間：7% (置中)
- 通報人員：10% (置中)
- 事由：35% (靠左對齊，最大化留白容納描述)
- 稽核：9% (置中)
- 修繕：12% (置中)
- 日期(完)：9% (置中)
- 時間(完)：7% (置中)
- 邊框：外框 `2.2px solid #000`，內框 `1.2px solid #000`，確保廉價黑白印表機列印清晰無灰階。

### 5. 中期資料庫遷移計畫 (Migration Path)
- 在現有離線優先架構中擴充 `RepairRepository`，以相同的 `RepairRecord` 介面提供 `list()`、`importBatch(records)`。
- 在工具箱介面增加「模式切換」：
  - `Mode: CSV`（短期模式：載入即覽即印，無須登入）
  - `Mode: DB`（中期模式：從機構 IndexedDB/API 撈取指定年度直接產製）

## Testing Decisions

### 1. 單元測試 (Unit Tests - Pure TypeScript)
- **測試目標**：`CsvParserEngine`
- **測試內容**：
  - 正常 8 欄 CSV 解析與 BOM 去除。
  - 欄位包含逗號（如 `"事由包含,逗號"`）的引號轉義處理。
  - 空行、換行符（CRLF 與 LF 混合）之容錯與過濾。
  - 缺少必填欄位時的回報與防呆。
  - 範本生成（`generateRepairRecordsTemplate`）是否能產出相容 Excel 的 UTF-8 BOM 格式。
- **參考對照**：專案既有之純邏輯單元測試（如 `shared-types.test.ts`）。

### 2. 元件與列印測試 (Component & Rendering Tests)
- **測試目標**：`RepairReportPrintView`
- **測試內容**：
  - 渲染 0 筆、1 筆、50 筆資料時的 DOM 節點數量正確性。
  - 表頭、標題（機構全銜）之可編輯狀態驗證。
  - 工具列與列印控制按鈕在列印樣式類別（`.no-print`）的正確套用。

## Out of Scope

1. **多重電子公文簽核流**：本規格專注於產製供委員查核之紙本/PDF 列印記錄，不包含多層級的線上電子簽章 (PKI) 系統。
2. **三聯式複寫紙或標籤貼紙列印**：本規格僅支援標準 A4 紙張列印。
3. **訪客登記表之橫向 A4 實作**：訪客紀錄單屬於 Audit Toolkit 的 Phase 2 擴充項目，本規格先確立工具箱架構與修繕模組。

## Further Notes

- 此模組為 LRP 系統提供最快能交付給機構第一線同仁使用的實用功能。
- 專案公用目錄現已具備可直接運行的獨立原型：[`preview-repair-report.html`](file:///Users/ian.huang/aiProjects/LRP/apps/web/public/preview-repair-report.html)。
