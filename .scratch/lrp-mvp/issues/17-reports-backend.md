# 17: 報表資料彙整與統計 API (Reports Aggregation API)

**What to build:**
報表與統計彙整 REST API：每日照護完成度分析、住民狀態概覽（三管、管路、床位）、異常事件警示清單、D1 稽核軌跡查詢，直接供應前端儀表板與評鑑工具箱。

**Blocked by:** 11-backend-foundation, 12-auth-backend, 13-residents-backend, 14-care-records-backend, 15-medications-backend

**Status:** ready-for-agent

- [ ] 實作 `GET /api/v1/reports/daily-completion`：指定日期範圍，透過 D1 SQL 高效聚合查詢（`GROUP BY resident_id, date`）計算完成度平均分、狀態分佈與低分未達標名單
- [ ] 實作 `GET /api/v1/reports/resident-summary`：即時統計管路/三管比例、床位佔床率、低庫存用藥警示、身份別與失能等級分佈
- [ ] 實作 `GET /api/v1/reports/alerts`：彙整異常事件即時警示（包含生命徵象超出正常值、缺藥超時、跌倒事件）
- [ ] 實作 `GET /api/v1/reports/audit-trail`：**強制分頁查詢** D1 稽核軌跡（`entityType`, `dateFrom`, `dateTo`, `changedBy`, `actionType`），建立 `CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, changed_at)`，確保 5 年合規查詢不卡頓
- [ ] 支援報表資料以標準 JSON / CSV 串流格式導出，無縫餵入前端 PDF 統一匯出引擎 (F5) 與評鑑工具箱 A4 列印引擎
- [ ] 整合測試：各類統計指標計算精準度、D1 聚合查詢耗時 <50ms、稽核軌跡分頁過濾無誤