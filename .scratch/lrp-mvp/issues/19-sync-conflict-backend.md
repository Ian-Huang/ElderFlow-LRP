# 19 — 同步衝突解決後端增強

**What to build:** 強化後端同步引擎的衝突解決能力：欄位級合併 (Resident)、區段級合併 (CarePlan)、時間戳去重 (Medication 給藥)、關鍵資料強制人工確認旗標、衝突記錄持久化。

**Blocked by:** 11-backend-foundation, 13-residents-backend, 14-care-records-backend, 15-medications-backend, 16-care-plans-backend

**Status:** ready-for-agent

- [ ] 實作 Resident 欄位級合併邏輯：`POST /api/v1/residents/sync` 比較 server/local 各欄位、非同欄位自動合併、同欄位衝突 → Server-wins + 記錄 `SyncConflict` (conflictFields、serverVersion、localVersion)
- [ ] 實作 CarePlan 區段級合併：`POST /api/v1/care-plans/sync` 獨立比較 `goals`、`serviceItems` 陣列、ID 對應更新/新增/刪除、版本號 +1
- [ ] 實作 Medication 給藥去重強化：同 `residentId + medicationId + administeredAt` 分鐘級 → 保留最早、衝突標記 `requiresManualConfirm: true`、回傳衝突詳情供前端強制彈窗
- [ ] 實作關鍵資料強制確認旗標：藥物給藥、生命徵象 (CareRecord type=VitalSigns) 衝突時 → `SyncConflict.severity: 'critical'`、前端據此阻斷操作
- [ ] 衝突解決端點：`POST /api/v1/system/sync/conflicts/resolve` 接受 `conflictId` + `resolution: 'server' | 'local' | 'manual'` + `manualData?`、更新主資料、標記衝突 resolved
- [ ] 衝突查詢端點：`GET /api/v1/system/sync/conflicts` 篩選/分頁、回傳雙版本資料供 Diff
- [ ] 整合測試：併發編輯衝突、各實體合併策略、關鍵資料強制確認旗標、解決後資料一致性