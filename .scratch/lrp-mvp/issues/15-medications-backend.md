# 15: 藥物管理、庫存異動與去重 API (Medications & Dispense Engine)

**What to build:**
藥物主檔維護與給藥記錄 REST API，**精準對接前端 `medicationRepository` 中介層契約**。實作藥物 CRUD、給藥 D1 事務性扣減庫存、自動更新下一劑時間、低庫存 (≤15) 即時警示，以及給藥記錄同步去重機制。

**Blocked by:** 11-backend-foundation, 12-auth-backend

**Status:** ready-for-agent

- [ ] 實作 `GET /api/v1/medications`：分頁查詢藥物清單，支援 `residentId`, `status`, `page`, `limit` 過濾，回傳 `PaginatedResponse<Medication>`
- [ ] 建立 D1 藥物索引：`CREATE INDEX idx_meds_resident ON medications(resident_id)` 與 `idx_med_admin_time ON medication_administrations(resident_id, medication_id, administered_at)`
- [ ] 實作 `GET /api/v1/medications/:id`：回傳主檔詳細資訊、時間表 (schedule)、庫存現量與給藥歷程
- [ ] 實作 `POST /api/v1/medications`：新增藥物主檔、驗證給藥頻率 enum、預設補貨閾值 `reorderThreshold = 15`、寫入 D1 增刪留痕
- [ ] 實作 `POST /api/v1/medications/:id/administer`：執行給藥。在 D1 交易中原子扣減 `stockLevel`，若扣減後 `stockLevel <= reorderThreshold` 自動標記為 `RunningLow`，寫入給藥歷程並更新 `lastAdministered`
- [ ] 實作 `GET /api/v1/medications/alerts/low-stock`：快速查詢當前所有低於閾值之缺藥/補藥警示清單
- [ ] 實作防呆去重邏輯：相同住民 + 相同藥物 + 相同分鐘級時間戳記之給藥記錄，自動判定重複並保留第一筆，防止手誤重複扣庫存
- [ ] 整合測試：主檔 CRUD、給藥扣庫存原子性、低庫存警示觸發、同步去重、精準相容 `medicationRepository`