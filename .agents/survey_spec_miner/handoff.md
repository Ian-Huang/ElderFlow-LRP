# Specification Mining Report: R1 (Reports), R2 (System Admin), R3 (PWA Polish) & AC1-AC5

**Miner Role**: Requirements & Spec Miner (`survey_spec_miner`)  
**Parent Conversation ID**: `326e867b-d269-42e5-a25a-56351b725a5c`  
**Working Directory**: `/Users/ian.huang/aiProjects/LRP/.agents/survey_spec_miner`  
**Target Subsystems**:
- **R1**: 08-reports-frontend (報表前端)
- **R2**: 09-system-admin-frontend (系統管理前端)
- **R3**: 10-pwa-polish-frontend (PWA 完善與 Kiosk)
- **AC1-AC5**: Acceptance Criteria (功能完整性、測試覆蓋、PWA 合規、安全驗證、效能指標)

---

## 1. Observation

### 1.1 Authoritative Specification Sources & Exact Citations

1. **User Prompt (`ORIGINAL_REQUEST.md`, lines 15-47)**:
   - **R1**: "實作報表頁面，支援資料視覺化、匯出與過濾功能。使用現有的 UI 框架（如 Ant Design）與資料抓取層（RTK Query）。"
   - **R2**: "實作使用者管理、系統健康、功能旗標、日誌與稽核等頁面。遵循安全與 RBAC 規範，確保僅 admin 可存取。"
   - **R3**: "添加離線快取、Web App Manifest、服務工作者，使前端可作為 PWA 使用。確保在行動裝置上有良好使用體驗，並支援「安裝」功能。"
   - **AC1**: "各頁面在本地開發伺服器上無錯誤載入，所有互動（搜尋、過濾、匯出、設定切換）均能正常執行。"
   - **AC2**: "為每個頁面提供單元測試（Jest + React Testing Library）與端對端測試（Cypress），測試必須通過。"
   - **AC3**: "能在 Chrome/Edge/Safari 中以「Add to Home Screen」安裝，離線時仍能顯示主要 UI。"
   - **AC4**: "非 admin 用戶訪問 `/admin/*` 會被導向 403/登入頁。所有 API 請求皆帶有 CSRF token，且在開發環境中模擬驗證失敗情形。"
   - **AC5**: "首次載入時間 < 2 秒（Chrome Lighthouse 評分 ≥ 90）。報表與日誌頁面使用分頁或虛擬化，避免一次渲染過多資料。"

2. **Phase 1 MVP 規格凍結版 (`.scratch/lrp-mvp/spec.md`)**:
   - **架構決策 (lines 22-30, 101-120)**: "前端：React 18/19 + TypeScript + Vite + Tailwind CSS，部署為 SPA；狀態/資料層：Zustand + TanStack Query + Dexie.js (IndexedDB wrapper)；離線能力：Service Worker (Workbox) + IndexedDB 本地寫入，聯網時背景同步；測試：Vitest + React Testing Library + Playwright (E2E)。"
   - **報表模組 API (lines 168-174)**:
     - `GET /api/v1/reports/daily-completion` — 每日完成度 (日期、住民、分數、狀態)
     - `GET /api/v1/reports/resident-summary` — 住民狀態概覽 (管路、三管、床位、身份別、依賴程度)
     - `GET /api/v1/reports/alerts` — 異常事件警示 (藥物錯誤、生命徵象異常、跌倒等)
     - `GET /api/v1/reports/audit-trail` — 稽核軌跡 (分頁、多重篩選)
     - `POST /api/v1/reports/pdf` — 產生 PDF (報表類型與參數，回傳 blob URL)
   - **系統管理與認證模組 (lines 125-134, 383-396)**:
     - 使用者角色：`caregiver`, `supervisor`, `admin`, `sysadmin`
     - `/api/v1/users`: 列表、建立、角色變更 (`PATCH /users/:id/role`)
     - 快速切換：`GET /users/switchable`，最近 5 組已登入帳號離線切換
     - 稽核軌跡：所有變更寫入 `AuditEntry`，保存至少 5 年 (BR007)
   - **合規檢核端點 (lines 175-182, 397-412)**:
     - `GET /api/v1/compliance/staffing-ratio` (BR004: 一般 1:20，具三管 1:15)
     - `GET /api/v1/compliance/night-shift` (BR003: 22:00-08:00 至少 1 名本國籍員工)
     - `GET /api/v1/compliance/contract-hours` (BR005: 特約社工週工時 ≥16 小時)
     - `GET /api/v1/compliance/contract-review/:residentId` (BR006: 簽約 3 天審閱期鎖定)
   - **離線與同步 (lines 359-382)**:
     - 寫入先入 IndexedDB (Dexie)，`syncStatus: 'pending'`，立即更新 UI
     - 衝突解決：CareRecord (Server-wins + 本地備份), Resident (欄位級合併), Medication (時間戳去重), 關鍵衝突 (藥物給藥、生命徵象) 強制彈窗確認

3. **Task Cards (`.scratch/lrp-mvp/issues/`)**:
   - **`08-reports-frontend.md` (lines 1-17)**:
     - 每日完成度儀表板 (`/reports/daily-completion`)：日期選擇器、完成度分數長條圖 (住民為軸)、狀態分布圓餅圖、低分住民清單、PDF 匯出按鈕
     - 住民狀態概覽儀表板 (`/reports/resident-summary`)：管路/三管統計卡片、床位分佈圖、異常事件時間軸、用藥提醒清單、身份別/依賴程度分佈圖表
     - 異常事件警示中心 (`/reports/alerts`)：即時警示列表 (紅/黃)、類型篩選 (藥物錯誤/生命徵象異常/跌倒/未給藥)、已處理/未處理狀態
     - 稽核軌跡查詢頁 (`/reports/audit-trail`)：多重篩選器 (實體類型、實體 ID、日期範圍、操作人、動作類型)、分頁表格、PDF 匯出
     - PDF 匯出統一入口：類型選單 (`resident-list`, `tube-statistics`, `bed-map`, `completion-report`)、參數設定、下載/預覽
     - 圖表元件庫：長條圖、圓餅圖、折線圖、床位分佈熱力圖 (Recharts 封裝、響應式)
   - **`09-system-admin-frontend.md` (lines 1-15)**:
     - 系統管理頁面 (`/admin`)：側邊欄導航 (使用者管理 / 系統設定 / 稽核軌跡)
     - 使用者管理表格：新增按鈕 (彈窗表單：帳號、密碼、角色、本國籍)、編輯角色下拉、啟用/停用切換、刪除確認、樂觀更新
     - 系統設定表單：同步間隔 (秒)、24hr 鎖定時長 (小時)、低庫存閾值預設 (15)、PDF 字體選擇、儲存成功 Toast
     - 角色權限矩陣顯示：唯讀表格展示四角色權限對照
   - **`10-pwa-polish-frontend.md` (lines 1-16)**:
     - PWA 安裝提示：`beforeinstallprompt` 事件處理、自訂安裝按鈕、安裝後追蹤、已安裝隱藏提示、iOS 加入主畫面引導
     - 離線就緒檢查：SW 註冊成功 + 關鍵資源快取完成 + IndexedDB 初始化完成 ➔ 顯示「離線就緒」綠點徽章
     - Kiosk 模式：`manifest.json`、`?kiosk=1` 參數、隱藏瀏覽器 UI、鎖定導航、`beforeunload` 確認防止意外離開、全螢幕鎖定 (Wake Lock)
     - 共用平板快速切換優化：頂列下拉選單動畫 (200ms)、切換時保留表單草稿 (`draft:{entity}:{id}`)、最近 5 組帳號圖示化顯示
     - Service Worker 更新策略：`skipWaiting: true`、`clientsClaim: true`、Toast 通知「新版本就緒，點擊重新整理」➔ `registration.update()` ➔ `location.reload()`
     - 快取清理策略：Workbox `cleanupOutdatedCaches: true`、運行時快取大小限制、IndexedDB 定期清理舊同步記錄 (30 天)
     - 網路狀態偵測：`navigator.onLine` + `fetch('/api/v1/health')` 心跳每 30s、離線時禁用同步按鈕

### 1.2 Existing Codebase State Observations

1. **`apps/web/package.json`**:
   - UI / Styling: `tailwindcss` (v3.4.19), `autoprefixer`, `postcss`. **沒有 `antd` (Ant Design)**.
   - State / Data Fetching: `@tanstack/react-query` (v5.28.0), `axios` (v1.6.8), `zustand` (v4.5.2), `dexie` (v4.4.5). **沒有 `@reduxjs/toolkit` (RTK Query)**.
   - Testing: `vitest` (v1.6.0), `@testing-library/react` (v16.3.2), `@playwright/test` (v1.62.1). **沒有 `jest` 或 `cypress`**.
   - PWA: `vite-plugin-pwa` (v0.20.0), `workbox-window` (v7.1.0).

2. **Routes in `apps/web/src/App.tsx` (lines 64-85)**:
   - 已有路由：`dashboard`, `residents/*`, `care-records/*`, `medications/*`, `care-plans/*`, `reports`, `settings`, `sync/conflicts`.
   - **缺失路由**：
     - 沒有 `/admin` 或 `/admin/*` 路由！目前僅有 `/settings` 且沒有設定角色限制 (任何登入角色皆可進 `/settings`)。
     - 沒有 `/reports/daily-completion`, `/reports/resident-summary`, `/reports/alerts`, `/reports/audit-trail` 等獨立子路由或分頁 tab 結構。
     - 沒有 `/403` 專屬拒絕存取頁面。

3. **Current `apps/web/src/pages/ReportsPage.tsx`**:
   - 僅有靜態卡片預覽（6 個圖示卡片），沒有任何資料串接、沒有圖表、沒有日期過濾器、沒有 PDF 產生邏輯。

4. **Current `apps/web/src/pages/SettingsPage.tsx`**:
   - 包含 Appearance、Sync & Offline、User Switching、硬編碼的 3 筆 User 表格、System Info、Danger Zone。
   - 使用者管理無新增彈窗、無角色編輯下拉、無啟用/停用 API 呼叫；無系統健康監控（CPU/記憶體/延遲/Uptime）；無功能旗標管理。

5. **Current `apps/web/src/api/apiClient.ts`**:
   - 僅附帶 `Authorization: Bearer ${accessToken}`。
   - **完全沒有 CSRF Token (`X-CSRF-Token`) 的攔截與注入機制**，亦無開發環境模擬 CSRF 驗證失敗的開關。

6. **Current `apps/web/src/mocks/handlers.ts`**:
   - 報表端點：僅有 `GET /api/v1/reports` 與 `POST /api/v1/reports/generate`。缺少 `daily-completion`, `resident-summary`, `alerts`, `audit-trail`, `pdf` 等專用端點。
   - 使用者端點：僅有 `GET /api/v1/users/me` 與 `GET /api/v1/users/switchable`。缺少 `GET /api/v1/users`, `POST /api/v1/users`, `PATCH /api/v1/users/:id/role`, `PATCH /api/v1/users/:id/status`, `DELETE /api/v1/users/:id`。
   - 系統設定端點：缺少 `GET/PATCH /api/v1/system/settings`, `GET /api/v1/system/health`, `GET/PATCH /api/v1/system/feature-flags`。

7. **PWA Assets & Configuration**:
   - `apps/web/public/` 目前僅有 `mockServiceWorker.js` 與 `sw-sync.js`。
   - `index.html` 引用 `/favicon.svg`，`vite.config.ts` 引用 `/favicon.ico`, `/pwa-192x192.png`, `/pwa-512x512.png`，**但這些實體圖示檔案在 public 目錄中皆不存在**。

8. **Test Suite Verification**:
   - 執行 `npm test`：共 23 個測試檔案，127 個測試全部通過。
   - 執行 `npm run build`：Vite production build 成功 (1.70s)。

---

## 2. Logic Chain

1. **技術棧規範一致性推導**：
   - 觀察到 `ORIGINAL_REQUEST.md` 提及「使用現有的 UI 框架（如 Ant Design）與資料抓取層（RTK Query）」以及「Jest + RTL 與 Cypress」。
   - 但對比現有實際程式碼庫 (`apps/web/package.json`, `vite.config.ts`, `.scratch/lrp-mvp/spec.md`)：
     - UI 框架已完整建立在 Tailwind CSS + 自建現代元件之上。
     - 資料抓取層已完整建立在 `@tanstack/react-query` + `axios` + `dexie` (離線優先深模組 `createOfflineRepository`) 之上。
     - 測試框架已完整配置為 `vitest` + `@testing-library/react` + `playwright`。
   - **推導結論**：專案從初期規劃演進為現代 Vite + Tailwind + TanStack Query + Vitest 棧。若硬性置入 Ant Design 與 RTK Query，將與現有的深模組架構（`residentRepository`, `offlineDb`, `syncEngine`）以及 Bundle Size (<2s 載入時間，AC5) 產生衝突。因此，應以現有 Tailwind + TanStack Query 為基礎實作完整的 R1/R2/R3 功能，同時在架構層面提供與 Ant Design / RTK Query 設計概念等價的規範。

2. **R1 報表前端的架構推導**：
   - 根據 `08-reports-frontend.md` 與 `17-reports-backend.md`，報表中心必須包含 4 大儀表板/查詢頁與 1 個統一 PDF 匯出入口：
     - `/reports/daily-completion`（照護完成度長條圖、狀態分布餅圖、低分清單）
     - `/reports/resident-summary`（三管統計卡片、床位分佈視覺化、異常時間軸、身份別/依賴程度分布）
     - `/reports/alerts`（警示中心：紅黃警示、藥物錯誤、生命徵象異常、跌倒、未給藥）
     - `/reports/audit-trail`（稽核軌跡：分頁表格、多條件篩選、舊值新值對比、PDF 匯出）
     - PDF 匯出統一入口（產生 `resident-list`, `tube-statistics`, `bed-map`, `completion-report`）
   - 目前 `ReportsPage.tsx` 僅有 6 張占位卡片，需擴充為支援分頁 Tab 或子路由的完整分析頁面，並在 MSW 中補齊對應的 5 個端點。

3. **R2 系統管理與安全保護的架構推導**：
   - 根據 `09-system-admin-frontend.md` 與 `ORIGINAL_REQUEST.md` (R2, AC4)：
     - 系統管理必須配置於 `/admin/*`，並受 `requireRole(['admin', 'sysadmin'])` 保護。
     - 當非 admin 用戶（如 `caregiver`, `supervisor`）訪問時，必須硬性阻斷並導向 `/403` 或 `/login`。
     - 功能必須涵蓋：使用者管理 CRUD（帳號、姓名、密碼、角色切換、啟用停用、本國籍標記）、系統健康監控（API/DB/SW/IndexedDB 狀態，CPU/RAM/Latency/Uptime）、功能旗標開關（灰度百分比、環境標籤）、系統參數設定表單（同步間隔、24hr 鎖定時長、低庫存閾值）、稽核日誌查詢。
     - 安全防護必須補齊：Axios 請求攔截器自動附帶 `X-CSRF-Token`，並提供 `VITE_SIMULATE_CSRF_ERROR` 或 localStorage 開關供開發環境測試 403 失敗情境。

4. **R3 PWA 完善與 Kiosk 模式推導**：
   - 根據 `10-pwa-polish-frontend.md` 與 AC3/AC5：
     - 需捕捉 `beforeinstallprompt` 事件，並在頂列與系統設定頁展示安裝按鈕；iOS 則顯示「加入主畫面」指引。
     - 需在 public 目錄補齊必要的 PWA 資源圖示 (`pwa-192x192.png`, `pwa-512x512.png`, `favicon.svg`)，確保 Chrome/Edge Lighthouse PWA 稽核通過。
     - 需在 Service Worker 更新時提供優雅的 Toast 通知與 `skipWaiting` / reload 流程。
     - 需提供 Kiosk 模式 (`?kiosk=1`)，鎖定導覽列、啟用全螢幕與 Screen Wake Lock 防止裝置休眠。

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | R1 報表 | 每日照護完成度儀表板 | 展示指定日期各住民完成度分數長條圖、狀態圓餅圖 (Normal/NeedsReview/VerificationRequired) 與低分名單 | `date` (YYYY-MM-DD), `residentId` (可選) | 平均完成率、長條圖、圓餅圖、低分住民清單 | 日期格式錯誤回傳 400；無紀錄顯示友善空狀態 | `08-reports-frontend.md`, `17-reports-backend.md`, US13 |
| 2 | R1 報表 | 住民狀態概覽儀表板 | 統計住民管路與三管狀態、床位分佈圖、異常時間軸、用藥提醒與人口學分佈 | 無或機構篩選參數 | 三管統計卡片、床位熱力圖/網格、身份別與依賴程度分佈圖 | 資料庫讀取失敗顯示重試按鈕 | `08-reports-frontend.md`, `17-reports-backend.md`, US14 |
| 3 | R1 報表 | 異常事件警示中心 | 即時監控藥物錯誤、生命徵象異常 (體溫>37.5、SpO2<95 等)、跌倒事件與未給藥超時 | `type`, `severity` (Red/Yellow), `status` (未處理/已處理) | 警示清單、標籤色彩、點擊跳轉相關記錄詳情 | 無警示顯示綠色安全徽章 | `08-reports-frontend.md`, `17-reports-backend.md`, US28 |
| 4 | R1 報表 | 稽核軌跡查詢頁 | 5 年法規留痕查詢，支援依實體類型、實體代碼、時間區間、操作人、動作類型多條件篩選與分頁展示 | `entityType`, `entityId`, `dateFrom`, `dateTo`, `changedBy`, `actionType`, `page`, `pageSize` | 分頁表格 (舊值、新值、原因、時間、操作人)、PDF 匯出按鈕 | 查詢逾時或超出範圍回傳空結果 | `08-reports-frontend.md`, `17-reports-backend.md`, BR007 |
| 5 | R1 報表 | PDF 統一匯出引擎 | 支援匯出住民名冊、管路統計表、床位平面圖與照護完成度報表，支援中文字體渲染 | `reportType` (`resident-list`, `tube-statistics`, `bed-map`, `completion-report`), `parameters` | Blob URL、下載對話框、預覽視窗 | 生成失敗回傳 500 與 Toast 錯誤訊息 | `08-reports-frontend.md`, `17-reports-backend.md`, US37 |
| 6 | R2 管理 | 使用者管理清單與過濾 | 依帳號、姓名、角色、狀態分頁檢視系統所有使用者帳號 | `search` (關鍵字), `role` (角色), `status` (Active/Inactive), `page`, `pageSize` | 使用者表格清單 (帳號、姓名、角色徽章、本國籍、最後登入) | 無相符項目顯示「查無使用者」 | `09-system-admin-frontend.md`, US32 |
| 7 | R2 管理 | 使用者建立與帳號指派 | Admin 彈窗建立新使用者，設定帳號、密碼、姓名、角色與本國籍身分 | `{ username, password, name, role, isLocalStaff }` | 新增成功 201 響應、表格即時插入 | 帳號重複回傳 400 `DUPLICATE_USERNAME` | `09-system-admin-frontend.md` |
| 8 | R2 管理 | 使用者角色與狀態切換 | 行內快速切換使用者角色 (`caregiver`, `supervisor`, `admin`, `sysadmin`) 及啟用/停用切換 | `userId`, `role`, `status` | 更新成功、樂觀更新表格狀態 | 禁止停用或降級最後一個 active sysadmin | `09-system-admin-frontend.md` |
| 9 | R2 管理 | 系統健康狀態監控 | 監測 API 連線、資料庫延遲、Service Worker 運行狀態、IndexedDB 容量、CPU/記憶體/Uptime | 自動輪詢或手動點擊重新整理 | 健康燈號 (綠/黃/紅)、記憶體使用率、延遲 ms、運行時長 | 服務斷線顯示紅色警示與錯誤代碼 | `ORIGINAL_REQUEST.md` R2, DISPATCH.md |
| 10 | R2 管理 | 功能旗標管理中心 | 即時控制特定模組啟用開關、灰度發布百分比 (0-100%) 與環境標籤 | `flagId`, `enabled`, `rolloutPercentage`, `environment` | 旗標列表、開關控制、狀態持久化 | 參數無效回傳 400 驗證錯誤 | `ORIGINAL_REQUEST.md` R2, DISPATCH.md |
| 11 | R2 管理 | 系統核心參數設定表單 | 設定背景同步間隔 (秒)、24hr 記錄鎖定時長、低庫存警示閾值 (預設 15)、PDF 字體 | `{ syncInterval, lockDurationHours, lowStockThreshold, pdfFont }` | 儲存成功 Toast、設定持久化 | 數值超出合理範圍 (如鎖定時長 <1) 前端阻斷 | `09-system-admin-frontend.md`, CONTEXT.md |
| 12 | R2 管理 | 角色權限矩陣展示 | 唯讀對照表清楚呈現 4 種角色在住民、照護、給藥、計畫、報表、管理權限劃分 | 無 | 四象限/表格化權限清單 | 無 | `09-system-admin-frontend.md` |
| 13 | R2 安全 | `/admin/*` 路由保護與 403 導向 | 非 admin/sysadmin 角色直接或程式化訪問 `/admin/*` 時強制阻斷 | 當前使用者權限 `userRole` | 導向 `/403` 專屬拒絕存取頁面或 `/login` | 嘗試越權存取立即記錄至審計日誌 | `ORIGINAL_REQUEST.md` AC4 |
| 14 | R2 安全 | CSRF Token 自動注入與模擬失敗 | 所有 Axios API 請求自動附加 `X-CSRF-Token` 標頭；開發環境提供手動模擬失敗開關 | 請求配置、模擬錯誤開關 (`SIMULATE_CSRF_ERROR`) | 正常附帶 Token；模擬時 MSW 回傳 403 `CSRF_INVALID` | 驗證失敗彈出安全警示 Toast 並阻斷後續請求 | `ORIGINAL_REQUEST.md` AC4 |
| 15 | R3 PWA | PWA 安裝提示 ("Add to Home Screen") | 捕捉 `beforeinstallprompt` 事件，於頂列及系統頁提供自訂安裝按鈕；支援 iOS Safari 指引 | `beforeinstallprompt` 事件、使用者點擊 | 叫出原生安裝對話框、追蹤 `appinstalled`、已安裝隱藏提示 | 使用者拒絕安裝時保存偏好不再重複打擾 | `10-pwa-polish-frontend.md`, AC3 |
| 16 | R3 PWA | 離線就緒檢查與狀態指示 | 驗證 SW 註冊、快取資源完成度與 IndexedDB 初始化，顯示「離線就緒」綠點 | 瀏覽器快取狀態、IndexedDB 連線 | 頂列狀態綠色圖標「離線就緒」 | 任一資源未就緒顯示黃色「快取中」或「離線受限」 | `10-pwa-polish-frontend.md`, AC3 |
| 17 | R3 PWA | Service Worker 自動更新與通知 | 偵測新版 SW 發布，彈出「新版本已就緒」Toast，引導用戶點擊平滑更新 | Workbox `onNeedRefresh` 回呼 | Toast 提醒視窗、觸發 `skipWaiting` 與 `reload` | 若更新失敗退回目前運行版本 | `10-pwa-polish-frontend.md` |
| 18 | R3 PWA | 離線優先快取與過期清理 | 靜態資源 CacheFirst、API NetworkFirst + IndexedDB 降級、過期快取自動清理 (30天) | 網路狀態、請求 URL | 離線時順暢載入 UI 與 IndexedDB 資料 | 斷網時無快取顯示友善離線佔位元件 | `10-pwa-polish-frontend.md`, `deepen-offline-repositories/spec.md` |
| 19 | R3 PWA | 行動端 Kiosk 模式與 Wake Lock | 支援 `?kiosk=1`，鎖定導航、隱藏瀏覽器選單、全螢幕鎖定、啟用 Screen Wake Lock 防止螢幕休眠 | URL 參數、按鈕開關 | 全螢幕模式、攔截 `beforeunload` 防止意外關閉 | 裝置不支援 Wake Lock 降級正常全螢幕 | `10-pwa-polish-frontend.md`, BR011 |
| 20 | R3 PWA | 共用平板快速切換與草稿暫存 | 記住最近 5 組已登入使用者，快速無感切換帳號，並保留目前輸入中的表單草稿 | 使用者選擇切換目標 | 200ms 動畫切換用戶、還原 IndexedDB 草稿 | 帳號 Refresh Token 失效引導重新輸入密碼 | `10-pwa-polish-frontend.md`, US39 |
| 21 | AC5 效能 | 虛擬化與分頁資料載入 | 報表、稽核軌跡與使用者表格採用 20 筆/頁分頁或虛擬列表，避免一次渲染大量 DOM | `page`, `pageSize` | 標準分頁控制項、頁碼切換、快速跳頁 | 頁碼超過範圍自動重設為第 1 頁 | `ORIGINAL_REQUEST.md` AC5 |

---

## 4. Edge Cases

| # | Feature | Input / Scenario | Observed Behavior & Expected Specification |
|---|---------|------------------|--------------------------------------------|
| 1 | R1 報表查詢 | 查詢指定日期完全沒有任何照護記錄 (`items: []`) | 圖表元件不應拋出例外或除以零錯誤 (NaN%)，儀表板應優雅渲染空狀態（「此日期尚無照護記錄，請確認日期」）。 |
| 2 | R1 三管統計 | 住民管路欄位包含多種分隔符（如 `"鼻胃管、留置尿管/NG管"` 或全形逗點） | 解析函式需支援 `split(/[,、，/]/)` 並 trim 空白；`isThreePipe` 衍生布林值需正確識別為 `true`，護理比例自動按 1:15 納計。 |
| 3 | R1 PDF 匯出 | 機構共有 26 位住民，但後端/Mock PDF 生成逾時 (>30s) 或發生網路中斷 | 前端下載按鈕應從「生成中」恢復為可點擊狀態，並以 Toast 提示「PDF 生成失敗，請檢查網路連線後重試」，不可凍結 UI。 |
| 4 | R2 權限阻斷 | 角色為 `caregiver` 的用戶在網址列手動輸入 `http://.../admin/users` | 路由守衛 `requireRole` 在元件掛載前立即攔截，導向 `/403` 專屬 Forbidden 頁面或登入頁，並附帶 `state: { from: '/admin/users' }`。 |
| 5 | R2 使用者管理 | 管理員嘗試刪除或停用系統中唯一具有 `sysadmin` 權限的帳號 | 前端按鈕應禁用或 API 返回 400 `CANNOT_REMOVE_LAST_SYSADMIN`，阻止系統進入無管理員狀態。 |
| 6 | R2 使用者建立 | 建立使用者時輸入已存在之 `username` | API 返回 400 `DUPLICATE_USERNAME`，表單在使用者名稱下方即時標記紅色錯誤「此帳號已存在」，保留表單其他已填欄位。 |
| 7 | R2 參數設定 | 系統設定表單輸入非法數值（如 24hr 鎖定時長輸入 `-5` 或 `999` 小時，或閾值輸入負數） | 前端 Zod Schema 驗證阻斷送出，顯示「鎖定時長必須介於 1 至 72 小時之間」，防止非法參數寫入後端。 |
| 8 | R2 安全 CSRF | 開發環境開啟 `SIMULATE_CSRF_ERROR=true`，觸發 API POST/PATCH 請求 | Mock Service Worker 攔截並返回 HTTP 403 `{ code: 'CSRF_INVALID', message: 'CSRF token 驗證失敗' }`；Axios 攔截器捕獲並彈出安全警示彈窗。 |
| 9 | R3 PWA 安裝 | 應用程式已處於獨立窗口 (PWA Standalone) 模式運行 | `window.matchMedia('(display-mode: standalone)').matches` 判定為 `true`，自動隱藏頂列與設定頁的「安裝應用程式」按鈕。 |
| 10 | R3 PWA 安裝 | 使用者使用 iOS Safari 開啟應用程式 (不支援 `beforeinstallprompt`) | 偵測到 iOS User-Agent 且未安裝時，安裝按鈕點擊後彈出引導圖解：「點擊底部分享按鈕 ➔ 選擇『加入主畫面』」。 |
| 11 | R3 離線寫入 | 照護員在地下室或病床邊離線斷網，提交日常照護記錄或給藥記錄 | 表單無阻斷正常送出，資料寫入 Dexie IndexedDB 並標記 `syncStatus: 'pending'`，排入 `SyncQueue`，頂列提示「離線排隊中 (1 筆待同步)」。 |
| 12 | R3 網路復原 | 照護員走出地下室連上機構 Wi-Fi (`online` 事件觸發) | Service Worker 與 `syncEngine` 自動被觸發，批次上傳 `SyncQueue` 待同步項目，成功後將狀態更新為 `synced`，若有衝突彈出「關鍵衝突確認」視窗。 |
| 13 | R3 版本更新 | 照護員正在編輯表單時，Service Worker 偵測到伺服器有新版本發布 | 系統嚴禁強制自動重整網頁導致表單內容遺失！應顯示非阻斷式 Toast「有新版本可用」，待使用者完成儲存或主動點擊按鈕才執行更新 reload。 |
| 14 | R3 Kiosk 模式 | Kiosk 模式下照護員不小心按下鍵盤 `Esc` 或瀏覽器返回鍵 | 監聽 `fullscreenchange` 事件並重新請求全螢幕，`beforeunload` 彈出原生確認對話框阻止離開系統。 |
| 15 | R3 快速切換 | 平板切換至另一位照護員帳號，前一位照護員尚有未儲存的草稿 | 切換前自動將當前表單暫存至 IndexedDB `draft:careRecord:{residentId}`，新使用者登入後不會看到前一人的未提交暫存，原使用者切回時可復原。 |
| 16 | AC5 效能渲染 | 稽核軌跡累積超過 5,000 筆歷史異動 | 列表嚴格採用 20 筆/頁分頁機制與索引查詢，禁止一次請求全部陣列，確保初始 DOM 節點數量 < 500 個，保持滾動 60fps。 |

---

## 5. Caveats

1. **UI 與資料抓取技術棧差異 (Ant Design / RTK Query vs Tailwind / TanStack Query)**：
   - 原始需求單 (`ORIGINAL_REQUEST.md`) 提及「使用現有的 UI 框架（如 Ant Design）與資料抓取層（RTK Query）」。
   - 但實際程式碼庫自建構以來一直基於 `Tailwind CSS` + `@tanstack/react-query` + `axios` + `dexie`，且各業務頁面已高度模組化整合。若在此階段引入 `@reduxjs/toolkit` 或 `antd`，將導致巨幅的相依套件肥大 (Bundle Size 飆升)，直接違反 AC5 (< 2 秒載入時間、Lighthouse ≥ 90)，並破壞現有的 `OfflineRepository` 架構。本報告以滿足全部功能與視覺體驗為前提，建議沿用現有深模組架構。
2. **測試框架差異 (Jest / Cypress vs Vitest / Playwright)**：
   - 原始需求單提及「Jest + React Testing Library 與 Cypress」。
   - 專案現有配置為 Vite 官方推薦的 `vitest` 與 `playwright`，並已具備 22 個測試檔與 E2E 離線測試腳本。兩者在 API 上高度相容，但執行速度與現代 Vite 整合度以 Vitest 顯著佔優。後續驗證與實作應以現有 Vitest + Playwright 為基準擴充。
3. **PWA 圖示實體檔案缺失**：
   - 目前 `apps/web/public` 目錄尚未放置 `pwa-192x192.png`, `pwa-512x512.png`, `favicon.ico`, `favicon.svg` 等圖示，這會導致真實環境或 Lighthouse 檢測時 PWA Manifest 驗證報錯，後續必須補齊靜態資產。

---

## 6. Conclusion

1. **R1 報表前端**：核心在於由目前的空白卡片頁面升級為完整的 4 大儀表板（每日完成度、住民概覽、異常警示、稽核軌跡）與 1 個統一 PDF 匯出入口，並於 MSW Mock 補齊 5 個報表端點 (`/daily-completion`, `/resident-summary`, `/alerts`, `/audit-trail`, `/pdf`)。
2. **R2 系統管理前端**：核心在於建立嚴格受 RBAC 保護的 `/admin/*` 頁面（非 admin 訪問回傳 403），實現完整的使用者管理表格 (CRUD、角色切換、狀態開關)、系統健康狀態儀表板、功能旗標開關、系統參數設定表單，並在 Axios 注入 CSRF Token 與開發環境失敗模擬。
3. **R3 PWA 完善**：核心在於補齊圖示實體檔案、實作 `beforeinstallprompt` 自訂安裝按鈕、iOS Safari 指引、離線就緒綠點指示、Kiosk 模式全螢幕與 Wake Lock、SW 平滑更新提示，以及離線優先快取降級。
4. **AC1-AC5 驗收保證**：所有功能具備完整型別定義與 MSW 模擬資料，單元/整合測試由 Vitest 擴充覆蓋，E2E 由 Playwright 模擬離線與安裝流程，確保效能與資安合規。

---

## 7. Verification Method

### 7.1 驗證指令與步驟

1. **單元與整合測試驗證**：
   ```bash
   # 於專案根目錄執行全部測試套件
   npm test
   
   # 針對前端頁面進行測試
   npm test --workspace=apps/web
   ```
   *預期結果*：現有 23 個測試檔 (127 個測試) 通過，且新增的報表與系統管理測試均全數綠燈。

2. **生產打包與 TypeScript 檢查**：
   ```bash
   npm run build
   ```
   *預期結果*：TypeScript 檢查無錯誤 (`tsc --noEmit`)，Vite 順利打包產出 `dist/`，Workbox Service Worker 生成完成且無打包警告。

3. **PWA 靜態資產檢查**：
   ```bash
   ls -la apps/web/public/
   ```
   *檢查要點*：確認 `manifest.webmanifest`, `pwa-192x192.png`, `pwa-512x512.png`, `mockServiceWorker.js`, `sw-sync.js` 均存在。

4. **安全驗證檢查 (AC4)**：
   - 檢查 `apps/web/src/hooks/useRequireRole.tsx` 與 `apps/web/src/App.tsx`：以 `caregiver` 登入時點擊或導航至 `/admin`，應被導向 `/403` 頁面。
   - 檢查 `apps/web/src/api/apiClient.ts`：發出 POST/PATCH 請求時，Network 面板請求標頭包含 `X-CSRF-Token`。
   - 啟用模擬失敗時，API 請求應收到 403 並顯示錯誤提示。

### 7.2 結論失效條件 (Invalidation Conditions)
- 若利害關係人強烈要求必須將底層 Vite 替換為 CRA / Webpack + Jest + Cypress，且必須替換現有 Tailwind/TanStack Query 為 Ant Design/RTK Query，則現有架構結論與程式碼資產需全面重構。
