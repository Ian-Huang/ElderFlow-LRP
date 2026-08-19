# 14 — 日常照護記錄後端 API

**What to build:** 核心照護記錄後端 API：列表查詢、單筆明細、新建、編輯 (24hr 窗口)、狀態變更、補充修正案 (BR002)、24小時自動鎖定排程、同步端點。嚴格執行 BR001、BR002、BR007。

**Blocked by:** 11-backend-foundation, 12-auth-backend

**Status:** ready-for-agent

- [ ] 實作 `GET /api/v1/care-records`：支援 `?residentId=&dateFrom=&dateTo=&status=&staffId=&page=&limit=&sort=`
- [ ] 實作 `GET /api/v1/care-records/:id`：回傳完整記錄含 activities、evidence、modificationHistory
- [ ] 實作 `POST /api/v1/care-records`：建立記錄、自動帶入 `staffId`、`staffName`、`timestamp` (ISO 8601)、計算 `completenessScore` (0-100)、初始 `lockType: 'Editable'`、`status: 'Normal'`、寫入稽核軌跡
- [ ] 實作 `PATCH /api/v1/care-records/:id`：編輯記錄、**僅限 lockType=Editable**、**僅限本人或 supervisor+**、寫入 `modificationHistory` (actionType: Update、舊值/新值/原因必填)、更新 `updatedAt`、版本號 +1
- [ ] 實作 `POST /api/v1/care-records/:id/status`：變更狀態 (Normal/NeedsReview/VerificationRequired)、寫入稽核軌跡
- [ ] 實作 `POST /api/v1/care-records/:id/supplement`：補充修正案 (BR002)、**僅限 lockType=Locked**、建立新版本記錄關聯原始、寫入稽核軌跡 (actionType: Supplement)
- [ ] 實作 `POST /api/v1/care-records/sync`：批次同步端點、接收本地變更陣列、衝突偵測 (version/updatedAt 比對)、回傳 `{ accepted: [], conflicts: SyncConflict[] }`、Server-wins + 本地備份策略
- [ ] 實作 24小時自動鎖定排程：Azure Timer Trigger (每小時) → 掃描 `submittedAt + 24hr < now` 且 `lockType=Editable` → 更新為 `Locked`、設定 `lockedAt`、產生電子簽章欄位預留
- [ ] 實作 `completenessScore` 計算：必填項 (活動類型、協助等級、持續時間、生命徵象若類型為 VitalSigns) + 證據存在性 → 0-100 加權
- [ ] 驗證：timestamp 不得為未來 (+30min 容忍)、活動類型 enum、協助等級 1-5、version 樂觀鎖
- [ ] 整合測試：建立→編輯(24hr內)→鎖定→補充修正案、稽核軌跡完整性、權限檢查、同步衝突解決