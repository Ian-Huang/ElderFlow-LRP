# 03: 首發模組：機構修繕通報追蹤記錄 (Repair Report Config & 8-Column View)

**What to build:**
以宣告式 Config 實作並註冊首發模組「機構修繕通報追蹤記錄」。遵循 8 欄黃金比例（日期、時間、通報人員、事由、稽核、修繕、日期完、時間完），搭配粗黑實線（2.2px 外框、1.2px 內格線）的評鑑級制式表格。提供長照機構真實場景的預設測試資料與動態新增單筆功能，使用者可匯入歷史 CSV 立即檢視幾十筆資料的自動換頁與 A4 列印效果。

**Blocked by:** 02: 報表註冊中心與通用外殼組件 (Audit Report Registry & ReportShell)

**Status:** done

- [x] 撰寫 `repairReportConfig` 註冊設定檔，定義 8 個標準欄位與寬度佔比（事由欄佔比 35% 靠左留白）。
- [x] 內建 6 筆長照真實情境預設範例資料（涵蓋叫人鈴、輪椅煞車、冷氣漏水、無障礙扶手等）。
- [x] 實作「模擬新增一筆資料」按鈕與動態資料池循環注入功能。
- [x] 表格線條嚴格實作評鑑專用黑實線，文字垂直居中對齊。
- [x] 驗證端到端：點擊下載範本 ➜ 下載之 CSV 結構符合 8 欄 ➜ 匯入該 CSV ➜ 表格資料即時替換無誤。
- [x] 驗證列印預覽時無多餘邊界截斷，每頁皆具備清晰表頭。

## Deliverables

- `apps/web/src/pages/audit-toolkit/repairReportConfig.ts` — 8 欄黃金比例設定檔、6 筆長照真實範例資料與動態資料池循環注入
- `apps/web/src/pages/audit-toolkit/reportRegistry.ts` — 報表註冊中心，支援隨插即用註冊與取得
- `apps/web/src/pages/audit-toolkit/RepairReportPage.tsx` — 修繕報表模組頁面，整合模擬新增與評鑑專用表格
- `apps/web/src/pages/audit-toolkit/RepairReportPage.test.tsx` — 15 項單元與整合測試，全數通過
- `apps/web/src/pages/audit-toolkit/AuditReportShell.tsx` — 外殼增強（支援 extraActions、機構名稱編輯、評鑑黑實線）
- `apps/web/src/styles/print.css` — 評鑑專用粗黑實線樣式（2.2px 外框、1.2px 內格線）
- `apps/web/src/pages/audit-toolkit/index.ts` — 導出修繕模組與註冊中心 API
