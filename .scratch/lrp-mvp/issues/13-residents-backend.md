# 13: 住民基本資料 API (Residents API & D1)

**What to build:**
基於 Cloudflare Pages Functions 的住民基本資料 REST API，**精準對接前端 `residentRepository` 中介層契約**。實作分頁查詢、單筆明細、新增、編輯、軟刪除停用與匯入功能。落實 D1 唯一索引（住民編號唯一不重用、床位衝突防呆）、自動計算三管管路狀態、並於 D1 增刪留痕表寫入 Audit Log。

**Blocked by:** 11-backend-foundation, 12-auth-backend

**Status:** ready-for-agent

- [ ] 實作 `GET /api/v1/residents`：**強制分頁查詢**（`page`, `limit` 預設 20~50），支援 `status`, `hasThreePipe`, `identityType`, `dependencyLevel`, `q` 多維篩選，回傳 `PaginatedResponse<Resident>`
- [ ] 實作 `GET /api/v1/residents/:id`：回傳完整住民資料含三管狀態、管路清單、床位、緊急聯絡人、身份別與統計摘要
- [ ] 實作 `POST /api/v1/residents`：建立住民、驗證住民編號唯一性、驗證入住日期 ≤ 今天、檢查在院（Active）床位衝突，自動計算 `hasThreePipe` 並寫入 D1 增刪留痕表 (Create)
- [ ] 實作 `PATCH /api/v1/residents/:id`：編輯住民、管路異動自動重算 `hasThreePipe`、床位變更檢查衝突、寫入 D1 增刪留痕表 (Update，記錄欄位差異與修改原因)
- [ ] 實作 `DELETE /api/v1/residents/:id` 或狀態切換：軟刪除 (status → Inactive)、釋放床位、住民編號永久保留、寫入稽核留痕 (Delete)
- [ ] 實作 `POST /api/v1/residents/import`：接收 JSON/CSV/Excel 批次匯入、民國年自動轉換西元、三管與管路解析、`dryRun` 預覽檢核模式、D1 批次事務寫入
- [ ] **落實 D1 索引與約束**：建立 `idx_residents_status`、`idx_residents_bed`、住民編號唯一索引，確保查詢極速回應
- [ ] 整合測試：精準驗證與前端 `residentRepository.list()`、`toggleStatus()` 等呼叫契約相容，測試全數通過