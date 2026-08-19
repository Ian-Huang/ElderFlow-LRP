# 17 — 報表後端 API

**What to build:** 核心報表後端 API：每日照護完成度報告、住民狀態概覽、異常事件警示、稽核軌跡查詢、PDF 報告生成。

**Blocked by:** 11-backend-foundation, 12-auth-backend, 13-residents-backend, 14-care-records-backend, 15-medications-backend

**Status:** ready-for-agent

- [ ] 實作 `GET /api/v1/reports/daily-completion`：指定日期範圍、回傳每位住民每日完成度分數、記錄筆數、狀態分布、SQL 聚合查詢優化
- [ ] 實作 `GET /api/v1/reports/resident-summary`：管路/三管統計、床位分佈、異常事件計數、用藥提醒 (低庫存/下一劑時間)、身份別統計、依賴程度分佈
- [ ] 實作 `GET /api/v1/reports/alerts`：異常事件即時警示 — 藥物錯誤 (給藥記錄異常)、生命徵象異常 (超出正常範圍)、跌倒事件 (活動類型 Other + 備註關鍵字)、未給藥超時
- [ ] 實作 `GET /api/v1/reports/audit-trail`：稽核軌跡查詢 — 支援分頁、篩選 (entityType、entityId、dateFrom、dateTo、changedBy、actionType)、索引優化
- [ ] 實作 `POST /api/v1/reports/pdf`：產生 PDF — 接受 `reportType` (resident-list | tube-statistics | bed-map | completion-report) + 參數、使用 `@react-pdf/renderer` 或 `pdfkit` 伺服端渲染、嵌入 Noto Sans TC 字體、回傳 Blob URL (Azure Blob Storage SAS URL)
- [ ] PDF 模板元件化：住民名冊、管路統計表、床位平面圖、完成度報表
- [ ] 整合測試：各報表資料正確性、SQL 效能、PDF 生成內容完整、字體渲染、稽核軌跡篩選/分頁