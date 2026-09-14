# 18: 長照法規動態防呆檢核 API (Compliance Engine API)

**What to build:**
長照合規檢核 REST API：動態護理人力比即時運算 (BR004)、夜班本國籍人員留守檢核 (BR003)、特約社工每週工時累計 (BR005)、消保法 3 天合約審閱期狀態檢核 (BR006)。

**Blocked by:** 11-backend-foundation, 12-auth-backend, 13-residents-backend

**Status:** ready-for-agent

- [ ] 實作 `GET /api/v1/compliance/staffing-ratio`：依當前 D1 住民 `hasThreePipe` 即時統計 — 一般住民數 / 20 + 三管住民數 / 15，回傳法規最低護理人力需求、當前在班數與合規差額
- [ ] 實作 `GET /api/v1/compliance/night-shift`：檢核指定夜班 (22:00-08:00) 是否至少有一名具本國籍身分員工在班，若無則回傳紅色高風險違規標籤
- [ ] 實作 `GET /api/v1/compliance/contract-hours`：自 D1 排班/日誌累計特約社工每週（週一至週日）總時數，檢核是否滿足 ≥16 小時之法規門檻
- [ ] 實作 `GET /api/v1/compliance/contract-review/:residentId`：計算新入住審閱期，未滿 3 天自動回傳鎖定狀態與剩餘倒數時長，防呆阻斷簽署
- [ ] 整合測試：各項合規公式邊界條件、三管動態比例緊縮切換 (1:20 變更為 1:15) 驗證無誤