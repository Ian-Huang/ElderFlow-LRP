# Project: LRP Frontend Subsystems (08-reports, 09-system-admin, 10-pwa-polish)

## Architecture
- **Monorepo Structure**: npm workspaces (`apps/web`, `packages/shared`).
- **Frontend Stack**: React 18.3 + TypeScript 5.4 + Vite 5.2 + Tailwind CSS 3.4.
- **State & Data Fetching**: TanStack React Query 5.28 + Zustand 4.5 + Axios 1.68 + Dexie 4.4 (IndexedDB).
- **Charts**: Recharts 2.12 (modular, responsive, tree-shakable, fits AC5 performance budget).
- **Testing**: Vitest 1.6 + React Testing Library + jsdom (Unit & Integration) + Playwright 1.62 (E2E).
- **Mock Service Layer**: Mock Service Worker (MSW 2.2) integrated in development and test environments.
- **Security**: RBAC with role hierarchy (`caregiver` < `supervisor` < `admin` < `sysadmin`), Route Guards with 403 redirect, Axios CSRF interceptor (`X-CSRF-Token`) with simulation toggle.
- **PWA**: `vite-plugin-pwa` with Workbox offline caching, Web App Manifest, Install Prompt controller, Screen Wake Lock API, and Kiosk mode.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | 每日照護完成度儀表板 | 每日照護完成度分數長條圖、狀態圓餅圖、低分名單與日期篩選 | M1 (Reports) | 08-reports-frontend.md |
| F2 | 住民狀態概覽儀表板 | 管路/三管統計卡片、床位分佈圖、異常時間軸、用藥提醒與分佈圖 | M1 (Reports) | 08-reports-frontend.md |
| F3 | 異常事件警示中心 | 即時紅黃標警示清單、類型篩選、處理狀態切換與跳轉關聯記錄 | M1 (Reports) | 08-reports-frontend.md |
| F4 | 稽核軌跡查詢頁 | 實體/操作人/日期範圍篩選、分頁表格（舊值/新值/原因對比）、PDF 匯出 | M1 (Reports) | 08-reports-frontend.md, BR007 |
| F5 | PDF 統一匯出引擎 | 4 種報表類型匯出、參數設定、下載/預覽進度管理 (Blob URL) | M1 (Reports) | 08-reports-frontend.md |
| F6 | 使用者管理清單與過濾 | 帳號、姓名、角色、狀態分頁檢視與多條件搜尋過濾 | M2 (Admin) | 09-system-admin-frontend.md |
| F7 | 使用者建立與帳號指派 | Admin 彈窗建立新使用者 (帳號、密碼、姓名、角色、本國籍判定) | M2 (Admin) | 09-system-admin-frontend.md |
| F8 | 使用者角色與狀態切換 | 行內角色下拉變更、啟用/停用切換、防止停用最後 sysadmin、樂觀更新 | M2 (Admin) | 09-system-admin-frontend.md |
| F9 | 系統健康狀態監控 | API/DB/SW/IndexedDB 狀態監測，CPU/記憶體/延遲/Uptime 指標 | M2 (Admin) | ORIGINAL_REQUEST R2 |
| F10 | 功能旗標管理中心 | 模組啟用開關、灰度發布百分比 (0-100%) 與環境標籤管理 | M2 (Admin) | ORIGINAL_REQUEST R2 |
| F11 | 系統核心參數設定表單 | 同步間隔、24hr 記錄鎖定時長、低庫存警示閾值、PDF 字體持久化表單 | M2 (Admin) | 09-system-admin-frontend.md |
| F12 | 角色權限矩陣展示 | 唯讀對照表清楚呈現 4 種角色在各模組的功能存取權限 | M2 (Admin) | 09-system-admin-frontend.md |
| F13 | `/admin/*` 路由保護與 403 導向 | 非 admin 用戶訪問 `/admin/*` 被強制導向 `/403` 專屬拒絕頁 (AC4) | M2 (Admin) | ORIGINAL_REQUEST AC4 |
| F14 | CSRF Token 自動注入與模擬失敗 | Axios 攔截器自動附帶 `X-CSRF-Token`，MSW 驗證並支援開發環境模擬失敗 | M2 (Admin) | ORIGINAL_REQUEST AC4 |
| F15 | PWA 安裝提示 ("Add to Home Screen") | 捕捉 `beforeinstallprompt`，頂列/設定頁自訂安裝按鈕，iOS Safari 指引 (AC3) | M3 (PWA) | 10-pwa-polish-frontend.md, AC3 |
| F16 | 離線就緒檢查與狀態指示 | 檢核 SW + 靜態快取 + IndexedDB，頂列顯示「離線就緒」綠點徽章 (AC3) | M3 (PWA) | 10-pwa-polish-frontend.md, AC3 |
| F17 | Service Worker 自動更新與通知 | 偵測新版 SW，非阻塞 Toast 提示更新，點擊 trigger `skipWaiting` 與 reload | M3 (PWA) | 10-pwa-polish-frontend.md |
| F18 | 離線優先快取與過期清理 | 靜態資源 CacheFirst，API NetworkFirst + Dexie 降級，清理 30 天前舊同步記錄 | M3 (PWA) | 10-pwa-polish-frontend.md |
| F19 | 行動端 Kiosk 模式與 Wake Lock | 支援 `?kiosk=1`，鎖定導航，全螢幕鎖定，Screen Wake Lock 防止休眠 | M3 (PWA) | 10-pwa-polish-frontend.md |
| F20 | 共用平板快速切換與草稿暫存 | 最近 5 組帳號切換，保留編輯中表單草稿至 IndexedDB，200ms 動畫 | M3 (PWA) | 10-pwa-polish-frontend.md |
| F21 | 虛擬化與分頁資料載入 | 報表、稽核日誌與使用者表格實作 20 筆/頁分頁，首載 <2s，Lighthouse ≥90 (AC5) | M1, M2 | ORIGINAL_REQUEST AC5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Shared Foundation & Mocks | DTOs in `packages/shared`, MSW handlers for Reports & Admin, CSRF interceptor | none | DONE |
| M1 | Reports Frontend (R1) | F1-F5, F21: 4 Sub-dashboards, Recharts components, PDF export, unit tests | M0 | IN_PROGRESS |
| M2 | System Admin Frontend (R2) | F6-F14, F21: `/admin/*` routes, 403 page, User CRUD, Health, Flags, Settings, RBAC & CSRF | M0 | IN_PROGRESS |
| M3 | PWA Polish Frontend (R3) | F15-F20: Manifest & icons, Install prompt, Offline badge, Kiosk, Wake Lock, Drafts | none | IN_PROGRESS |
| M4 | E2E Testing & Acceptance | Opaque-box E2E test suite (Tiers 1-4), 100% pass, Tier 5 adversarial hardening, AC1-AC5 audit | M1, M2, M3 | PLANNED |

## Interface Contracts

### Shared DTOs (`packages/shared/src/index.ts`)
```ts
// Reports
export interface DailyCompletionReport {
  date: string;
  totalResidents: number;
  completedRecords: number;
  averageCompletionRate: number;
  statusDistribution: { status: string; count: number; percentage: number }[];
  residentScores: { residentId: string; residentName: string; bedNumber: string; completionRate: number }[];
  lowScoreResidents: { residentId: string; residentName: string; bedNumber: string; completionRate: number; missingItems: string[] }[];
}

export interface ResidentSummaryReport {
  totalResidents: number;
  tubeStats: {
    totalWithTubes: number;
    nasogastric: number;
    urinaryCatheter: number;
    tracheostomy: number;
    threePipeCount: number;
  };
  bedOccupancy: { floor: string; room: string; bedNumber: string; residentName?: string; status: 'occupied' | 'vacant' | 'maintenance' }[];
  dependencyDistribution: Record<string, number>;
  alertsSummary: { red: number; yellow: number };
}

export interface AlertReportItem {
  id: string;
  type: 'medication_error' | 'vital_abnormal' | 'fall' | 'missed_care';
  severity: 'red' | 'yellow';
  title: string;
  description: string;
  residentId: string;
  residentName: string;
  bedNumber: string;
  occurredAt: string;
  status: 'open' | 'acknowledged' | 'resolved';
}

export interface PdfExportRequest {
  reportType: 'resident-list' | 'tube-statistics' | 'bed-map' | 'completion-report' | 'audit-trail';
  parameters?: Record<string, any>;
}

// System Admin
export interface UserCreateInput {
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  isLocalStaff: boolean;
}

export interface SystemSettings {
  syncIntervalSeconds: number;
  lockDurationHours: number;
  lowStockThreshold: number;
  pdfFont: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SystemHealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  services: {
    api: { status: 'up' | 'down'; latencyMs: number };
    database: { status: 'up' | 'down'; latencyMs: number };
    serviceWorker: { status: 'active' | 'inactive'; version: string };
    indexedDb: { status: 'connected' | 'error'; sizeEstimateBytes: number };
  };
  metrics: {
    memoryUsageMb: number;
    cpuLoadPercentage: number;
  };
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  environment: 'development' | 'staging' | 'production' | 'all';
}
```

### API Contracts (MSW Handlers in `apps/web/src/mocks/handlers.ts`)
- `GET /api/v1/reports/daily-completion?date=YYYY-MM-DD` -> `ApiResponse<DailyCompletionReport>`
- `GET /api/v1/reports/resident-summary` -> `ApiResponse<ResidentSummaryReport>`
- `GET /api/v1/reports/alerts?severity=red,yellow&status=open` -> `ApiResponse<AlertReportItem[]>`
- `GET /api/v1/reports/audit-trail?page=1&pageSize=20` -> `PaginatedResponse<AuditEntry>`
- `POST /api/v1/reports/pdf` -> Blob (application/pdf)
- `GET /api/v1/users?page=1&pageSize=20&search=&role=` -> `PaginatedResponse<User>`
- `POST /api/v1/users` -> `ApiResponse<User>`
- `PATCH /api/v1/users/:id/role` -> `ApiResponse<User>`
- `PATCH /api/v1/users/:id/status` -> `ApiResponse<User>`
- `GET /api/v1/system/settings` -> `ApiResponse<SystemSettings>`
- `PATCH /api/v1/system/settings` -> `ApiResponse<SystemSettings>`
- `GET /api/v1/system/health` -> `ApiResponse<SystemHealthReport>`
- `GET /api/v1/system/feature-flags` -> `ApiResponse<FeatureFlag[]>`
- `PATCH /api/v1/system/feature-flags/:id` -> `ApiResponse<FeatureFlag>`
- CSRF validation: Any mutating call (`POST`, `PUT`, `PATCH`, `DELETE`) without valid `X-CSRF-Token` or with `X-Simulate-CSRF-Error: true` returns HTTP 403 `{ code: 'CSRF_INVALID', message: 'CSRF 驗證失敗' }`.

## Code Layout
- `packages/shared/src/index.ts`: Common DTOs, Zod schemas, models.
- `apps/web/src/api/apiClient.ts`: Axios instance with CSRF & Bearer token interceptor.
- `apps/web/src/mocks/handlers.ts`: MSW endpoints and seed data for reports, admin, health, flags, CSRF.
- `apps/web/src/pages/reports/`:
  - `ReportsLayout.tsx`: Tab navigation for 4 report sub-views + PDF export button.
  - `DailyCompletionView.tsx`: Daily completion dashboard with Recharts.
  - `ResidentSummaryView.tsx`: Resident overview, 3-pipe stats, bed grid.
  - `AlertsView.tsx`: Anomaly alert monitoring and filter.
  - `AuditTrailView.tsx`: Paginated 5-year audit trail table and export.
  - `PdfExportModal.tsx`: Unified PDF export modal.
- `apps/web/src/pages/admin/`:
  - `AdminLayout.tsx`: Admin dashboard with sidebar navigation (`/admin/users`, `/admin/settings`, `/admin/health`, `/admin/flags`, `/admin/matrix`).
  - `UserManagementView.tsx`: User CRUD table with modals.
  - `SystemSettingsView.tsx`: System parameters form.
  - `SystemHealthView.tsx`: System health dashboard.
  - `FeatureFlagsView.tsx`: Feature flags management.
  - `RoleMatrixView.tsx`: 4-role permissions matrix.
- `apps/web/src/pages/ForbiddenPage.tsx`: Dedicated HTTP 403 page.
- `apps/web/src/components/pwa/`:
  - `PwaInstallPrompt.tsx`: "Add to Home Screen" controller & button.
  - `OfflineReadyBadge.tsx`: Green indicator when SW + Cache + Dexie are ready.
  - `PwaUpdateToast.tsx`: Non-blocking new version notification.
- `apps/web/public/`: Static PWA assets (`favicon.svg`, `pwa-192x192.png`, `pwa-512x512.png`).
- `apps/web/src/test/`: Unit & integration tests for all newly added views and guards.
- `apps/web/e2e/`: Playwright E2E test suites covering user flows, RBAC 403, CSRF error simulation, PWA offline, and installability.
