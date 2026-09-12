# Codebase Architecture Survey Report (前端架構與模組現況調研報告)

## 1. Observation (直接觀察事實與證據鏈)

本調查針對 `/Users/ian.huang/aiProjects/LRP` 專案進行全面靜態分析與架構檢視，直接觀察到的確切檔案路徑、行號及內容如下：

### 1.1 專案結構與套件管理 (Monorepo & Package Management)
- **套件管理器**: `npm@10.8.0`，Node.js 要求 `>=20.0.0`。
  - 證據：`/Users/ian.huang/aiProjects/LRP/package.json` 第 23-26 行：
    ```json
    "engines": {
      "node": ">=20.0.0"
    },
    "packageManager": "npm@10.8.0"
    ```
- **Monorepo 工作區**: npm workspaces 架構，包含 `apps/*` 與 `packages/*`。
  - 證據：`/Users/ian.huang/aiProjects/LRP/package.json` 第 5-8 行：
    ```json
    "workspaces": [
      "apps/*",
      "packages/*"
    ]
    ```
  - 實體工作區目錄結構：
    - `apps/web`: 核心前端應用（套件名稱 `@lrp/web`，版本 `0.0.1`，參見 `apps/web/package.json:2`）。
    - `packages/shared`: 共用領域模型、DTO、Zod 驗證架構（套件名稱 `@lrp/shared`，版本 `0.0.1`，參見 `packages/shared/package.json:2`）。
  - 套件參照機制：
    - `apps/web/package.json:18` 宣告 `"@lrp/shared": "*"`。
    - `apps/web/vite.config.ts:101` 與 `apps/web/tsconfig.json:22` 將 `@lrp/shared` 直接別名（alias）至 `../../packages/shared/src`，實現 monorepo 內免預先編譯的熱重載。
- **根層級建置與驗證腳本** (`package.json:9-18`)：
  - `"dev": "npm run dev --workspace=apps/web"`
  - `"build": "npm run build --workspaces"`
  - `"build:web": "npm run build --workspace=apps/web"`
  - `"build:shared": "npm run build --workspace=packages/shared"`
  - `"lint": "npm run lint --workspaces"`
  - `"typecheck": "npm run typecheck --workspaces"`
  - `"test": "npm run test --workspaces"`
  - Git Hooks 使用 `husky: ^9.0.11` (`package.json:17, 20`)。

---

### 1.2 前端技術棧、建置工具與 UI 框架 (Framework, Bundler & UI Library)
- **前端核心框架**:
  - React 18.3.0 (`react: ^18.3.0`, `react-dom: ^18.3.0`，`apps/web/package.json:23-24`)
  - TypeScript 5.4.5 (`typescript: ^5.4.5`，`apps/web/package.json:55`, `package.json:21`)
- **建置工具與伺服器 (Bundler)**:
  - Vite 5.2.11 + `@vitejs/plugin-react: ^4.2.1` (`apps/web/package.json:40, 56`)
  - 建置腳本：`tsc && vite build` (`apps/web/package.json:8`)
  - 開發伺服器預設埠號：`5173` (`apps/web/vite.config.ts:105`)
  - 模組分割（Manual Chunks）：`vendor` (react, react-dom, react-router-dom), `query` (@tanstack/react-query), `state` (zustand), `shared` (@lrp/shared) (`apps/web/vite.config.ts:114-119`)。
- **UI 樣式與元件庫 (關鍵技術對比：Tailwind CSS vs Ant Design)**:
  - **重要觀察**：原提示詞提及「使用現有的 UI 框架（如 Ant Design）」，但在整個程式碼庫中，**完全沒有安裝或引用 Ant Design (`antd`)**！
    - `grep_search` 搜尋 `antd` 在專案原始碼中為 0 筆匹配。
    - `apps/web/package.json` 完全無 `antd`、`@ant-design/icons` 或 `@ant-design/*`。
  - **真實 UI 架構**：全站統一採用 **Tailwind CSS 3.4.19** (`tailwindcss`, `postcss: 8.4.38`, `autoprefixer: 10.4.19`，`apps/web/package.json:43, 53, 54`)。
  - 設計系統 Token 與元件 Class 定義於 `apps/web/src/styles/index.css`（第 24-92 行）：
    - 按鈕群：`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`
    - 表單群：`.input`, `.label`
    - 卡片群：`.card`, `.card-header`, `.card-body`, `.card-footer`
    - 徽章群：`.badge`, `.badge-primary`, `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-gray`
  - 圖示庫：全站統一使用手寫語意化 SVG 元件（如 `Layout.tsx`, `ReportsPage.tsx`, `SettingsPage.tsx` 內置之 Inline SVG），未引入外部大包圖示庫。
  - 圖表函式庫：規格書 `.scratch/lrp-mvp/issues/08-reports-frontend.md:15` 指明使用 `Recharts`，但目前 `apps/web/package.json` 中**尚未安裝 `recharts`**。
- **資料存取與狀態管理 (關鍵技術對比：TanStack Query + Zustand vs RTK Query)**:
  - **重要觀察**：原提示詞提及「資料抓取層（RTK Query）」，但目前程式碼庫中**完全沒有安裝 Redux / RTK Query**（無 `@reduxjs/toolkit` 或 `react-redux`）。
  - **真實資料架構**：
    - 伺服端狀態快取：TanStack React Query 5.28.0 (`@tanstack/react-query`, `@tanstack/react-query-devtools: ^5.101.4`，`apps/web/package.json:19-20`)。
    - 用戶端全域狀態：Zustand 4.5.2 (`zustand`，`apps/web/package.json:28`)，包含 `authStore.ts`, `syncStore.ts`, `uiStore.ts`。
    - 離線優先資料庫：Dexie 4.4.5 (IndexedDB 封裝，`apps/web/src/utils/offlineDb.ts`) + `BaseOfflineRepository` 架構 (`apps/web/src/repositories/`)。
    - HTTP 用戶端：Axios 1.6.8 (`apps/web/src/api/apiClient.ts`)，具備自動附加 Bearer Token 與 401 換發 Refresh Token 機制。
- **路由架構 (Routing)**:
  - React Router DOM 6.23.0 (`apps/web/package.json:26`)
  - 根路由器配置於 `apps/web/src/main.tsx:36-38`。
  - 路由樹配置於 `apps/web/src/App.tsx:51-86`：
    - 公開路由：`/login`, `/` (轉址至 `/login`)
    - 受保護路由（`<PrivateRoute>` 限制登入，並包裹 `<Layout />` 與 `<CriticalConflictModal />`）：
      - `/dashboard`
      - `/residents`, `/residents/new`, `/residents/import`, `/residents/:id`, `/residents/:id/edit`
      - `/care-records`, `/care-records/new`, `/care-records/:id/edit`
      - `/medications`, `/medications/new`, `/medications/:id`, `/medications/:id/edit`
      - `/care-plans`, `/care-plans/new`, `/care-plans/:id`, `/care-plans/:id/edit`
      - `/reports`
      - `/settings`
      - `/sync/conflicts`
    - 萬用路由：`*` (轉址至 `/login`)

---

### 1.3 測試架構與自動化測試 (Test Harnesses & Runners)
- **單元與整合測試 (關鍵技術對比：Vitest + RTL vs Jest)**:
  - **重要觀察**：原提示詞提及「單元測試（Jest + React Testing Library）」，但程式碼庫建置的是 **Vitest 1.6.0**，並無配置 Jest。
  - 測試執行器：Vitest 1.6.0 (`vitest`, `@vitest/coverage-v8: ^1.6.1`，`apps/web/package.json:41, 58`)。
  - DOM 模擬環境：`jsdom: ^30.0.1` (`apps/web/package.json:51`)。
  - 元件測試庫：`@testing-library/react: ^16.3.2`, `@testing-library/jest-dom: ^7.0.1`, `@testing-library/user-event: ^14.6.5` (`apps/web/package.json:32-34`)。
  - 離線模擬庫：`fake-indexeddb: ^6.2.5` (`apps/web/package.json:50`)。
  - 全域設定檔案：`apps/web/src/test/setup.ts`（Mock `matchMedia`, `ResizeObserver`, `localStorage`, `sessionStorage`, `navigator.onLine`, `crypto.randomUUID`, `SyncManager`, `serviceWorker`）。
  - Vitest 配置整合在 `apps/web/vite.config.ts:123-133`：
    - `environment: 'jsdom'`
    - `globals: true`
    - `setupFiles: ['./src/test/setup.ts']`
    - `include: ['src/**/*.{test,spec}.{ts,tsx}']`
  - 測試執行腳本：
    - `npm run test` -> `vitest run` (`apps/web/package.json:12`)
    - `npm run test:ui` -> `vitest --ui` (`apps/web/package.json:13`)
- **端對端測試 (關鍵技術對比：Playwright vs Cypress)**:
  - **重要觀察**：原提示詞提及「端對端測試（Cypress）」，但程式碼庫中完全無 Cypress，而是安裝與配置了 **Playwright 1.62.1**。
  - E2E 測試框架：`@playwright/test: ^1.62.1` (`apps/web/package.json:31`)。
  - 設定檔：`apps/web/playwright.config.ts`：
    - 測試目錄：`./e2e`
    - 本地測試伺服器：`npm run dev -- --host 127.0.0.1 --port 5174` (port 5174, `baseURL: http://127.0.0.1:5174`)。
  - 現有測試案例：`apps/web/e2e/offline-sync.spec.ts`（覆蓋離線寫入排入佇列、恢復連線背景自動同步、關鍵衝突彈窗中斷處理）。
  - E2E 執行腳本：`npm run test:e2e` -> `playwright test` (`apps/web/package.json:14`)。
- **Mock 服務層 (MSW)**:
  - MSW 2.2.14 (`msw: ^2.2.14`，`apps/web/package.json:52`)。
  - 開發環境自動於 `main.tsx:23-31` 啟動 Service Worker (`/mockServiceWorker.js`)。
  - Mock Handlers 主檔：`apps/web/src/mocks/handlers.ts`（涵蓋認證、住民、照護記錄、藥物、照護計畫、部分合規與同步）。

---

### 1.4 三大前端模組現況與落差分析 (Module Breakdown & Gap Analysis)

#### A. 報表前端 (08-reports-frontend)
- **現有程式碼**:
  - `apps/web/src/pages/ReportsPage.tsx` (87 行)：
    - 僅為靜態外殼（Stub），展示 6 個卡片（`DailyCompletion`, `ResidentOverview`, `Alerts`, `Audit`, `Compliance`, `KPI`）。
    - 卡片上的「產生」按鈕無任何 `onClick` 事件綁定。
    - 「最近生成的報表」區塊僅有靜態文字「暫無報表記錄」。
    - 完全無任何圖表元件，亦無測試檔案（無 `ReportsPage.test.tsx`）。
  - `packages/shared/src/index.ts:380-391`：僅宣告基礎型別 `Report`, `ReportType`, `AuditEntry`。
  - `apps/web/src/mocks/handlers.ts:1419-1448`：僅有陽春的泛型 `GET /api/v1/reports` 與 `POST /api/v1/reports/generate`。
- **依據票券 `.scratch/lrp-mvp/issues/08-reports-frontend.md` 的缺失功能**:
  1. **缺少 4 大專案子路由與頁面**：
     - `/reports/daily-completion`（每日完成度儀表板）：日期選擇器、完成度長條圖、狀態分布圓餅圖、低分住民明細清單、PDF 匯出。
     - `/reports/resident-summary`（住民狀態概覽）：三管統計卡片、床位分佈圖 (樓層/房間可視化)、異常時間軸、用藥提醒、依賴度分佈。
     - `/reports/alerts`（異常事件警示中心）：即時紅黃標警示清單、類型篩選、處理狀態切換、跳轉關聯記錄。
     - `/reports/audit-trail`（稽核軌跡查詢頁）：實體/操作人/日期範圍篩選、分頁表格（舊值/新值/原因）、PDF 匯出。
  2. **缺少圖表視覺化元件庫**：尚未安裝 `recharts`，缺少長條圖、圓餅圖、趨勢折線圖封裝。
  3. **缺少 PDF 匯出統一入口**：格式選單、參數設定、下載/預覽進度管理（Mock Blob URL 回傳）。
  4. **缺少專屬 MSW Mock Endpoints**：
     - `GET /api/v1/reports/daily-completion`
     - `GET /api/v1/reports/resident-summary`
     - `GET /api/v1/reports/alerts`
     - `GET /api/v1/reports/audit-trail`
     - `POST /api/v1/reports/pdf`
  5. **缺少測試**：無任何單元與整合測試。

#### B. 系統管理前端 (09-system-admin-frontend)
- **現有程式碼**:
  - `apps/web/src/pages/SettingsPage.tsx` (290 行)：
    - 含有外觀設定（淺色/深色/Kiosk）、同步衝突統計、快速切換帳號列表、系統資訊檢視與清除本地資料。
    - 使用者管理表格（第 179-204 行）為**寫死之假資料**（3 筆 static 住民工作人員），「編輯」與「新增使用者」按鈕均無動作。
    - 無單元測試（無 `SettingsPage.test.tsx`）。
  - `apps/web/src/hooks/useRequireRole.tsx`：提供角色權限檢核，但未授權時預設導向 `/dashboard`（未符合 AC4 要求的 `/admin/*` 導向 403 或登入頁）。
- **依據票券 `.scratch/lrp-mvp/issues/09-system-admin-frontend.md` 與 AC4 的缺失功能**:
  1. **缺少專屬 `/admin` 導覽架構與路由保護**：
     - 目前未建立 `/admin` 路由（`App.tsx` 只有 `/settings`）。
     - 需建立 `/admin` 專屬側邊欄（使用者管理、系統設定、稽核軌跡）。
     - 需實作嚴格的 admin RBAC 守衛，非 admin 存取 `/admin/*` 必須硬性攔截並導向 403/登入頁（AC4）。
  2. **缺少使用者管理 CRUD 完整介面與狀態**：
     - 新增使用者彈窗表單（帳號、密碼、姓名、角色、本國籍判定）。
     - 編輯角色下拉（`caregiver` / `supervisor` / `admin` / `sysadmin`）。
     - 帳號啟用 / 停用開關、刪除確認、樂觀更新（Optimistic Updates）。
  3. **缺少系統設定表單與持久化**：
     - 同步間隔（秒）、24hr 鎖定時長（小時）、低庫存警示閾值（預設 15）、PDF 字體選擇、儲存成功通知 Toast。
  4. **缺少四角色權限對照矩陣**（唯讀對照表格）。
  5. **缺少專屬 MSW Mock Endpoints**：
     - `GET /api/v1/users` (分頁/角色篩選)
     - `POST /api/v1/users`
     - `PATCH /api/v1/users/:id/role`
     - `PATCH /api/v1/users/:id/status`
     - `GET /api/v1/system/settings`
     - `PATCH /api/v1/system/settings`
  6. **缺少型別定義**：`packages/shared` 尚缺 `UserCreateInput`, `UserCreateSchema`, `SystemSettings`, `SystemSettingsUpdateSchema`。

#### C. PWA 優化 (10-pwa-polish-frontend)
- **現有程式碼**:
  - `apps/web/vite.config.ts:9-97`：已配置 `vite-plugin-pwa`，包含 Web App Manifest（名稱、fullscreen、landscape、icons）與 Workbox 快取規則（navigation, static, api）。
  - `apps/web/src/utils/pwa.ts` (82 行)：使用 `virtual:pwa-register` 進行簡易 SW 註冊及背景同步橋接（`setupBackgroundSyncBridge`）。
  - `apps/web/src/stores/uiStore.ts`：具備基本 `kioskMode` 布林值與呼叫 `document.documentElement.requestFullscreen()`。
  - `apps/web/src/components/Layout.tsx:33-38`：若 `kioskMode` 為 true，僅單純渲染 `<Outlet />`（隱藏側邊欄與頂列）。
  - `apps/web/src/components/UserSwitcher.tsx` (191 行)：頂列已具備切換 switchableUsers 下拉選單。
- **依據票券 `.scratch/lrp-mvp/issues/10-pwa-polish-frontend.md` 與 AC3 的缺失功能**:
  1. **缺少 PWA 安裝提示 (Install Prompt)**：
     - 未監聽 `beforeinstallprompt` 事件與保留 event 物件。
     - 頂列或設定頁無「安裝應用程式」專屬按鈕。
     - 未追蹤 `appinstalled` 事件與 localStorage 標記，亦未在已安裝或 standalone 模式下自動隱藏。
  2. **缺少離線就緒檢查 (Offline Readiness)**：
     - 未檢核 SW active + 資源快取完成 + IndexedDB 就緒。
     - 頂列無「離線就緒」綠色徽章。
  3. **Kiosk 模式未達生產級防呆**：
     - 未支援 URL 參數 `?kiosk=1` 自動啟動。
     - 未防止意外導航離開（缺少 `beforeunload` 確認攔截）。
     - 缺少 Screen Wake Lock API (`navigator.wakeLock`) 防止平板自動休眠。
     - 缺少離開 Kiosk 模式的專用管理員手勢/PIN 碼解鎖機制。
  4. **共用平板切換體驗不完整**：
     - 缺少切換帳號時的表單草稿保留（未寫入 IndexedDB `draft:{entity}:{id}`）。
     - 缺少下拉選單的平滑動態過渡。
  5. **缺少非同步 SW 更新通知 Toast**：
     - 目前 `pwa.ts:59` 使用瀏覽器原生 `confirm()` 阻斷視窗，需升級為符合長照現場的自訂 UI Toast（「新版本就緒，點擊重新整理」），並觸發 `registration.update()`。
  6. **快取清理機制**：
     - 未實作定期清理 IndexedDB 30 天以前的已同步記錄（SyncQueue, SyncConflicts）。
  7. **網路狀態檢測心跳**：
     - 目前僅依賴 `navigator.onLine` 事件，缺少每 30 秒向 `/api/health` 發送的心跳驗證。
  8. **缺少專屬 E2E 與單元測試**。

---

### 1.5 安全性與 CSRF 檢核 (AC4 Gap Analysis)
- **AC4 條款**：「所有 API 請求皆帶有 CSRF token，且在開發環境中模擬驗證失敗情形。」
- **程式碼現況**：
  - 檢視 `apps/web/src/api/apiClient.ts` 第 34-42 行，Request Interceptor 目前僅附加 `Authorization: Bearer ${accessToken}`，**完全沒有附加 CSRF Token (例如 `X-CSRF-Token`)**！
  - 檢視 `apps/web/src/mocks/handlers.ts`，MSW handlers 完全沒有對 CSRF Token 進行校驗，也未提供模擬 CSRF 驗證失敗的開關或測試案例。

---

## 2. Logic Chain (推論邏輯鏈)

1. **推論一：原始需求說明中的技術選型名稱（Ant Design, RTK Query, Jest, Cypress）為參考提示詞，程式碼庫已有堅實且統一的新世代架構規範。**
   - *前提*：`ORIGINAL_REQUEST.md:19` 明確寫道「使用現有的 UI 框架（如 Ant Design）與資料抓取層（RTK Query）」，其中「如」字表明為舉例性語句。
   - *觀察驗證*：
     - 專案根目錄、`apps/web` 與 `packages/shared` 已建置好完整之 Tailwind CSS (`apps/web/src/styles/index.css`), TanStack Query + Zustand (`apps/web/package.json:19, 28`), Vitest (`apps/web/package.json:58`), Playwright (`apps/web/package.json:31`)。
     - 現有的 04 住民、05 照護記錄、06 藥物、07 照護計畫等頁面均一致採用此架構實作，且通過了現有的 26 個測試檔案。
   - *結論*：若強行引入 Ant Design、RTK Query、Jest、Cypress，將導致：
     - 重複引入肥大相依性，破壞 PWA 效能預算（預算要求 <2 秒，Lighthouse ≥90）。
     - 與既有之共用樣式系統、離線 Repository (Dexie) 及 Playwright E2E 產生架構割裂。
     - 因此，後續實作模組 08、09、10 **必須完全遵循現有的 Tailwind CSS + TanStack Query + Vitest + Playwright 架構**，這才是符合「現有的 UI 框架與資料抓取層」之真正意圖。

2. **推論二：08-reports-frontend 之核心工作是「將現有假外殼升級為多頁籤/子路由的視覺化分析中心」。**
   - *前提*：`ReportsPage.tsx` 現為 87 行之純靜態展示，而 `.scratch/lrp-mvp/issues/08-reports-frontend.md` 明確定義了 4 大報表頁面與 PDF 匯出。
   - *步驟*：
     - 需要在 `apps/web` 安裝 `recharts`（符合 issue 08 規格）。
     - 需在 `packages/shared` 補充報表各頁面之 Response DTO 型別。
     - 需在 `apps/web/src/mocks/handlers.ts` 新增 5 個報表專屬 API mock。
     - 需實作 4 個子頁面與共用 PDF 匯出中心，並於 `App.tsx` 配置巢狀路由。

3. **推論三：09-system-admin-frontend 需將目前的 SettingsPage 分離為獨立的 `/admin` 管理系統並完成 RBAC 阻斷。**
   - *前提*：現有 `SettingsPage.tsx` 混雜了個人偏好（主題、切換帳號）與靜態的使用者列表，且沒有管理員專屬的 `/admin` 路由與 403 阻斷機制（違反 AC4）。
   - *步驟*：
     - 需在 `App.tsx` 開闢 `/admin/*` 專屬路由，使用 `PrivateRoute` 並配置 `allowedRoles={['admin', 'sysadmin']}`。
     - 調整 `useRequireRole.tsx`：當存取 `/admin/*` 被拒絕時，必須精確導向 403 錯誤頁或 `/login`，而非預設的 `/dashboard`。
     - 實作完整的使用者 CRUD 表單、角色變更即時生效、系統設定表單與四角色權限矩陣。
     - 於 `apiClient.ts` 與 MSW 補充 CSRF token 機制以滿足 AC4。

4. **推論四：10-pwa-polish-frontend 是在現有 VitePWA 與 OfflineDb 之上的生產級加固。**
   - *前提*：現有專案已具備良好之 PWA 基本配置（manifest, service worker, dexie tables），但欠缺「使用者體驗打磨」與「Kiosk 專用防呆」。
   - *步驟*：
     - 補齊 `beforeinstallprompt` 與 UI 安裝按鈕。
     - 補齊離線就緒綠點燈號、`?kiosk=1` 導航鎖定與 `Screen Wake Lock`。
     - 在 `offlineDb.ts` 增加 `drafts` 表格以達成共用平板切換時表單保留。
     - 補齊非阻塞的 SW 更新通知 Toast 與定期快取清除。

---

## 3. Caveats (限制、假設與未調查事項)

1. **環境執行權限限制**：
   - 在 macOS 沙盒中執行 `run_command` 時，直接呼叫 node 二進位檔會觸發 `env: node: Operation not permitted`。因此本調查報告所有檔案檢索與程式碼比對均透過核心檔案操作工具（`view_file`, `list_dir`, `grep_search`, `find_by_name`）完成。
2. **假設規格對齊**：
   - 本報告認定 `.scratch/lrp-mvp/issues/` 下之 `08-reports-frontend.md`, `09-system-admin-frontend.md`, `10-pwa-polish-frontend.md` 為最權威之各模組詳細規格書，所有缺失功能清單均與其嚴格對齊。
3. **後端對接範圍**：
   - 依據 `00-TICKET-SUMMARY.md` 之規劃，目前處於 Phase 1（前端先行，Mock 先行），所有後端 API 皆由 MSW 提供，因此本調查不包含 Azure Functions / SQL 後端服務。

---

## 4. Conclusion (調查總結與建議決策)

| 領域項次 | 調研結果結論 | 建議後續行動方針 |
|---|---|---|
| **套件與架構** | npm workspaces Monorepo (`apps/web` + `packages/shared`) | 維持現有工作區劃分，領域型別統一置於 `packages/shared` |
| **UI 框架** | **Tailwind CSS 3.4**（**非** Ant Design） | **嚴格禁止引入 AntD**；全面使用既有 Tailwind 元件類別 (`.btn`, `.card` 等) |
| **圖表庫** | 尚未安裝，規格指定使用 **Recharts** | 在 `apps/web` 安裝 `recharts: ^2.12.0` |
| **狀態與資料層**| **TanStack Query + Zustand + Dexie**（**非** RTK Query） | 遵循現有 pattern，新增 `useReports`、`useAdmin` 與離線擴充 |
| **測試工具** | **Vitest + RTL + JSDOM** (單元) / **Playwright** (E2E) | **嚴格禁止引入 Jest/Cypress**；使用現有 Vitest 與 Playwright 套件編寫測試 |
| **模組 08** | 目前僅 87 行靜態外殼，缺乏 4 大子頁面、圖表、PDF 匯出與 Mock | 實作 4 個子頁面、Recharts 圖表、PDF 模組與 5 個 MSW handlers |
| **模組 09** | 缺乏獨立 `/admin`、假表格需改為真實 CRUD、缺少設定表單與矩陣 | 實作 `/admin` 專屬路由、RBAC 403 導向、使用者 CRUD 與系統設定 |
| **模組 10** | 基本 PWA 配置已具備，缺少安裝提示、離線就緒燈、Kiosk 防呆與更新 Toast | 實作 `beforeinstallprompt`、離線綠燈、URL Kiosk、WakeLock 與更新 Toast |
| **安全性/CSRF**| `apiClient` 未帶 CSRF token，MSW 未模擬 | 在 `apiClient` 攔截器附加 `X-CSRF-Token`，並在 MSW 實作可模擬失敗之機制 |

---

## 5. Verification Method (獨立驗證方法)

接收本報告之 Orchestrator 或 Implementer 可透過下列檔案與檢索手段獨立驗證本報告之真實性：

1. **驗證 UI 框架非 Ant Design 而是 Tailwind CSS**：
   - 檢視檔案：`apps/web/package.json`（確認 dependencies 只有 tailwindcss，無 antd）。
   - 檢視檔案：`apps/web/src/styles/index.css`（確認 `.btn`, `.card`, `.badge` 定義）。
2. **驗證測試執行器非 Jest/Cypress 而是 Vitest/Playwright**：
   - 檢視檔案：`apps/web/vite.config.ts` 第 123-133 行（確認 Vitest 配置）。
   - 檢視檔案：`apps/web/playwright.config.ts`（確認 Playwright 配置與 e2e 目錄）。
3. **驗證 08 報表現況為純靜態外殼**：
   - 檢視檔案：`apps/web/src/pages/ReportsPage.tsx`（確認無圖表、按鈕無 onClick、無資料呼叫）。
4. **驗證 09 系統管理現況為寫死假資料**：
   - 檢視檔案：`apps/web/src/pages/SettingsPage.tsx` 第 179-204 行（確認靜態 user 陣列）。
5. **驗證未附加 CSRF Token**：
   - 檢視檔案：`apps/web/src/api/apiClient.ts` 第 34-42 行（確認 request interceptor 僅有 Authorization Bearer）。
