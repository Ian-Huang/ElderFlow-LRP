# 16: 照護計畫與跨專業目標 API (Care Plans API)

**What to build:**
跨專業照護計畫 REST API，**精準對接前端 `carePlanRepository` 中介層契約**。實作個別化照護計畫、照護目標與服務項目之關聯 CRUD，落實 D1 關聯索引、分頁查詢與生命週期狀態流轉（Draft → Active → Completed / Archived）。

**Blocked by:** 11-backend-foundation, 12-auth-backend

**Status:** ready-for-agent

- [ ] 實作 `GET /api/v1/care-plans`：分頁查詢照護計畫清單，支援 `residentId`, `status`, `page`, `limit` 篩選，回傳 `PaginatedResponse<CarePlan>`
- [ ] 建立 D1 索引：`CREATE INDEX idx_care_plans_res ON care_plans(resident_id, status)`
- [ ] 實作 `GET /api/v1/care-plans/:id`：回傳完整照護計畫含目標 (goals) 與服務項目 (serviceItems) 陣列
- [ ] 實作 `POST /api/v1/care-plans`：新增計畫、驗證評估日期 ≤ 當日、目標必填具體描述與達成日期、初始狀態為 Draft 或 Active、寫入 D1 增刪留痕
- [ ] 實作 `PATCH /api/v1/care-plans/:id`：編輯照護計畫內容、目標進度更新、服務項目調整，記錄修改軌跡
- [ ] 實作 `POST /api/v1/care-plans/:id/status`：嚴格校驗狀態流轉邏輯（例如 Draft 需主管審查後轉為 Active，住民出院自動轉為 Archived）
- [ ] 實作區段合併：支援目標與服務項目之子集合獨立比對與更新，防止覆蓋其他專業人員之異動
- [ ] 整合測試：計畫 CRUD、目標與項目維護、狀態流轉、精準相容 `carePlanRepository`