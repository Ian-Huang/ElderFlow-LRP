# 15 — 藥物管理後端 API

**What to build:** 藥物主檔與給藥記錄後端 API：主檔 CRUD、給藥記錄 (自動扣庫存、更新下一劑時間)、低庫存警示查詢、給藥記錄同步去重。

**Blocked by:** 11-backend-foundation, 12-auth-backend

**Status:** ready-for-agent

- [ ] 實作 `GET /api/v1/medications`：支援 `?residentId=&status=&page=&limit=&sort=`
- [ ] 實作 `GET /api/v1/medications/:id`：回傳主檔含 schedule、stockLevel、administrationHistory
- [ ] 實作 `POST /api/v1/medications`：建立藥物主檔、驗證頻率 enum (OnceDaily/TwiceDaily/ThreeTimesDaily/AsNeeded)、預設 `reorderThreshold: 15`、初始狀態 `Normal`、寫入稽核軌跡
- [ ] 實作 `PATCH /api/v1/medications/:id`：編輯主檔、庫存變更觸發狀態重算 (Normal/RunningLow/OutOfStock)、寫入稽核軌跡
- [ ] 實作 `POST /api/v1/medications/:id/administer`：記錄給藥、自動扣減 `stockLevel`、更新 `lastAdministered`、`nextScheduled`、建立給藥歷程記錄、寫入稽核軌跡
- [ ] 實作 `GET /api/v1/medications/alerts/low-stock`：回傳 `stockLevel <= reorderThreshold` 的藥物清單
- [ ] 實作 `POST /api/v1/medications/sync`：給藥記錄去重合併 — 同 `residentId + medicationId + administeredAt` (分鐘級) → 保留最早 administeredAt、標記衝突供確認、回傳合併結果
- [ ] 實作 `nextScheduled` 計算邏輯：依 frequency + schedule 陣列計算下一劑時間 (支援跨日)
- [ ] 整合測試：主檔 CRUD、給藥扣庫存、低庫存警示、同步去重、狀態流轉、稽核軌跡