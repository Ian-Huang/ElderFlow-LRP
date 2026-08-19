# 10 — PWA 完善與 Kiosk 模式相容 (前端)

**What to build:** PWA 生產級完善：安裝提示、離線就緒檢查、Kiosk 模式完整相容、共用平板快速切換優化、Service Worker 更新策略、快取清理。純前端實作，配合 MSW 運作。

**Blocked by:** 03-pwa-offline-frontend, 02-auth-frontend

**Status:** ready-for-agent

- [ ] PWA 安裝提示：`beforeinstallprompt` 事件處理、自訂安裝按鈕 (頂列/設定頁)、安裝後追蹤 (localStorage 標記)、已安裝隱藏提示
- [ ] 離線就緒檢查：SW 註冊成功 + 關鍵資源快取完成 + IndexedDB 初始化完成 → 顯示「離線就緒」徽章 (綠點)、狀態持久化
- [ ] Kiosk 模式：`manifest.json` 已設定、`?kiosk=1` URL 參數啟動 → 隱藏瀏覽器 UI、鎖定導航 (無地址列、無分頁)、`beforeunload` 確認防止意外離開、全螢幕鎖定 (Screen Wake Lock API 可選)
- [ ] 共用平板快速切換優化：頂列下拉選單動畫 (Framer Motion/CSSTransition)、切換時保留表單草稿 (IndexedDB `draft:{entity}:{id}`)、最近 5 組帳號圖示化顯示 (頭像/首字)、切換動畫 200ms
- [ ] Service Worker 更新策略：`skipWaiting: true`、`clientsClaim: true`、更新可用時 Toast 通知「新版本就緒，點擊重新整理」→ `registration.update()` → `location.reload()`
- [ ] 快取清理策略：Workbox `cleanupOutdatedCaches: true`、運行時快取大小限制 (maxEntries)、IndexedDB 定期清理舊同步記錄 (保留 30 天、`SyncQueue`、`SyncConflicts`)
- [ ] 網路狀態偵測：`navigator.onLine` + `fetch('/api/health', {cache: 'no-store'})` 心跳每 30s、即時顯示線上/離線狀態圖示、離線時禁用同步按鈕
- [ ] E2E 測試 (Playwright)：安裝流程、離線操作完整性、Kiosk 模式鎖定導航、SW 更新流程、快取清理驗證