# 規格：護理沙盒實驗室 (Nurse Sandbox Lab) 與現場自製功能孵化器

## 概述
為了解決護理第一線人員因舊系統功能不足而自製 Google Apps Script/Sheets 零散工具的問題，新系統開闢獨立的「護理沙盒實驗室（Nurse Sandbox Lab）」。
本規格旨在建立底層動態集合儲存（`useSandboxCollection`）與三合一工作台架構（公開填寫 Kiosk + 內部資料庫管理 + A4 評鑑報表），使護理人員能與專屬 AI 在本機獨立開發、驗證、試用，不需等待後端開立資料表或 Cloudflare 帳號建置。

## 架構原則
1. **本機先行（Local/Offline-First）**：利用 Dexie (IndexedDB) 達成無需伺服器即可完整的 CRUD 與報表預覽。
2. **動態結構（Schema-less JSON）**：集合名稱由前端自由定義，任意擴充欄位（字串、數字、陣列），對應 D1 `sandbox_documents`。
3. **三合一閉環（3-in-1 Triad）**：公開填寫端（免登入）、內部管理清單（即時反饋/編修）、評鑑報表（高保真 A4）。
4. **邊界隔離**：所有程式碼與 Widget 限於 `apps/web/src/pages/nurse-lab/`，不污染核心代碼。

## 子任務拆分
- `issues/01-sandbox-dynamic-collection-store.md`：封裝 `useSandboxCollection` Hook 與 IndexedDB 萬能集合存儲。
- `issues/02-nurse-lab-hub-and-routing.md`：建立 `/nurse-lab` 工作台首頁路由與 `/public/:slug` 免登入 Kiosk 路由。
- `issues/03-visitor-registration-triad-prototype.md`：移植首個示範模組「訪客與志工線上登記（三件套）」。
