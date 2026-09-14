# 19: 雙軌離線同步與衝突仲裁 API (Sync Queue & Conflict Resolver)

**What to build:**
雙軌離線同步與衝突仲裁 REST API。接收前端 Dexie `syncStore` 上傳之變更佇列，於 Cloudflare D1 執行事務性批次寫入；針對離線編輯衝突落實欄位/區段合併、時間戳去重，並對生命徵象與用藥衝突標記 `requiresManualConfirm: true` 強制彈窗覆核。

**Blocked by:** 11-backend-foundation, 13-residents-backend, 14-care-records-backend, 15-medications-backend, 16-care-plans-backend

**Status:** ready-for-agent

- [ ] 實作批次同步端點 `POST /api/v1/sync`：接收前端離線操作批次（變更、新增、刪除），於 D1 交易中循序處理
- [ ] 實作住民欄位級衝突比對：比對 Server/Local 版本時間戳，非同欄位自動安全合併；同欄位衝突採 Server-wins 並記錄 `SyncConflict`
- [ ] 實作照護計畫區段級合併：獨立比對 goals 與 serviceItems，避免多專業同仁同時調整不同項目時產生整份覆蓋
- [ ] 實作關鍵資料衝突安全鎖：若衝突實體涉及「生命徵象」或「給藥紀錄」，自動賦予 `severity: 'critical'` 旗標，回傳前端強制彈窗覆核，嚴禁靜默覆寫
- [ ] 實作衝突狀態查詢端點 `GET /api/v1/system/sync/conflicts`（支援分頁）與手動仲裁端點 `POST /api/v1/system/sync/conflicts/resolve`
- [ ] 整合測試：模擬網路中斷後大批離線寫入、連線時批次同步原子性、衝突記錄持久化無遺漏