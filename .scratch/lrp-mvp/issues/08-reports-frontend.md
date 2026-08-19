# 08 — 報表前端頁面 (含 Mock)

**What to build:** 報表完整前端介面：每日完成度儀表板、住民狀態概覽儀表板、異常事件警示中心、稽核軌跡查詢頁、PDF 匯出功能、圖表視覺化 (Recharts)。所有資料來自 MSW mock。

**Blocked by:** 03-pwa-offline-frontend

**Status:** ready-for-agent

- [ ] MSW Mock Handlers：`GET /api/v1/reports/daily-completion`、`GET /api/v1/reports/resident-summary`、`GET /api/v1/reports/alerts`、`GET /api/v1/reports/audit-trail`、`POST /api/v1/reports/pdf` — 內建模擬資料集
- [ ] 每日完成度儀表板 (`/reports/daily-completion`)：日期選擇器、完成度分數長條圖 (住民為軸)、狀態分布圓餅圖、低分住民清單 (可點進明細)、PDF 匯出按鈕
- [ ] 住民狀態概覽儀表板 (`/reports/resident-summary`)：管路/三管統計卡片、床位分佈圖 (樓層/房間視覺化)、異常事件時間軸、用藥提醒清單、身份別/依賴程度分佈圖表
- [ ] 異常事件警示中心 (`/reports/alerts`)：即時警示列表 (紅/黃標示)、類型篩選 (藥物錯誤/生命徵象異常/跌倒/未給藥)、已處理/未處理狀態、點擊跳轉相關記錄
- [ ] 稽核軌跡查詢頁 (`/reports/audit-trail`)：多重篩選器 (實體類型、實體 ID、日期範圍、操作人、動作類型)、分頁表格 (操作人、時間、實體、欄位、舊值、新值、原因)、PDF 匯出
- [ ] PDF 匯出統一入口：報表類型選單 (resident-list / tube-statistics / bed-map / completion-report)、參數設定、生成進度、下載/預覽 (Mock 回傳 Blob URL)
- [ ] 圖表元件庫：長條圖、圓餅圖、折線圖、床位分佈熱力圖 (Recharts 封裝、響應式)
- [ ] 響應式設計：桌機/平板/手機斷點適配、Kiosk 模式全螢幕
- [ ] 整合測試：各報表資料正確呈現、圖表互動、篩選/分頁、PDF 生成下載