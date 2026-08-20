# 03 — PWA 離線基礎建設 (前端核心)

**What to build:** 完整的前端離線優先架構：Service Worker 註冊與快取策略、IndexedDB (Dexie.js) 資料庫初始化、離線寫入通用邏輯 (Zustand + TanStack Query 整合)、背景同步引擎、同步狀態 UI 指示器、衝突中心頁面。此為所有前端離線功能的基石，**不依賴真實後端**。

**Blocked by:** 01-project-foundation

**Status:** done

- [ ] 設定 Workbox：快取策略 (Static: CacheFirst、導航: NetworkFirst with offline fallback、API: NetworkFirst with timeout + 背景同步)
- [ ] `manifest.json` 完整設定：PWA 安裝提示支援、Kiosk 模式相容
- [ ] Dexie.js 資料庫結構：`Residents`、`CareRecords`、`CareActivities`、`Medications`、`TimeSlots`、`CarePlans`、`SyncQueue`、`SyncConflicts`、`Users` (快取)
- [ ] 離線寫入通用 Composable (`useOfflineMutation`)：所有寫入先進 IndexedDB、標記 `syncStatus: 'pending'`、`localId` (UUID)、`version: 1`、立即更新 Zustand/TanStack Query 快取、回傳樂觀更新結果
- [ ] 同步佇列：`SyncQueue` 表記錄待同步操作 (entityType, entityId, operation, payload, localId, retryCount, createdAt)
- [ ] 背景同步觸發：Service Worker `sync` 事件 (定期 30s)、`online` 事件、手動同步按鈕、MSW 模擬同步 API 回應
- [ ] 批次同步邏輯：讀取 `SyncQueue` → 依實體分組 → 呼叫 mock `/sync` API → 處理回應 (accepted/conflicts) → 更新本地狀態
- [ ] 衝突偵測與記錄：Mock 回傳衝突 → 寫入 `SyncConflicts` 表、更新本地 `syncStatus: 'conflict'`
- [ ] 前端：頂列同步狀態指示器 (綠: 已同步、黃: 同步中/待同步 N 筆、紅: 衝突 N 筆)、點擊展開明細
- [ ] 前端：衝突中心頁面 (`/sync/conflicts`)：列出所有衝突、Diff 視圖 (雲端版 vs 本地版)、三選項解決 (接受雲端/保留本地/手動合併)
- [ ] 關鍵衝突強制彈窗：藥物給藥、生命徵象衝突時 → 不可關閉 Modal、三選項、必須選擇才能繼續操作
- [ ] E2E 測試 (MSW + Playwright)：離線建立記錄 → 上線 → 自動同步 → 驗證資料一致性、併發編輯衝突流程