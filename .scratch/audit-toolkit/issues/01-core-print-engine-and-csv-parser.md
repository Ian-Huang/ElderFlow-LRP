# 01: 評鑑報表核心引擎與 CSV 解析器 (Core Print Engine & CsvParserEngine)

**What to build:**
建立無副作用的純 TypeScript `CsvParserEngine` 與共用 A4 列印樣式規範。此模組作為全系統評鑑報表解析的核心接縫，能將傳入的 CSV 字串（包含去除 UTF-8 BOM、處理雙引號轉義與逗號分隔）正確映射至報表欄位結構，並能依報表欄位規格動態產出具備 BOM 的 Excel 相容 CSV 範本。同時定義全域列印樣式，確保 A4 紙張在列印時隱藏非列印元素、避免跨頁截斷表格行，並使表頭在跨頁時自動重現。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `CsvParserEngine.parse()` 能正確解析標準 CSV 字串並映射至指定欄位結構。
- [ ] 支援處理包含雙引號與逗號的文字欄位（如 `"203房, 呼叫鈴故障"`）。
- [ ] 自動過濾空行、容錯相容 CRLF 與 LF 換行格式。
- [ ] 能自動剝除 UTF-8 BOM 標頭（`\uFEFF`），避免表頭文字比對失敗。
- [ ] `CsvParserEngine.generateTemplate()` 能依據傳入的欄位清單產出合規之 CSV 範本文字。
- [ ] 撰寫純單元測試，達成 100% 邏輯與邊界案例覆蓋（涵蓋畸形資料、缺少欄位防呆）。
- [ ] 封裝共用 A4 列印樣式規則（`@page`、`@media print`、`break-inside: avoid`、`thead` 重複）。
