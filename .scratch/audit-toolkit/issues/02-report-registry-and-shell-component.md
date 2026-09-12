# 02: 報表註冊中心與通用外殼組件 (Audit Report Registry & ReportShell)

**What to build:**
建立宣告式的「報表註冊中心 (Audit Report Registry)」型別架構與通用的 `AuditReportShell` UI 外殼元件。透過 `AuditReportConfig` 契約宣告報表識別碼、標題、紙張方向（直向 portrait 或橫向 landscape）與欄位定義，使任何評鑑表單皆能隨插即用。通用外殼元件提供擬真 A4 紙張預覽、頂部工具列、動態資料筆數計算、支援 `contenteditable` 標題點擊即改，並自動串接本機 CSV 檔案選取與範本下載事件。

**Blocked by:** 01: 評鑑報表核心引擎與 CSV 解析器 (Core Print Engine & CsvParserEngine)

**Status:** ready-for-agent

- [ ] 定義 `AuditReportConfig`、`AuditColumnDef` 與 `ReportOrientation` 領域型別契約。
- [ ] 實作 `AuditReportShell` 元件，於螢幕上呈現擬真 A4 紙張與邊界陰影效果。
- [ ] 支援依據 `orientation` 動態切換直向（A4 Portrait）或橫向（A4 Landscape）排版。
- [ ] 頂部工具列具備「下載 CSV 範本」、「匯入 CSV 檔」與「立即列印 / PDF」控制按鈕，並於列印時自動隱藏（`.no-print`）。
- [ ] 標題與年度文字區域支援點擊直接編輯 (`contenteditable="true"`)，改動即時反映於預覽與列印。
- [ ] 整合檔案選取器 (`<input type="file">`)，檔案讀取完畢後自動呼叫 `CsvParserEngine` 觸發資料更新。
- [ ] 撰寫元件測試，驗證外殼在直向/橫向下的渲染狀態與按鈕事件觸發。
