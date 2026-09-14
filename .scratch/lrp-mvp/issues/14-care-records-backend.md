# 14: 日常照護記錄、評分與 24hr 鎖定 API (Care Records & 24hr Lock Engine)

**What to build:**
核心日常照護記錄與生命徵象 REST API，**精準對接前端 `careRecordRepository` 中介層契約**。實作分頁查詢、單筆明細、新增、24 小時內編輯、補充修正案 (BR002)、完整度評分 (0-100) 與 24 小時硬性鎖定機制。

**Blocked by:** 11-backend-foundation, 12-auth-backend

**Status:** ready-for-agent

- [ ] 實作 `GET /api/v1/care-records`：**強制分頁查詢**（`page`, `limit` 預設 20~50），支援 `residentId`, `dateFrom`, `dateTo`, `status`, `staffId` 組合過濾，回傳 `PaginatedResponse<CareRecord>`
- [ ] **落實大表效能索引**：於 D1 建立 `CREATE INDEX idx_care_records_res_date ON care_records(resident_id, timestamp)` 與 `idx_care_records_lock ON care_records(lock_type, submitted_at)`，確保 20 萬筆數據秒級響應
- [ ] 實作 `POST /api/v1/care-records`：建立記錄與生命徵象、自動注入 `staffId`、`staffName`、當前時間戳（防呆：時間戳不得為未來 +30 分鐘以上）、後端自動計算 `completenessScore` (0-100)、初始 `lockType: 'Editable'`、寫入 D1 增刪留痕表
- [ ] 實作 `PATCH /api/v1/care-records/:id`：編輯記錄。**強制時間校驗**：檢查 `submittedAt + 24hr < now`，逾時一律拒絕修改並回傳錯誤碼；僅限未鎖定狀態且由原填寫人或主管編輯，寫入變更前後差異
- [ ] 實作 `POST /api/v1/care-records/:id/supplement`：補充修正案 (BR002)。當記錄已逾時鎖定，不得覆蓋原始內容，必須建立新版補充案並綁定原記錄 ID
- [ ] 實作 24 小時動態硬性鎖定機制：查詢與寫入時自動即時判斷 `submittedAt + 24hr`，並可透過 Cloudflare Cron Trigger 定期批次標記 `Locked`
- [ ] 整合測試：完整驗收建立 → 24 小時內合法編輯 → 24 小時後修改被拒絕 → 補充修正案並存、精準對接 `careRecordRepository`