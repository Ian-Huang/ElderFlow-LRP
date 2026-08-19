# 18 — 合規後端 API (護理比例、夜班檢核、工時累計、審閱期)

**What to build:** 合規檢核後端 API：即時護理人力比例計算 (BR004)、夜班本國籍留守檢核 (BR003)、特約社工週工時累計 (BR005)、合約審閱期狀態查詢 (BR006)。唯讀查詢 API，供前端儀表板與警報使用。

**Blocked by:** 11-backend-foundation, 12-auth-backend, 13-residents-backend

**Status:** ready-for-agent

- [ ] 實作 `GET /api/v1/compliance/staffing-ratio`：依當前住民 `hasThreePipe` 統計 → 一般住民數 / 20 + 三管住民數 / 15 → 所需護理師總數、實際在班數 (手動輸入或排班模組預留介面)、是否合規、缺額數
- [ ] 實作 `GET /api/v1/compliance/night-shift`：查詢指定日期夜班 (22:00-08:00) 排班、檢查是否至少一名本國籍員工 (身分證字號驗證正則)、回傳合規狀態、缺漏詳情
- [ ] 實作 `GET /api/v1/compliance/contract-hours`：統計特約社工指定週 (週一至週日) 總排班時數、是否 ≥16hr、缺額時數、紅色警示旗標
- [ ] 實作 `GET /api/v1/compliance/contract-review/:residentId`：查詢住民合約審閱狀態、`intentDate + 3 days` 截止日、是否可簽署、剩餘天數
- [ ] Phase 1 僅提供查詢/檢核 API，不含排班 UI (排班系統在 Out of Scope)
- [ ] 整合測試：各合規計算邏輯正確性、邊界條件 (無住民、無排班資料)、身分證字號驗證